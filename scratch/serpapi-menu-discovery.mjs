import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  dataForSeoOrganicSearch,
  ensureProviderCredentials,
} from './search-provider.mjs';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const OUT_DIR = path.join('scratch', `${SEARCH_PROVIDER}-menu-discovery`, RUN_ID);
const CITY = argValue('--city', 'Campina Grande');
const STATE = argValue('--state', 'PB');
const STATUS = argValue('--status', 'needs_recollection');
const LIMIT = Number(argValue('--limit', '1')) || 1;
const TARGET_OFFSET = Math.max(0, Number(argValue('--offset', '0')) || 0);
const QUERY = argValue('--query', '');
const ONLY_ID = argValue('--id', '');
const IDS_FILE = argValue('--ids-file', '');
const MODE = argValue('--mode', 'menu');
const NUM_RESULTS = Math.max(3, Math.min(Number(argValue('--num', '10')) || 10, 20));
const DELAY_MS = Math.max(0, Number(argValue('--delay-ms', '0')) || 0);
const APPLY = hasFlag('--apply');
const NAME_STOP_TOKENS = new Set([
  'campina',
  'grande',
  'cabedelo',
  'pb',
  'intermares',
  'ponta',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'campina',
  'matos',
  'poco',
  'poço',
  'camboinha',
  'jacare',
  'jacaré',
  'renascer',
  'formosa',
  'centro',
  'vila',
  'sao',
  'são',
  'joao',
  'joão',
  'recanto',
  'areia',
  'dourada',
  'praia',
  'jardim',
  'amazonas',
  'park',
  'paraiba',
  'cardapio',
  'menu',
  'pedido',
  'delivery',
  'instagram',
  'restaurante',
  'restaurant',
  'lanchonete',
  'pizzaria',
  'pizza',
  'hamburgueria',
  'burger',
  'bar',
  'bistro',
  'cafeteria',
  'esfiharia',
  'pastelaria',
  'telefone',
  'whatsapp',
  'oficial',
  'campinagrande',
  'brasil',
  'comida',
  'rua',
  'lote',
  'loja',
  'unidade',
  'express',
  'premium',
  'gourmet',
  'of',
  'online',
  'oficial',
  'sushi',
  'temaki',
  'temakeria',
  'acai',
  'acaiteria',
  'sorveteria',
  'gelato',
  'churrascaria',
  'galeteria',
  'tapiocaria',
  'pastel',
  'pastelaria',
  'espetinho',
  'lanches',
  'lanche',
  'massas',
  'pizzas',
  'caldinho',
  'inspiraÃ§Ã£o',
  'inspiracao',
  'texana',
]);
const TARGET_CONFLICT_PATTERNS = [
  'sao paulo, sp',
  'sao paulo sp',
  'rio de janeiro, rj',
  'rio de janeiro rj',
  'recife, pe',
  'recife pe',
  'natal, rn',
  'natal rn',
  'fortaleza, ce',
  'fortaleza ce',
  'maceio, al',
  'maceio al',
  'salvador, ba',
  'salvador ba',
  'brasilia, df',
  'brasilia df',
  'curitiba, pr',
  'curitiba pr',
  'joao pessoa, pb',
  'joao pessoa pb',
  'caico, rn',
  'caico rn',
];

fs.mkdirSync(OUT_DIR, { recursive: true });

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function findProjectRoot() {
  const starts = [process.cwd(), path.resolve(scriptDir, '..')];
  for (const start of starts) {
    let current = path.resolve(start);
    while (true) {
      if (fs.existsSync(path.join(current, '.env')) && fs.existsSync(path.join(current, 'package.json'))) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return path.resolve(scriptDir, '..');
}

function parseEnvFile(envPath) {
  const env = {};
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return { ...process.env, ...env };
}

function parseIdsFile(file) {
  if (!file || !fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/[\r\n,;\s]+/).map((id) => id.trim()).filter(Boolean);
}

function parseUrl(value) {
  const raw = clean(value);
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(`https://${raw}`);
    } catch {
      return null;
    }
  }
}

function canonicalUrl(value) {
  const url = parseUrl(value);
  if (!url) return clean(value);
  url.hash = '';
  for (const param of [...url.searchParams.keys()]) {
    const lower = param.toLowerCase();
    if (lower.startsWith('utm_') || ['fbclid', 'gclid', 'igshid', 'si'].includes(lower)) {
      url.searchParams.delete(param);
    }
  }
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  return url.toString().replace(/\/$/, '');
}

function hostOf(value) {
  const url = parseUrl(value);
  return url ? url.hostname.toLowerCase().replace(/^www\./, '') : '';
}

function detectPlatform(urlValue) {
  const url = canonicalUrl(urlValue).toLowerCase();
  const host = hostOf(urlValue);
  if (/ifood\.com(\.br)?/.test(url) || host.includes('ifood')) return 'ifood';
  if (host.includes('cardapioweb')) return 'cardapioweb';
  if (host === 'pedido.anota.ai' || host.endsWith('.anota.ai') || url.includes('anota.ai')) return 'anota_ai';
  if (host.includes('instadelivery')) return 'instadelivery';
  if (host.includes('goomer')) return 'goomer';
  if (host.includes('ola.click') || host.includes('olaclick')) return 'olaclick';
  if (host.includes('saipos')) return 'saipos';
  if (host.includes('brendi')) return 'brendi';
  if (host.includes('deliverydireto')) return 'deliverydireto';
  if (host.includes('menudino')) return 'menudino';
  if (host.includes('whatsmenu')) return 'whatsmenu';
  if (host.includes('cardapiodigital') || host.includes('cardapio.digital') || host.includes('cardapiodigital.io')) return 'cardapiodigital';
  if (host.includes('livemenu')) return 'livemenu';
  if (host.includes('meucarrinho')) return 'meucarrinho';
  if (host.includes('yooga')) return 'yooga';
  if (host.includes('instagram.com')) return 'instagram';
  if (host.includes('facebook.com') || host.includes('fb.com')) return 'facebook';
  if (host.includes('linktr.ee') || host.includes('linktree')) return 'linktree';
  if (host.includes('canva.com')) return 'canva';
  if (host.includes('restaurantguru')) return 'restaurantguru';
  if (host.includes('tripadvisor')) return 'tripadvisor';
  if (host.includes('maps.apple.com')) return 'map';
  if (host.includes('google.com') || host.includes('goo.gl') || host.includes('maps.app.goo.gl')) return 'google';
  if (/\.(pdf|png|jpe?g|webp)(?:[?#].*)?$/i.test(url)) return 'direct_asset';
  return host || 'unknown';
}

function instagramPathKind(urlValue) {
  const url = parseUrl(urlValue);
  if (!url || !url.hostname.toLowerCase().includes('instagram.com')) return '';
  const parts = url.pathname.split('/').filter(Boolean);
  if (!parts.length) return 'home';
  if (['p', 'reel', 'stories', 'explore', 'tv'].includes(parts[0].toLowerCase())) return parts[0].toLowerCase();
  return 'profile';
}

function extractInstagramHandles(text) {
  const handles = new Set();
  const normalized = clean(text);
  for (const match of normalized.matchAll(/@([a-zA-Z0-9._]{2,30})/g)) {
    const handle = match[1].replace(/[._]+$/g, '').toLowerCase();
    if (!handle || handle.includes('..')) continue;
    handles.add(handle);
  }
  return [...handles];
}

function instagramHandleFromUrl(urlValue) {
  const url = parseUrl(urlValue);
  if (!url || !url.hostname.toLowerCase().includes('instagram.com')) return '';
  const first = url.pathname.split('/').filter(Boolean)[0] || '';
  if (!first || ['p', 'reel', 'stories', 'explore', 'tv'].includes(first.toLowerCase())) return '';
  return first.toLowerCase();
}

function canonicalInstagramProfileUrl(urlValue) {
  const handle = instagramHandleFromUrl(urlValue);
  return handle ? `https://instagram.com/${handle}` : '';
}

function distinctiveNameTokens(restaurant = {}) {
  const rawNameTokens = normalize(restaurant.name || restaurant.google_maps_name || '')
    .split(' ')
    .filter((token) => token.length >= 3);
  return rawNameTokens
    .filter((token) => !NAME_STOP_TOKENS.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

function brandMatch(candidate, restaurant = {}) {
  const tokens = distinctiveNameTokens(restaurant);
  const text = normalize(`${candidate.title} ${candidate.snippet} ${candidate.displayedLink} ${candidate.link}`);
  const handle = normalize(instagramHandleFromUrl(candidate.link));
  const textMatches = tokens.filter((token) => text.includes(token));
  const handleMatches = tokens.filter((token) => handle.includes(token));
  const hasLongSingleHandleMatch = handleMatches.some((token) => token.length >= 5);
  const hasLongSingleTextMatch = textMatches.some((token) => token.length >= 6);
  return {
    tokens,
    textMatches,
    handleMatches,
    hasStrongMatch: handleMatches.length >= 1 || textMatches.length >= 2 || hasLongSingleHandleMatch || hasLongSingleTextMatch,
  };
}

function isMenuPlatform(platform) {
  return [
    'cardapioweb',
    'anota_ai',
    'instadelivery',
    'goomer',
    'olaclick',
    'saipos',
    'brendi',
    'deliverydireto',
    'menudino',
    'whatsmenu',
    'cardapiodigital',
    'livemenu',
    'meucarrinho',
    'yooga',
  ].includes(platform);
}

function scoreCandidate(candidate, restaurant = {}) {
  const platform = candidate.platform;
  const text = normalize(`${candidate.title} ${candidate.snippet} ${candidate.link}`);
  const rawNameTokens = normalize(restaurant.name || restaurant.google_maps_name || '')
    .split(' ')
    .filter((token) => token.length >= 3);
  const nameTokens = rawNameTokens.filter((token) => !NAME_STOP_TOKENS.has(token));
  const tokensForMatching = nameTokens.length ? nameTokens : rawNameTokens;
  let score = 0;
  const flags = [];

  if (isMenuPlatform(platform)) score += 80;
  if (platform === 'instagram') {
    score += MODE === 'instagram' ? 70 : 25;
    const kind = instagramPathKind(candidate.link);
    if (kind === 'profile') score += 10;
    if (kind && kind !== 'profile') {
      score -= 8;
      flags.push(`instagram_${kind}_not_profile`);
    }
  }
  if (platform === 'linktree') score += 28;
  if (platform === 'restaurantguru' || platform === 'tripadvisor') score += 12;
  if (platform === 'ifood') {
    score -= 100;
    flags.push('ifood_rejected');
  }
  if (platform === 'canva' || platform === 'direct_asset') flags.push('needs_visual_or_ocr');
  if (platform === 'google' || platform === 'map') flags.push('map_not_direct_menu');

  if (text.includes(normalize(CITY))) score += 16;
  if (text.includes(normalize(STATE))) score += 6;
  const conflictingLocation = TARGET_CONFLICT_PATTERNS.find((pattern) => text.includes(normalize(pattern)));
  if (conflictingLocation) {
    flags.push(`conflicting_location:${conflictingLocation}`);
    score -= 55;
  }
  const matchedNameTokens = tokensForMatching.filter((token) => text.includes(token)).length;
  score += Math.min(24, matchedNameTokens * 4);
  const brand = brandMatch(candidate, restaurant);
  if (brand.tokens.length) {
    score += Math.min(18, brand.handleMatches.length * 10 + brand.textMatches.length * 4);
    if (!brand.hasStrongMatch) {
      flags.push('brand_not_confirmed');
      score -= platform === 'instagram' ? 46 : 28;
    }
  }
  if (matchedNameTokens === 0 && tokensForMatching.length >= 2) {
    flags.push('name_not_confirmed');
    score -= candidate.source === 'derived_instagram_handle' ? 40 : 18;
  }
  if (candidate.source === 'derived_instagram_handle') {
    const handleText = normalize(`${candidate.title} ${candidate.link}`);
    const matchedHandleTokens = tokensForMatching.filter((token) => handleText.includes(token)).length;
    if (matchedHandleTokens === 0) {
      flags.push('derived_handle_brand_not_confirmed');
      score -= 40;
    }
  }
  if (platform === 'instagram' && !canonicalInstagramProfileUrl(candidate.link)) {
    flags.push('instagram_profile_not_canonicalizable');
    score -= 35;
  }
  if (!text.includes(normalize(CITY))) flags.push('city_not_confirmed');

  if (/\b(cardapio|cardápio|menu|pedido|delivery|delivery online|peca|peça)\b/i.test(`${candidate.title} ${candidate.snippet}`)) {
    score += 12;
  }

  let tier = 'red';
  if (score >= 85 && isMenuPlatform(platform) && !flags.includes('city_not_confirmed') && !flags.includes('name_not_confirmed')) {
    tier = 'green';
  } else if (score >= 45 && platform !== 'ifood') {
    tier = 'yellow';
  }

  return {
    ...candidate,
    score,
    tier,
    flags,
  };
}

function chooseBest(candidates) {
  if (MODE === 'instagram') {
    const instagram = candidates.filter((candidate) => candidate.platform === 'instagram');
    if (instagram.length) {
      return instagram.slice().sort((a, b) => {
        const aProfileBonus = canonicalInstagramProfileUrl(a.link) ? 15 : 0;
        const bProfileBonus = canonicalInstagramProfileUrl(b.link) ? 15 : 0;
        return (b.score + bProfileBonus) - (a.score + aProfileBonus);
      })[0];
    }
  }
  const nonIfood = candidates.filter((candidate) => candidate.platform !== 'ifood');
  return (nonIfood.length ? nonIfood : candidates).slice().sort((a, b) => b.score - a.score)[0] || null;
}

function buildQuery(restaurant = {}) {
  if (QUERY) return QUERY;
  const name = clean(restaurant.google_maps_name || restaurant.name);
  const address = clean([restaurant.neighborhood, restaurant.address, restaurant.phone].filter(Boolean).join(' '));
  const terms = MODE === 'instagram'
    ? 'Instagram'
    : 'cardapio pedido delivery';
  return clean(`${name} ${address} ${CITY} ${STATE} ${terms}`);
}

async function fetchSerpApi(apiKey, query) {
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('google_domain', 'google.com.br');
  url.searchParams.set('gl', 'br');
  url.searchParams.set('hl', 'pt-br');
  url.searchParams.set('num', String(NUM_RESULTS));
  url.searchParams.set('api_key', apiKey);
  const response = await fetch(url);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`SerpApi returned non-JSON response: ${text.slice(0, 200)}`);
  }
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `SerpApi HTTP ${response.status}`);
  }
  return payload;
}

async function fetchSearchProvider(env, apiKey, query) {
  if (SEARCH_PROVIDER === 'serpapi') return fetchSerpApi(apiKey, query);
  const normalizedCity = CITY.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const locationCode =
    Number(env.DATAFORSEO_LOCATION_CODE || 0) ||
    (normalizedCity === 'joao pessoa' && STATE.toUpperCase() === 'PB' ? 1001622 : 0);
  return dataForSeoOrganicSearch(env, query, {
    numResults: NUM_RESULTS,
    timeoutMs: 60000,
    languageCode: 'pt',
    seDomain: 'google.com.br',
    locationCode,
  });
}

function candidatesFromPayload(payload) {
  const organic = Array.isArray(payload.organic_results) ? payload.organic_results : [];
  const local = Array.isArray(payload.local_results?.places) ? payload.local_results.places : [];
  const inline = Array.isArray(payload.inline_images) ? payload.inline_images : [];
  const links = [];
  for (const item of organic) {
    if (!item.link) continue;
    const base = {
      source: 'organic',
      position: item.position ?? null,
      title: clean(item.title),
      link: canonicalUrl(item.link),
      snippet: clean(item.snippet),
      displayedLink: clean(item.displayed_link),
    };
    links.push(base);
    if (detectPlatform(base.link) === 'instagram' && instagramPathKind(base.link) !== 'profile') {
      for (const handle of extractInstagramHandles(`${base.title} ${base.snippet}`)) {
        links.push({
          ...base,
          source: 'derived_instagram_handle',
          title: `Instagram profile @${handle}`,
          link: `https://instagram.com/${handle}`,
          displayedLink: 'derived from Google result',
        });
      }
    }
  }
  for (const item of local) {
    const link = item.website || item.link || item.place_id_search;
    if (!link) continue;
    links.push({
      source: 'local',
      position: item.position ?? null,
      title: clean(item.title),
      link: canonicalUrl(link),
      snippet: clean([item.type, item.address, item.phone].filter(Boolean).join(' | ')),
      displayedLink: clean(item.website || item.link),
    });
  }
  for (const item of inline) {
    const link = item.source || item.link;
    if (!link) continue;
    links.push({
      source: 'inline_image',
      position: item.position ?? null,
      title: clean(item.title),
      link: canonicalUrl(link),
      snippet: 'inline image source',
      displayedLink: '',
    });
  }
  const seen = new Set();
  return links
    .filter((candidate) => {
      const key = candidate.link.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((candidate) => ({
      ...candidate,
      platform: detectPlatform(candidate.link),
    }));
}

async function fetchTargets(supabase) {
  if (QUERY) {
    return [{ id: null, name: QUERY, google_maps_name: QUERY, synthetic: true }];
  }
  const ids = [...new Set([ONLY_ID, ...parseIdsFile(IDS_FILE)].filter(Boolean))];
  if (ids.length > 1) {
    const { data, error } = await supabase
      .from('restaurants')
      .select([
        'id',
        'name',
        'google_maps_name',
        'category',
        'address',
        'number',
        'neighborhood',
        'city',
        'state',
        'phone',
        'rating',
        'reviews_count',
        'other_url',
        'external_url',
        'other_url_label',
        'menu_status',
        'is_deleted',
      ].join(','))
      .in('id', ids)
      .eq('city', CITY)
      .eq('state', STATE)
      .or('is_deleted.eq.false,is_deleted.is.null');
    if (error) throw error;
    const order = new Map(ids.map((id, index) => [id, index]));
    return (data || [])
      .sort((left, right) => (order.get(left.id) ?? 999999) - (order.get(right.id) ?? 999999))
      .slice(0, LIMIT);
  }
  const rows = [];
  for (let from = 0; rows.length < LIMIT; from += 1000) {
    let query = supabase
      .from('restaurants')
      .select([
        'id',
        'name',
        'google_maps_name',
        'category',
        'address',
        'number',
        'neighborhood',
        'city',
        'state',
        'phone',
        'rating',
        'reviews_count',
        'other_url',
        'external_url',
        'other_url_label',
        'menu_status',
        'is_deleted',
      ].join(','))
      .eq('city', CITY)
      .eq('state', STATE)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .order('reviews_count', { ascending: false, nullsFirst: false })
      .range(from + TARGET_OFFSET, from + TARGET_OFFSET + 999);
    if (STATUS !== 'any') query = query.eq('menu_status', STATUS);
    if (ids.length === 1) query = query.eq('id', ids[0]);
    const { data, error } = await query;
    if (error) throw error;
    const filtered = ids.length > 1 ? (data || []).filter((row) => ids.includes(row.id)) : (data || []);
    rows.push(...filtered);
    if (!data || data.length < 1000 || ids.length) break;
  }
  return rows.slice(0, LIMIT);
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeOutputs(results) {
  const jsonlPath = path.join(OUT_DIR, 'results.jsonl');
  const summaryPath = path.join(OUT_DIR, 'summary.json');
  const csvPath = path.join(OUT_DIR, 'candidates.csv');
  fs.writeFileSync(jsonlPath, results.map((row) => JSON.stringify(row)).join('\n') + (results.length ? '\n' : ''), 'utf8');
  const flat = [];
  for (const row of results) {
    for (const candidate of row.candidates.slice(0, 8)) {
      flat.push({
        restaurant_id: row.restaurant?.id || '',
        restaurant_name: row.restaurant?.name || '',
        query: row.query,
        selected: row.best?.link === candidate.link ? 'yes' : '',
        tier: candidate.tier,
        score: candidate.score,
        platform: candidate.platform,
        source: candidate.source,
        title: candidate.title,
        link: candidate.link,
        flags: candidate.flags,
      });
    }
  }
  const headers = ['restaurant_id', 'restaurant_name', 'query', 'selected', 'tier', 'score', 'platform', 'source', 'title', 'link', 'flags'];
  fs.writeFileSync(csvPath, [
    headers.join(';'),
    ...flat.map((row) => headers.map((header) => csvEscape(row[header])).join(';')),
  ].join('\n'), 'utf8');

  const summary = {
    runId: RUN_ID,
    city: CITY,
    state: STATE,
    mode: MODE,
    searchProvider: SEARCH_PROVIDER,
    apply: APPLY,
    offset: TARGET_OFFSET,
    delayMs: DELAY_MS,
    complete: false,
    processed: results.length,
    foundGreen: results.filter((row) => row.best?.tier === 'green').length,
    foundYellow: results.filter((row) => row.best?.tier === 'yellow').length,
    foundRedOrNone: results.filter((row) => !row.best || row.best?.tier === 'red').length,
    byPlatform: results.reduce((acc, row) => {
      const platform = row.best?.platform || 'none';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {}),
    files: { jsonlPath, summaryPath, csvPath },
    results: results.map((row) => ({
      restaurant: row.restaurant,
      query: row.query,
      best: row.best,
      candidateCount: row.candidates.length,
    })),
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  return summary;
}

async function main() {
  const projectRoot = findProjectRoot();
  const envPath = path.join(projectRoot, '.env');
  const env = parseEnvFile(envPath);
  ensureProviderCredentials(env, SEARCH_PROVIDER);
  const apiKey = SEARCH_PROVIDER === 'serpapi'
    ? (env.SERPAPI_API_KEY || env.VITE_SERPAPI_API_KEY)
    : null;

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY;
  if (!QUERY && (!supabaseUrl || !supabaseKey)) throw new Error('Missing Supabase env for restaurant mode.');
  const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

  const targets = await fetchTargets(supabase);
  const results = [];
  for (const [index, restaurant] of targets.entries()) {
    const query = buildQuery(restaurant);
    const payload = await fetchSearchProvider(env, apiKey, query);
    const candidates = candidatesFromPayload(payload)
      .map((candidate) => scoreCandidate(candidate, restaurant))
      .sort((a, b) => b.score - a.score);
    const best = chooseBest(candidates);
    results.push({
      restaurant: {
        id: restaurant.id,
        name: clean(restaurant.google_maps_name || restaurant.name),
        category: restaurant.category || null,
        address: clean([restaurant.address, restaurant.number].filter(Boolean).join(', ')),
        neighborhood: restaurant.neighborhood || null,
        rating: restaurant.rating ?? null,
        reviews_count: restaurant.reviews_count ?? null,
      },
      query,
      status: best?.tier === 'green'
        ? `${SEARCH_PROVIDER}_menu_source_found`
        : best?.tier === 'yellow'
          ? `${SEARCH_PROVIDER}_possible_source_needs_review`
          : `${SEARCH_PROVIDER}_no_reliable_source`,
      best,
      candidates,
      searchMetadata: {
        provider: SEARCH_PROVIDER,
        id: payload.search_metadata?.id || null,
        status: payload.search_metadata?.status || null,
        totalTimeTaken: payload.search_metadata?.total_time_taken || null,
        cost: payload.search_metadata?.cost ?? null,
      },
    });
    console.log(JSON.stringify({
      restaurant: restaurant.google_maps_name || restaurant.name,
      query,
      status: results.at(-1).status,
      best: best ? {
        platform: best.platform,
        tier: best.tier,
        score: best.score,
        title: best.title,
        link: best.link,
        flags: best.flags,
      } : null,
    }));
    const partialSummary = writeOutputs(results);
    fs.writeFileSync(path.join(OUT_DIR, 'progress.json'), JSON.stringify({
      runId: RUN_ID,
      outDir: OUT_DIR,
      complete: false,
      processed: results.length,
      totalTargets: targets.length,
      offset: TARGET_OFFSET,
      lastRestaurant: restaurant.google_maps_name || restaurant.name,
      files: partialSummary.files,
      updatedAt: new Date().toISOString(),
    }, null, 2), 'utf8');
    if (DELAY_MS > 0 && index < targets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  const summary = writeOutputs(results);
  summary.complete = true;
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'progress.json'), JSON.stringify({
    runId: RUN_ID,
    outDir: OUT_DIR,
    complete: true,
    processed: results.length,
    totalTargets: targets.length,
    offset: TARGET_OFFSET,
    updatedAt: new Date().toISOString(),
    files: summary.files,
  }, null, 2), 'utf8');
  console.log(JSON.stringify({
    success: true,
    runId: RUN_ID,
    outDir: OUT_DIR,
    processed: summary.processed,
    foundGreen: summary.foundGreen,
    foundYellow: summary.foundYellow,
    foundRedOrNone: summary.foundRedOrNone,
    byPlatform: summary.byPlatform,
    files: summary.files,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error.message || String(error),
    outDir: OUT_DIR,
  }, null, 2));
  process.exitCode = 1;
});
