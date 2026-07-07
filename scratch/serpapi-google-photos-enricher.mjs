import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  dataForSeoImagesSearch,
  ensureProviderCredentials,
} from './search-provider.mjs';

const IDS = [
  '8322d0f6-8e08-4de7-a73f-d71c57f0291d',
  '8bae41e4-1365-4def-9857-34e4abdbf329',
  'ecac91e3-52c0-4780-9867-6b3b1d096089',
];

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FORCE = args.includes('--force');
const ONLY_ID = valueArg('--id', '');
const MIN_GALLERY = Number(valueArg('--min-gallery', '3')) || 3;
const MAX_GALLERY = Math.min(8, Math.max(MIN_GALLERY, Number(valueArg('--max-gallery', '8')) || 8));
const VISION_LIMIT = Number(valueArg('--vision-limit', '16')) || 16;
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const SEARCH_PROVIDER = valueArg(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const OUT_DIR = path.join('scratch', `${SEARCH_PROVIDER}-google-photos-enrichment`, RUN_ID);

function valueArg(name, fallback = '') {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
}

function readEnv() {
  const env = { ...process.env };
  if (!fs.existsSync('.env')) return env;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
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

function instagramUsername(value) {
  const raw = clean(value);
  if (!raw) return '';
  if (!raw.includes('instagram.com') && /^[a-z0-9._]{2,}$/i.test(raw.replace(/^@/, ''))) {
    return raw.replace(/^@/, '').toLowerCase();
  }
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.toLowerCase().includes('instagram.com')) return '';
    return (parsed.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  } catch {
    return '';
  }
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

function mergeLogs(row, patch) {
  return {
    ...parseJson(row.coleta_logs),
    ...patch,
  };
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function writeJson(name, value) {
  ensureOutDir();
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(value, null, 2));
}

async function fetchJson(url, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`non_json_response:${text.slice(0, 120)}`);
    }
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function findCachedGoogleMapsResult(placeId) {
  const roots = ['scratch/dataforseo-google-maps-phase1', 'scratch/serpapi-google-maps-phase1']
    .flatMap((root) => {
      if (!fs.existsSync(root)) return [];
      return fs.readdirSync(root)
        .map((entry) => path.join(root, entry))
        .filter((entry) => fs.statSync(entry).isDirectory())
        .sort()
        .reverse();
    });
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      if (!/^raw-\d+\.json$/.test(entry)) continue;
      const file = path.join(root, entry);
      const payload = parseJson(fs.readFileSync(file, 'utf8'), {});
      const result = (payload.local_results || []).find((item) => item.place_id === placeId);
      if (result) return { file, result };
    }
  }
  return null;
}

async function resolveMapsEvidence(apiKey, restaurant) {
  const cached = findCachedGoogleMapsResult(restaurant.google_place_id);
  if (cached?.result) {
    return {
      dataId: cached.result.data_id || null,
      source: 'cached_phase1_raw',
      rawFile: cached.file,
      cachedResult: cached.result,
    };
  }

  if (SEARCH_PROVIDER !== 'serpapi') {
    return {
      dataId: null,
      source: `${SEARCH_PROVIDER}_images_only`,
      rawFile: null,
      cachedResult: {},
    };
  }

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_maps');
  url.searchParams.set('google_domain', 'google.com');
  url.searchParams.set('hl', 'pt');
  url.searchParams.set('place_id', restaurant.google_place_id);
  url.searchParams.set('api_key', apiKey);
  const payload = await fetchJson(url);
  const place = payload.place_results || {};
  if (!place.data_id) throw new Error('data_id_not_found');
  return { dataId: place.data_id, source: 'serpapi_place_results', cachedResult: place };
}

async function fetchPhotos(apiKey, dataId) {
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_maps_photos');
  url.searchParams.set('hl', 'pt');
  url.searchParams.set('data_id', dataId);
  url.searchParams.set('api_key', apiKey);
  const payload = await fetchJson(url, 90000);
  return {
    payload,
    photos: Array.isArray(payload.photos) ? payload.photos : [],
  };
}

async function fetchGoogleImagesFallback(apiKey, restaurant) {
  const username = instagramUsername(restaurant.instagram);
  const queries = [
    [`"${restaurant.name}"`, restaurant.city, restaurant.state, username ? `"${username}"` : ''].filter(Boolean).join(' '),
    [`"${restaurant.name}"`, restaurant.city, restaurant.state].filter(Boolean).join(' '),
    username ? [`"${username}"`, restaurant.city].filter(Boolean).join(' ') : '',
    username || '',
  ].filter(Boolean);
  const attempts = [];
  for (const query of queries) {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_images');
    url.searchParams.set('google_domain', 'google.com.br');
    url.searchParams.set('hl', 'pt-BR');
    url.searchParams.set('gl', 'br');
    url.searchParams.set('q', query);
    url.searchParams.set('ijn', '0');
    url.searchParams.set('api_key', apiKey);
    try {
      const payload = await fetchJson(url, 90000);
      const images = Array.isArray(payload.images_results) ? payload.images_results : [];
      attempts.push({ query, count: images.length });
      if (images.length) return { payload, query, images, attempts };
    } catch (err) {
      attempts.push({ query, count: 0, error: err.message });
    }
  }
  return { payload: {}, query: queries[0] || '', images: [], attempts };
}

async function fetchDataForSeoImagesFallback(env, restaurant) {
  const username = instagramUsername(restaurant.instagram);
  const queries = [
    [`"${restaurant.name}"`, restaurant.city, restaurant.state, username ? `"${username}"` : ''].filter(Boolean).join(' '),
    [`"${restaurant.name}"`, restaurant.city, restaurant.state].filter(Boolean).join(' '),
    username ? [`"${username}"`, restaurant.city].filter(Boolean).join(' ') : '',
    username || '',
  ].filter(Boolean);
  const attempts = [];
  for (const query of queries) {
    try {
      const result = await dataForSeoImagesSearch(env, query, {
        depth: 24,
        timeoutMs: 90000,
        languageCode: 'pt',
        seDomain: 'google.com.br',
        locationName: `${restaurant.city}, Paraiba, Brazil`,
      });
      attempts.push(...(result.attempts || []));
      if (result.images.length) return { ...result, attempts };
    } catch (err) {
      attempts.push({ query, count: 0, error: err.message });
    }
  }
  return { payload: {}, query: queries[0] || '', images: [], attempts };
}

async function fetchProviderImagesFallback(env, apiKey, restaurant) {
  if (SEARCH_PROVIDER === 'serpapi') return fetchGoogleImagesFallback(apiKey, restaurant);
  return fetchDataForSeoImagesFallback(env, restaurant);
}

function buildCandidates(restaurant, resolver, photosPayload) {
  const seen = new Set();
  const candidates = [];
  const cached = resolver.cachedResult || {};
  const cachedImage = cached.serpapi_thumbnail || cached.thumbnail;
  if (cachedImage && !/streetviewpixels/i.test(cachedImage)) {
    candidates.push({
      url: cachedImage,
      source: `${SEARCH_PROVIDER}_maps_thumbnail`,
      score: 10,
      caption: `${restaurant.name} thumbnail`,
    });
  }
  for (const [index, photo] of (photosPayload.photos || []).entries()) {
    const url = photo.image || photo.original || photo.thumbnail;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    if (/streetviewpixels/i.test(url)) {
      candidates.push({
        url,
        source: 'google_maps_streetview',
        score: -30,
        caption: 'streetview fallback',
        index,
      });
      continue;
    }
    candidates.push({
      url,
      source: 'google_maps_photo',
      score: 30 - index,
      caption: photo.title || photo.caption || '',
      index,
      meta: {
        thumbnail: photo.thumbnail || null,
        photoMetaSerpapiLink: photo.photo_meta_serpapi_link || null,
      },
    });
  }
  return candidates.filter((candidate) => {
    if (!candidate.url || seen.has(`final:${candidate.url}`)) return false;
    seen.add(`final:${candidate.url}`);
    return true;
  });
}

function appendGoogleImageCandidates(candidates, fallback) {
  const seen = new Set(candidates.map((candidate) => candidate.url));
  for (const [index, image] of (fallback.images || []).entries()) {
    const url = image.original || image.thumbnail;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    candidates.push({
      url,
      source: 'google_images_fallback',
      score: 15 - index,
      caption: [image.title, image.source, image.link].filter(Boolean).join(' | '),
      index,
      meta: {
        title: image.title || null,
        source: image.source || null,
        link: image.link || null,
        thumbnail: image.thumbnail || null,
      },
    });
  }
  return candidates;
}

async function visionScoreImage(openai, candidate, restaurant) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || process.env.VITE_AI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Voce e um auditor visual rigoroso para galeria publica de restaurante. Responda somente JSON valido.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                `Restaurante esperado: ${restaurant.name}`,
                `Categoria: ${restaurant.category || ''}`,
                `Cidade: ${restaurant.city}/${restaurant.state}`,
                'Aprove apenas foto real boa de comida/produto do restaurante, fachada ou ambiente do restaurante.',
                'Rejeite pessoas em destaque/posando, equipe, selfie, clientes, rostos, grupo de pessoas, banner/cartaz/promocao/cardapio textual dominante, logo isolada, print, arte generica, documento, meme, foto escura/desfocada, street view ruim.',
                'Se houver pessoa como assunto principal, ok=false. Se for post promocional com texto dominante, ok=false. Se for apenas placa/fachada aceitavel, kind=facade.',
                'JSON: {"ok":boolean,"kind":"food|environment|facade|bad","score":0-100,"has_person":boolean,"person_is_prominent":boolean,"people_count":number,"food_visible":boolean,"text_or_poster_dominant":boolean,"reason":"curto"}',
              ].join('\n'),
            },
            { type: 'image_url', image_url: { url: candidate.url } },
          ],
        },
      ],
    });
    const raw = response.choices?.[0]?.message?.content || '{}';
    const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
    const ok = json.ok === true
      && ['food', 'environment', 'facade'].includes(String(json.kind || '').toLowerCase())
      && json.person_is_prominent !== true
      && json.text_or_poster_dominant !== true
      && Number(json.score || 0) >= 70;
    return {
      ...candidate,
      vision: { ...json, ok },
      score: candidate.score + (ok ? Number(json.score || 0) : -120),
    };
    } catch (err) {
      const message = String(err?.message || err);
      if ((err?.status === 429 || /rate limit/i.test(message)) && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
        continue;
      }
      return {
        ...candidate,
        vision: { ok: false, reason: `vision_failed:${message}` },
        score: candidate.score - 120,
      };
    }
  }
}

async function scoreCandidates(openai, candidates, restaurant) {
  const limited = candidates.slice(0, VISION_LIMIT);
  const scored = [];
  for (const candidate of limited) {
    scored.push(await visionScoreImage(openai, candidate, restaurant));
  }
  return scored.sort((a, b) => b.score - a.score);
}

async function downloadAndUploadImage(supabase, url, filePath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 5000) throw new Error('imagem_muito_pequena');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const { error } = await supabase.storage
      .from('restaurant-images')
      .upload(filePath, buffer, { contentType, upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('restaurant-images').getPublicUrl(filePath);
    return data.publicUrl;
  } finally {
    clearTimeout(timer);
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
    .select('id,image_url,order_index')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });
  return {
    hasLogo: Boolean(clean(restaurant?.image_url)),
    hasCover: Boolean(clean(restaurant?.cover_image_url)),
    galleryCount: galleryRows?.length || 0,
    galleryRows: galleryRows || [],
  };
}

async function hasStructuredMenu(supabase, restaurantId) {
  const { count, error } = await supabase
    .from('menu_categories')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);
  return !error && Number(count || 0) > 0;
}

async function promoteIfComplete(supabase, restaurantId) {
  const status = await mediaStatus(supabase, restaurantId);
  const menuReady = await hasStructuredMenu(supabase, restaurantId);
  if (!menuReady || !status.hasLogo || !status.hasCover || status.galleryCount < MIN_GALLERY) {
    return { promoted: false, status, menuReady };
  }
  const { error } = await supabase
    .from('restaurants')
    .update({
      ai_validated: true,
      menu_status: 'found',
      menu_status_reason: `Cardapio estruturado e midia minima completa via ${SEARCH_PROVIDER}/Google + OpenAI Vision: logo, capa e ${status.galleryCount} fotos.`,
      menu_last_checked_at: new Date().toISOString(),
    })
    .eq('id', restaurantId);
  return { promoted: !error, error: error?.message || null, status, menuReady };
}

async function enrichOne({ supabase, openai, apiKey, env, restaurant }) {
  const before = await mediaStatus(supabase, restaurant.id);
  const evidence = {
    id: restaurant.id,
    name: restaurant.name,
    before,
    applied: APPLY,
    uploads: [],
    skipped: [],
  };

  if (!FORCE && before.hasCover && before.galleryCount >= MIN_GALLERY) {
    evidence.status = 'skipped_media_complete';
    return evidence;
  }

  const resolver = await resolveMapsEvidence(apiKey, restaurant);
  evidence.resolver = {
    dataId: resolver.dataId,
    source: resolver.source,
    rawFile: resolver.rawFile || null,
  };
  const photosPayload = SEARCH_PROVIDER === 'serpapi' && resolver.dataId
    ? await fetchPhotos(apiKey, resolver.dataId)
    : { payload: {}, photos: [] };
  writeJson(`${restaurant.id}-${SEARCH_PROVIDER}-photos-raw.json`, photosPayload.payload);
  evidence.photoCount = photosPayload.photos.length;

  const candidates = buildCandidates(restaurant, resolver, photosPayload);
  let fallbackImages = null;
  if (candidates.length < 8 || restaurant.name.toLowerCase().includes('pizza')) {
    fallbackImages = await fetchProviderImagesFallback(env, apiKey, restaurant);
    writeJson(`${restaurant.id}-google-images-raw.json`, fallbackImages.payload);
    appendGoogleImageCandidates(candidates, fallbackImages);
  }
  evidence.googleImagesFallback = fallbackImages ? {
    query: fallbackImages.query,
    count: fallbackImages.images.length,
  } : null;
  const scored = await scoreCandidates(openai, candidates, restaurant);
  evidence.candidates = scored.map((candidate) => ({
    source: candidate.source,
    score: candidate.score,
    vision: candidate.vision,
    index: candidate.index ?? null,
    urlHost: (() => {
      try {
        return new URL(candidate.url).hostname;
      } catch {
        return null;
      }
    })(),
  }));

  const approved = scored.filter((candidate) => candidate.vision?.ok === true).slice(0, MAX_GALLERY);
  if (!approved.length) {
    evidence.status = 'no_approved_images';
    return evidence;
  }

  const uploaded = [];
  if (APPLY) {
    if (FORCE) {
      await supabase.from('restaurant_gallery').delete().eq('restaurant_id', restaurant.id);
    }
    let orderIndex = FORCE ? 0 : before.galleryCount;
    for (const [index, candidate] of approved.entries()) {
      if (uploaded.length >= MAX_GALLERY) break;
      if (!FORCE && before.galleryCount + uploaded.length >= MAX_GALLERY) break;
      try {
        const publicUrl = await downloadAndUploadImage(
          supabase,
          candidate.url,
          `gallery/${restaurant.id}/${SEARCH_PROVIDER}_google_${Date.now()}_${index + 1}.jpg`,
        );
        const { error } = await supabase.from('restaurant_gallery').insert([{
          restaurant_id: restaurant.id,
          image_url: publicUrl,
          caption: `Foto Google Maps (${candidate.vision.kind})`,
          order_index: orderIndex++,
        }]);
        if (error) throw error;
        uploaded.push(publicUrl);
        evidence.uploads.push({
          kind: 'gallery',
          url: publicUrl,
          vision: candidate.vision,
          source: candidate.source,
        });
      } catch (err) {
        evidence.skipped.push({
          kind: 'gallery',
          reason: err.message,
          source: candidate.source,
          vision: candidate.vision,
        });
      }
    }
    if ((FORCE || !before.hasCover) && uploaded[0]) {
      const { error } = await supabase
        .from('restaurants')
        .update({
          cover_image_url: uploaded[0],
          coleta_logs: mergeLogs(restaurant, {
            [`${SEARCH_PROVIDER}_google_photos_enrichment_v1`]: {
              checkedAt: new Date().toISOString(),
              dataId: resolver.dataId,
              photoCount: photosPayload.photos.length,
              approvedCount: approved.length,
              uploadedCount: uploaded.length,
              source: `${SEARCH_PROVIDER}/google_images + cached_maps_thumbnail + openai_vision`,
            },
          }),
        })
        .eq('id', restaurant.id);
      if (error) evidence.skipped.push({ kind: 'cover', reason: error.message });
      else evidence.uploads.push({ kind: 'cover', url: uploaded[0] });
    }
  } else {
    evidence.uploads = approved.map((candidate) => ({
      kind: 'gallery_dry_run',
      source: candidate.source,
      vision: candidate.vision,
      urlHost: new URL(candidate.url).hostname,
    }));
  }

  const after = APPLY ? await mediaStatus(supabase, restaurant.id) : before;
  const promotion = APPLY ? await promoteIfComplete(supabase, restaurant.id) : null;
  evidence.after = after;
  evidence.promotion = promotion;
  evidence.status = 'ok';
  return evidence;
}

async function main() {
  ensureOutDir();
  const env = readEnv();
  ensureProviderCredentials(env, SEARCH_PROVIDER);
  const apiKey = SEARCH_PROVIDER === 'serpapi'
    ? (env.SERPAPI_API_KEY || env.VITE_SERPAPI_API_KEY)
    : null;
  const openaiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY ausente no .env');

  const supabase = createClient(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const openai = new OpenAI({ apiKey: openaiKey });
  const ids = ONLY_ID ? [ONLY_ID] : IDS;
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,category,city,state,phone,instagram,google_place_id,google_maps_url,latitude,longitude,coleta_logs')
    .in('id', ids);
  if (error) throw error;

  const results = [];
  for (const restaurant of data || []) {
    console.log(JSON.stringify({ processing: restaurant.name, id: restaurant.id }));
    const evidence = await enrichOne({ supabase, openai, apiKey, env, restaurant });
    results.push(evidence);
    writeJson(`${restaurant.id}.json`, evidence);
    console.log(JSON.stringify({
      id: restaurant.id,
      name: restaurant.name,
      status: evidence.status,
      photoCount: evidence.photoCount,
      approved: (evidence.candidates || []).filter((item) => item.vision?.ok).length,
      uploads: evidence.uploads?.length || 0,
      after: evidence.after || null,
      promotion: evidence.promotion || null,
    }));
  }
  writeJson('summary.json', {
    runId: RUN_ID,
    searchProvider: SEARCH_PROVIDER,
    applied: APPLY,
    outDir: OUT_DIR,
    results: results.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      photoCount: item.photoCount,
      approved: (item.candidates || []).filter((candidate) => candidate.vision?.ok).length,
      uploads: item.uploads?.length || 0,
      after: item.after || null,
      promotion: item.promotion || null,
    })),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
