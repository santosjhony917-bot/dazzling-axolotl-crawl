import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};

const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
const LIMIT = Number(argValue('--limit', '10')) || 10;
const BATCH_SIZE = Math.max(1, Math.min(Number(argValue('--batch-size', '10')) || 10, 50));
const MIN_GALLERY = Math.max(1, Number(argValue('--min-gallery', '3')) || 3);
const MAX_GALLERY = Math.max(MIN_GALLERY, Math.min(Number(argValue('--max-gallery', '8')) || 8, 8));
const VISION_LIMIT = Math.max(0, Math.min(Number(argValue('--vision-limit', '6')) || 6, 12));
const VISION_CONCURRENCY = Math.max(1, Math.min(Number(argValue('--vision-concurrency', '4')) || 4, 8));
const VISION_TIMEOUT_MS = Math.max(5000, Number(argValue('--vision-timeout-ms', '25000')) || 25000);
const DOWNLOAD_TIMEOUT_MS = Math.max(5000, Number(argValue('--download-timeout-ms', '20000')) || 20000);
const ONLY_ID = argValue('--id', '');
const APPLY = hasFlag('--apply');
const FORCE_MEDIA = hasFlag('--force-media');
const RETRY_APIFY = hasFlag('--retry-apify');
const ONLY_MISSING_MEDIA = !hasFlag('--all');
const USE_VISION = !hasFlag('--no-vision');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'apify-instagram-media-enrichment', RUN_ID);

const POSITIVE_FOOD_TERMS = [
  'cardapio', 'cardápio', 'menu', 'combo', 'pizza', 'hamburg', 'burger', 'lanche',
  'sushi', 'temaki', 'pastel', 'esfiha', 'esfira', 'acai', 'açaí', 'sorvete',
  'prato', 'comida', 'jantar', 'almoco', 'almoço', 'delivery', 'pedido',
  'espeto', 'espetinho', 'caldo', 'caldinho', 'cafe', 'café', 'sobremesa',
  'ambiente', 'fachada', 'salão', 'salao', 'mesa', 'cozinha',
];

const NEGATIVE_TERMS = [
  'vaga', 'curriculo', 'currículo', 'contrata', 'sorteio', 'ganhador',
  'parabens', 'parabéns', 'feriado', 'comunicado', 'aviso', 'missa',
  'politica', 'política', 'culto', 'live', 'show', 'evento',
];

function readEnv() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }
  return [];
}

function parseUrl(value) {
  try {
    return new URL(clean(value));
  } catch {
    return null;
  }
}

function instagramUsername(value) {
  const raw = clean(value);
  if (!raw) return '';
  if (!raw.includes('instagram.com') && /^[a-z0-9._]{2,}$/i.test(raw.replace(/^@/, ''))) {
    return raw.replace(/^@/, '').toLowerCase();
  }
  const url = parseUrl(raw);
  if (!url || !url.hostname.toLowerCase().includes('instagram.com')) return '';
  const first = url.pathname.split('/').filter(Boolean)[0] || '';
  if (!first || ['p', 'reel', 'stories', 'explore', 'tv', 'accounts'].includes(first.toLowerCase())) return '';
  return first.toLowerCase();
}

function canonicalInstagram(username) {
  return username ? `https://www.instagram.com/${username}/` : '';
}

function usefulBioLink(profile) {
  const urls = [];
  if (profile.externalUrl) urls.push(profile.externalUrl);
  if (profile.externalUrlShimmed) urls.push(profile.externalUrlShimmed);
  for (const entry of profile.externalUrls || []) {
    if (typeof entry === 'string') urls.push(entry);
    else {
      if (entry?.url) urls.push(entry.url);
      if (entry?.lynx_url) urls.push(entry.lynx_url);
      if (entry?.landingPageUrl) urls.push(entry.landingPageUrl);
    }
  }
  for (const raw of urls) {
    const parsed = parseUrl(raw);
    if (!parsed) continue;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host.includes('instagram.com') || host.includes('facebook.com')) continue;
    if (host.includes('ifood.com')) continue;
    return parsed.toString();
  }
  return '';
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function nationalPhone(value) {
  let digits = onlyDigits(value);
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

function textHasCityEvidence(text, city = CITY, state = STATE) {
  const source = normalize(text);
  const cityNorm = normalize(city);
  const stateNorm = normalize(state);
  return source.includes(cityNorm) || source.includes(`${cityNorm}/${stateNorm}`) || source.includes(`${cityNorm} ${stateNorm}`);
}

function textHasPhoneEvidence(text, phone) {
  const target = nationalPhone(phone);
  if (!target || target.length < 10) return false;
  return onlyDigits(text).includes(target);
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ALIASES = {
  dom: 'sunday',
  domingo: 'sunday',
  sab: 'saturday',
  sabado: 'saturday',
  seg: 'monday',
  segunda: 'monday',
  ter: 'tuesday',
  terca: 'tuesday',
  qua: 'wednesday',
  quarta: 'wednesday',
  qui: 'thursday',
  quinta: 'thursday',
  sex: 'friday',
  sexta: 'friday',
};

function emptyWeek() {
  const day = () => ({ isOpen: false, slots: [] });
  return Object.fromEntries(DAY_ORDER.map((key) => [key, day()]));
}

function dayKey(value) {
  return DAY_ALIASES[normalize(value).replace(/\s+feira\b/g, '').trim()] || '';
}

function hasCanonicalOpeningHours(value) {
  const parsed = parseJson(value, value);
  return parsed
    && typeof parsed === 'object'
    && DAY_ORDER.every((key) => typeof parsed[key]?.isOpen === 'boolean' && Array.isArray(parsed[key]?.slots));
}

function daysBetween(startKey, endKey) {
  const start = DAY_ORDER.indexOf(startKey);
  const end = DAY_ORDER.indexOf(endKey);
  if (start < 0 || end < 0) return [];
  const out = [];
  for (let i = start; ; i = (i + 1) % DAY_ORDER.length) {
    out.push(DAY_ORDER[i]);
    if (i === end) break;
  }
  return out;
}

function normalizeTime(hour, minute = '00') {
  const h = Math.max(0, Math.min(Number(hour) || 0, 23));
  const m = Math.max(0, Math.min(Number(minute) || 0, 59));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeOpeningHoursFromInstagramBio(text) {
  const source = normalize(text)
    .replace(/\baberto\s+de\b/g, 'de')
    .replace(/\baberto\b/g, '')
    .replace(/[|;]/g, ' | ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!source) return null;

  const day = '(dom(?:ingo)?|seg(?:unda)?(?: feira)?|ter(?:ca)?(?: feira)?|qua(?:rta)?(?: feira)?|qui(?:nta)?(?: feira)?|sex(?:ta)?(?: feira)?|sab(?:ado)?)';
  const time = '(\\d{1,2})(?:(?:h|:)(\\d{2}))?\\s*(?:h)?';
  const connector = '(?:a|as|ate|-|–)';
  const rangeRegex = new RegExp(`(?:de\\s+)?${day}\\s*(?:a|ate)\\s*${day}.{0,50}?${time}\\s*${connector}\\s*${time}`, 'i');
  const range = source.match(rangeRegex);
  if (range) {
    const startDay = dayKey(range[1]);
    const endDay = dayKey(range[2]);
    const days = daysBetween(startDay, endDay);
    if (days.length) {
      const schedule = emptyWeek();
      const slot = { start: normalizeTime(range[3], range[4] || '00'), end: normalizeTime(range[5], range[6] || '00') };
      for (const key of days) schedule[key] = { isOpen: true, slots: [slot] };
      return { schedule, sourceText: text, parser: 'instagram_bio_day_range_v1' };
    }
  }

  const schedule = emptyWeek();
  let seen = false;
  const singleRegex = new RegExp(`${day}.{0,35}?${time}\\s*${connector}\\s*${time}`, 'gi');
  for (const match of source.matchAll(singleRegex)) {
    const key = dayKey(match[1]);
    if (!key) continue;
    schedule[key] = {
      isOpen: true,
      slots: [{ start: normalizeTime(match[2], match[3] || '00'), end: normalizeTime(match[4], match[5] || '00') }],
    };
    seen = true;
  }
  return seen ? { schedule, sourceText: text, parser: 'instagram_bio_single_days_v1' } : null;
}

function nameTokens(name) {
  return normalize(name)
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length >= 3)
    .filter((token) => ![
      'restaurante', 'restaurant', 'bar', 'pizzaria', 'pizza', 'burger', 'hamburgueria',
      'lanchonete', 'delivery', 'cabedelo', 'paraiba', 'pb', 'ponta', 'campina',
      'intermares', 'praia', 'food', 'oficial', 'loja', 'unidade',
    ].includes(token));
}

function textHasNameEvidence(text, name) {
  const source = normalize(text);
  const tokens = nameTokens(name);
  if (!tokens.length) return false;
  const matched = tokens.filter((token) => source.includes(token));
  return matched.length >= Math.min(2, tokens.length);
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function scoreProfileMatch(restaurant, profile) {
  const username = normalize(profile.username || '');
  const fullName = normalize(profile.fullName || '');
  const biography = clean(profile.biography || '');
  const external = clean(profile.externalUrl || profile.externalUrlShimmed || '');
  const profileText = [username, fullName, biography, external].join(' ');
  let score = 0;
  const reasons = [];
  if (textHasNameEvidence(profileText, restaurant.name)) {
    score += 35;
    reasons.push('name_tokens');
  }
  if (textHasNameEvidence(profileText, restaurant.google_maps_name || '')) {
    score += 25;
    reasons.push('google_name_tokens');
  }
  if (textHasCityEvidence(profileText, restaurant.city, restaurant.state)) {
    score += 30;
    reasons.push('city');
  }
  if (textHasPhoneEvidence(profileText, restaurant.phone)) {
    score += 35;
    reasons.push('phone');
  }
  const category = normalize(profile.businessCategoryName || profile.categoryName || '');
  if (category.includes('restaurant') || category.includes('food') || category.includes('cafe')) {
    score += 10;
    reasons.push('food_category');
  }
  const knownUsername = instagramUsername(restaurant.instagram);
  if (knownUsername && knownUsername === normalize(profile.username || '')) {
    score += 45;
    reasons.push('same_username');
  }
  return { score, reasons };
}

function candidateCaption(post) {
  return clean(post?.caption || post?.alt || post?.accessibilityCaption || '');
}

function postImageCandidates(profile) {
  const candidates = [];
  for (const [index, post] of (profile.latestPosts || []).entries()) {
    if (post?.displayUrl) {
      candidates.push({
        url: post.displayUrl,
        caption: candidateCaption(post),
        timestamp: post.timestamp || post.takenAtTimestamp || '',
        source: 'latest_post',
        index,
        type: post.type || post.__typename || '',
      });
    }
    for (const [childIndex, child] of (post?.childPosts || []).entries()) {
      if (!child?.displayUrl) continue;
      candidates.push({
        url: child.displayUrl,
        caption: candidateCaption(child) || candidateCaption(post),
        timestamp: post.timestamp || post.takenAtTimestamp || '',
        source: 'child_post',
        index,
        childIndex,
        type: child.type || child.__typename || '',
      });
    }
  }
  const seen = new Set();
  return candidates.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function heuristicImageScore(candidate, restaurant) {
  const caption = normalize(candidate.caption || '');
  let score = 0;
  if (candidate.source === 'latest_post') score += 6;
  if (normalize(candidate.type).includes('image') || normalize(candidate.type).includes('sidecar')) score += 8;
  for (const term of POSITIVE_FOOD_TERMS) {
    if (caption.includes(normalize(term))) score += 4;
  }
  for (const term of NEGATIVE_TERMS) {
    if (caption.includes(normalize(term))) score -= 6;
  }
  if (textHasNameEvidence(caption, restaurant.name)) score += 6;
  if (textHasCityEvidence(caption, restaurant.city, restaurant.state)) score += 5;
  score += Math.max(0, 10 - Number(candidate.index || 0));
  return score;
}

async function visionScoreImages(openai, candidates, restaurant) {
  if (!openai || !candidates.length) return candidates;
  const selected = [];
  async function scoreCandidate(candidate) {
    try {
      const response = await withTimeout(openai.chat.completions.create({
        model: process.env.OPENAI_VISION_MODEL || process.env.VITE_AI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'Classifique imagens para galeria publica de restaurante. Responda somente JSON valido e seja rigoroso.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  `Restaurante: ${restaurant.name}`,
                  `Cidade: ${restaurant.city}/${restaurant.state}`,
                  'A imagem so pode ser aprovada se for foto real boa de comida/produto, fachada ou ambiente do restaurante.',
                  'Rejeite quando houver pessoa em destaque/posando, equipe, selfie, cliente, influencer, print de conversa, cardapio textual, banner/promocao/poster dominante, logo isolada, arte generica, documento, meme ou baixa qualidade.',
                  'Rejeitar prints de conversa, pessoas em destaque sem comida, arte genérica, texto puro, propaganda sem comida, baixa qualidade, documentos, memes.',
                  'Se uma pessoa aparecer como assunto principal, ok=false mesmo que exista comida.',
                  'JSON: {"ok":boolean,"kind":"food|environment|facade|bad","score":0-100,"has_person":boolean,"person_is_prominent":boolean,"people_count":number,"food_visible":boolean,"text_or_poster_dominant":boolean,"reason":"curto"}',
                ].filter(line => !String(line).includes('pessoas em destaque sem comida')).join('\n'),
              },
              { type: 'image_url', image_url: { url: candidate.url } },
            ],
          },
        ],
      }), VISION_TIMEOUT_MS, 'openai_vision');
      const raw = response.choices?.[0]?.message?.content || '{}';
      const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
      const ok = json?.ok === true
        && ['food', 'environment', 'facade'].includes(String(json.kind || '').toLowerCase())
        && json.person_is_prominent !== true
        && json.text_or_poster_dominant !== true
        && Number(json.score || 0) >= 70;
      return {
        ...candidate,
        vision: { ...json, ok },
        score: candidate.score + (ok ? Number(json.score || 0) : -100),
      };
    } catch (err) {
      return {
        ...candidate,
        vision: { ok: false, reason: `vision_failed: ${err.message}` },
        score: candidate.score - 100,
      };
    }
  }
  const limited = candidates.slice(0, VISION_LIMIT);
  for (let offset = 0; offset < limited.length; offset += VISION_CONCURRENCY) {
    const chunk = limited.slice(offset, offset + VISION_CONCURRENCY);
    selected.push(...await Promise.all(chunk.map(scoreCandidate)));
  }
  return [
    ...selected,
    ...candidates.slice(VISION_LIMIT),
  ];
}

async function downloadAndUploadImage(supabase, url, filePath) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 5000) throw new Error('imagem muito pequena');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const { error } = await supabase.storage
      .from('restaurant-images')
      .upload(filePath, buffer, { contentType, upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('restaurant-images').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    return { error: err.message };
  }
}

async function mediaStatus(supabase, restaurantId) {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('image_url, cover_image_url')
    .eq('id', restaurantId)
    .single();
  const { data: galleryRows } = await supabase
    .from('restaurant_gallery')
    .select('id, image_url, order_index')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });
  const galleryCount = galleryRows?.length || 0;
  const missing = [];
  if (!clean(restaurant?.image_url)) missing.push('logo');
  if (!clean(restaurant?.cover_image_url)) missing.push('capa');
  if (galleryCount < MIN_GALLERY) missing.push('galeria_min_3');
  return {
    complete: missing.length === 0,
    missing,
    galleryCount,
    galleryRows: galleryRows || [],
    hasLogo: Boolean(clean(restaurant?.image_url)),
    hasCover: Boolean(clean(restaurant?.cover_image_url)),
  };
}

async function hasStructuredMenu(supabase, restaurantId) {
  const { count, error } = await supabase
    .from('menu_categories')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);
  return !error && Number(count || 0) > 0;
}

async function promoteIfMediaComplete(supabase, restaurantId) {
  const status = await mediaStatus(supabase, restaurantId);
  const menuReady = await hasStructuredMenu(supabase, restaurantId);
  if (!menuReady) return { promoted: false, reason: 'menu_not_ready', mediaStatus: status };
  if (!status.complete) return { promoted: false, reason: `missing_${status.missing.join('_')}`, mediaStatus: status };
  const { error } = await supabase
    .from('restaurants')
    .update({
      ai_validated: true,
      menu_status: 'found',
      menu_status_reason: `Cardapio estruturado e midia minima completa: logo, capa e ${status.galleryCount} fotos de galeria.`,
      menu_last_checked_at: new Date().toISOString(),
    })
    .eq('id', restaurantId);
  if (error) return { promoted: false, reason: error.message, mediaStatus: status };
  return { promoted: true, reason: 'media_gate_complete', mediaStatus: status };
}

async function fetchApifyProfiles(token, usernames) {
  const url = new URL('https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items');
  url.searchParams.set('timeout', '180');
  url.searchParams.set('token', token);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      usernames,
      resultsLimit: usernames.length,
      addParentData: false,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function selectRestaurants(supabase) {
  let query = supabase
    .from('restaurants')
    .select('id,name,google_maps_name,category,city,state,phone,instagram,social_networks,coleta_logs,image_url,cover_image_url,followers_override,is_deleted,menu_status,other_url,other_url_label,opening_hours')
    .eq('city', CITY)
    .eq('state', STATE)
    .eq('is_deleted', false)
    .not('instagram', 'is', null)
    .neq('instagram', '');

  if (ONLY_ID) {
    query = query.eq('id', ONLY_ID).limit(1);
  } else {
    query = query
      .order('reviews_count', { ascending: false })
      .limit(Math.max(LIMIT * 3, LIMIT));
  }

  const { data, error } = await query;
  if (error) throw error;

  const selected = [];
  for (const row of data || []) {
    const username = instagramUsername(row.instagram);
    if (!username) continue;
    const status = await mediaStatus(supabase, row.id);
    const apifyLog = parseJson(row.coleta_logs)?.apify_instagram_media_enrichment || {};
    if (!RETRY_APIFY && apifyLog.status === 'enriched' && !status.complete) continue;
    const needsMedia = FORCE_MEDIA || !status.complete;
    const needsFollowers = !Number(row.followers_override || 0);
    if (ONLY_MISSING_MEDIA && !needsMedia && !needsFollowers) continue;
    selected.push({ ...row, username, mediaStatusBefore: status });
    if (selected.length >= LIMIT) break;
  }
  return selected;
}

function mergeSocialNetworks(row, profile, match) {
  const username = clean(profile.username || row.username || instagramUsername(row.instagram));
  const url = canonicalInstagram(username);
  const now = new Date().toISOString();
  const social = parseArray(row.social_networks)
    .filter((item) => String(item?.platform || '').toLowerCase() !== 'instagram');
  social.push({
    platform: 'instagram',
    url,
    followers: Number(profile.followersCount || 0),
    posts: Number(profile.postsCount || 0),
    biography: clean(profile.biography || '').slice(0, 600),
    website: clean(profile.externalUrl || profile.externalUrlShimmed || ''),
    confidence: Math.min(0.99, Math.max(0.5, match.score / 100)),
    source: 'apify_instagram_profile_scraper',
    verifiedAt: now,
  });
  return social;
}

function mergeLogs(row, patch) {
  if (patch?.apify_instagram_media_enrichment || patch?.instagram_bio_hours_v1) {
    return {
      ...parseJson(row.coleta_logs),
      ...patch,
    };
  }
  return {
    ...parseJson(row.coleta_logs),
    apify_instagram_media_enrichment: patch,
  };
}

async function enrichOne({ supabase, openai, restaurant, profile, apply }) {
  const now = new Date().toISOString();
  const username = clean(profile.username || restaurant.username);
  const canonicalUrl = canonicalInstagram(username);
  const match = scoreProfileMatch(restaurant, profile);
  const before = await mediaStatus(supabase, restaurant.id);
  const biography = clean(profile.biography || '');
  const bioHours = hasCanonicalOpeningHours(restaurant.opening_hours)
    ? null
    : normalizeOpeningHoursFromInstagramBio(biography);
  const evidence = {
    id: restaurant.id,
    name: restaurant.name,
    instagram: canonicalUrl,
    followers: Number(profile.followersCount || 0),
    match,
    bioHours: bioHours ? {
      parser: bioHours.parser,
      opening_hours: bioHours.schedule,
      sourceText: bioHours.sourceText,
    } : null,
    before: {
      hasLogo: before.hasLogo,
      hasCover: before.hasCover,
      galleryCount: before.galleryCount,
      missing: before.missing,
    },
    uploads: [],
    skipped: [],
    applied: apply,
  };

  if (match.score < 55) {
    evidence.status = 'rejected_low_identity_confidence';
    evidence.reason = 'Perfil do Instagram nao confirmou nome/cidade/telefone com seguranca suficiente.';
    return evidence;
  }

  const updates = {
    instagram: canonicalUrl,
    followers_override: Number(profile.followersCount || 0) || restaurant.followers_override || null,
    social_networks: mergeSocialNetworks(restaurant, profile, match),
    coleta_logs: mergeLogs(restaurant, {
      apify_instagram_media_enrichment: {
        checkedAt: now,
        status: 'enriched',
        username,
        followers: Number(profile.followersCount || 0),
        match,
        bioLink: usefulBioLink(profile) || null,
        source: 'apify/instagram-profile-scraper',
      },
      ...(bioHours ? {
        instagram_bio_hours_v1: {
          checkedAt: now,
          source: 'apify/instagram-profile-scraper.biography',
          parser: bioHours.parser,
          sourceText: bioHours.sourceText,
          opening_hours: bioHours.schedule,
        },
      } : {}),
    }),
  };

  if (bioHours) {
    updates.opening_hours = bioHours.schedule;
    evidence.uploads.push({ kind: 'opening_hours_from_instagram_bio', parser: bioHours.parser });
  }

  const bioLink = usefulBioLink(profile);
  if (bioLink && !clean(restaurant.other_url)) {
    const { data: existingLink, error: existingLinkError } = await supabase
      .from('restaurants')
      .select('id,name')
      .eq('other_url', bioLink)
      .neq('id', restaurant.id)
      .maybeSingle();
    if (!existingLinkError && !existingLink?.id) {
      updates.other_url = bioLink;
      updates.other_url_label = 'Link da bio do Instagram';
      evidence.uploads.push({ kind: 'bio_link', url: bioLink });
    } else if (existingLink?.id) {
      evidence.skipped.push({ kind: 'bio_link', url: bioLink, reason: `link_already_used_by_${existingLink.id}` });
    }
  }

  if ((FORCE_MEDIA || !before.hasLogo) && (profile.profilePicUrlHD || profile.profilePicUrl)) {
    const logoUrl = profile.profilePicUrlHD || profile.profilePicUrl;
    if (apply) {
      const uploaded = await downloadAndUploadImage(
        supabase,
        logoUrl,
        `logos/${restaurant.id}/instagram_profile_${Date.now()}.jpg`,
      );
      if (typeof uploaded === 'string') {
        updates.image_url = uploaded;
        evidence.uploads.push({ kind: 'logo', url: uploaded });
      } else {
        evidence.skipped.push({ kind: 'logo', reason: uploaded.error });
      }
    } else {
      evidence.uploads.push({ kind: 'logo', dryRunUrl: logoUrl });
    }
  }

  const needGallery = Math.max(0, MIN_GALLERY - before.galleryCount);
  const availableSlots = Math.max(0, MAX_GALLERY - before.galleryCount);
  const needsGalleryUpload = FORCE_MEDIA || availableSlots > 0 || needGallery > 0;
  let usableCandidates = [];
  if (needsGalleryUpload) {
    let candidates = postImageCandidates(profile)
      .map((candidate) => ({
        ...candidate,
        score: heuristicImageScore(candidate, restaurant),
      }))
      .sort((a, b) => b.score - a.score);

    if (USE_VISION && !openai) {
      evidence.skipped.push({ kind: 'gallery', reason: 'openai_vision_required_unavailable' });
      candidates = [];
    } else if (USE_VISION) {
      candidates = await visionScoreImages(openai, candidates, restaurant);
      candidates.sort((a, b) => b.score - a.score);
    } else {
      evidence.skipped.push({ kind: 'gallery', reason: 'vision_disabled_gallery_not_trusted' });
      candidates = [];
    }

    usableCandidates = candidates
      .filter((candidate) => candidate.vision?.ok === true)
      .slice(0, MAX_GALLERY);
  }
  const toUpload = (FORCE_MEDIA ? usableCandidates : usableCandidates.slice(0, Math.max(needGallery, availableSlots)))
    .slice(0, availableSlots || MAX_GALLERY);

  const insertedGallery = [];
  if (toUpload.length) {
    let orderIndex = before.galleryCount;
    for (const candidate of toUpload) {
      if (insertedGallery.length >= availableSlots && !FORCE_MEDIA) break;
      if (apply) {
        const uploaded = await downloadAndUploadImage(
          supabase,
          candidate.url,
          `gallery/${restaurant.id}/instagram_${Date.now()}_${insertedGallery.length + 1}.jpg`,
        );
        if (typeof uploaded !== 'string') {
          evidence.skipped.push({ kind: 'gallery', sourceUrl: candidate.url, reason: uploaded.error });
          continue;
        }
        const { error } = await supabase
          .from('restaurant_gallery')
          .insert([{
            restaurant_id: restaurant.id,
            image_url: uploaded,
            caption: 'Foto do Instagram',
            order_index: orderIndex++,
          }]);
        if (error) {
          evidence.skipped.push({ kind: 'gallery', sourceUrl: candidate.url, reason: error.message });
          continue;
        }
        insertedGallery.push(uploaded);
        evidence.uploads.push({
          kind: 'gallery',
          url: uploaded,
          score: candidate.score,
          vision: candidate.vision || null,
        });
      } else {
        insertedGallery.push(candidate.url);
        evidence.uploads.push({
          kind: 'gallery',
          dryRunUrl: candidate.url,
          score: candidate.score,
          vision: candidate.vision || null,
        });
      }
    }
  }

  if ((FORCE_MEDIA || !before.hasCover) && insertedGallery[0]) {
    updates.cover_image_url = insertedGallery[0];
  }

  if (apply) {
    const { error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurant.id);
    if (error) {
      evidence.status = 'update_failed';
      evidence.reason = error.message;
      return evidence;
    }
  }

  const after = apply ? await mediaStatus(supabase, restaurant.id) : before;
  const promotion = apply ? await promoteIfMediaComplete(supabase, restaurant.id) : null;
  evidence.status = 'ok';
  evidence.after = apply ? {
    hasLogo: after.hasLogo,
    hasCover: after.hasCover,
    galleryCount: after.galleryCount,
    missing: after.missing,
  } : null;
  evidence.promotion = promotion;
  evidence.candidates = usableCandidates.slice(0, 8).map((candidate) => ({
    source: candidate.source,
    score: candidate.score,
    caption: candidate.caption.slice(0, 180),
    vision: candidate.vision || null,
  }));
  return evidence;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const env = readEnv();
  const apifyToken = env.APIFY_TOKEN;
  if (!apifyToken) throw new Error('APIFY_TOKEN ausente no .env');
  const supabase = createClient(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const openaiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
  const openai = USE_VISION && openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

  console.log(JSON.stringify({
    city: CITY,
    state: STATE,
    limit: LIMIT,
    batchSize: BATCH_SIZE,
    apply: APPLY,
    useVision: Boolean(openai),
    onlyId: ONLY_ID || null,
    visionLimit: openai ? VISION_LIMIT : 0,
    visionConcurrency: openai ? VISION_CONCURRENCY : 0,
    visionTimeoutMs: openai ? VISION_TIMEOUT_MS : 0,
    downloadTimeoutMs: DOWNLOAD_TIMEOUT_MS,
    minGallery: MIN_GALLERY,
    maxGallery: MAX_GALLERY,
    outDir: OUT_DIR,
  }, null, 2));

  const restaurants = await selectRestaurants(supabase);
  fs.writeFileSync(path.join(OUT_DIR, 'target-restaurants.json'), JSON.stringify(
    restaurants.map((row) => ({
      id: row.id,
      name: row.name,
      instagram: row.instagram,
      username: row.username,
      mediaStatusBefore: row.mediaStatusBefore,
    })),
    null,
    2,
  ));

  const results = [];
  for (let offset = 0; offset < restaurants.length; offset += BATCH_SIZE) {
    const batch = restaurants.slice(offset, offset + BATCH_SIZE);
    const usernames = batch.map((row) => row.username);
    console.log(`Apify batch ${offset + 1}-${offset + batch.length}/${restaurants.length}: ${usernames.join(', ')}`);
    let profiles = [];
    try {
      profiles = await fetchApifyProfiles(apifyToken, usernames);
    } catch (err) {
      for (const restaurant of batch) {
        results.push({ id: restaurant.id, name: restaurant.name, status: 'apify_failed', reason: err.message });
      }
      continue;
    }

    const profileByUsername = new Map(profiles.map((profile) => [normalize(profile.username || ''), profile]));
    for (const restaurant of batch) {
      const profile = profileByUsername.get(normalize(restaurant.username));
      if (!profile) {
        results.push({ id: restaurant.id, name: restaurant.name, instagram: restaurant.instagram, status: 'profile_not_returned' });
        continue;
      }
      const evidence = await enrichOne({ supabase, openai, restaurant, profile, apply: APPLY });
      fs.writeFileSync(path.join(OUT_DIR, `${restaurant.id}.json`), JSON.stringify(evidence, null, 2));
      results.push(evidence);
      console.log(`${evidence.status}: ${restaurant.name} | seguidores=${evidence.followers || 0} | uploads=${evidence.uploads?.length || 0}`);
    }
  }

  const summary = {
    city: CITY,
    state: STATE,
    apply: APPLY,
    selected: restaurants.length,
    ok: results.filter((item) => item.status === 'ok').length,
    rejected: results.filter((item) => String(item.status || '').startsWith('rejected')).length,
    failed: results.filter((item) => !['ok'].includes(item.status) && !String(item.status || '').startsWith('rejected')).length,
    promoted: results.filter((item) => item.promotion?.promoted).length,
    completedMedia: results.filter((item) => item.after?.missing?.length === 0).length,
    outDir: OUT_DIR,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify({ summary, results }, null, 2));
  console.log(`SUMMARY:${JSON.stringify(summary)}`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
