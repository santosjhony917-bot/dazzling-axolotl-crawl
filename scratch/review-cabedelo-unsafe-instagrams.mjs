import fs from 'node:fs';
import path from 'node:path';
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

const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
const REVIEW_FILE = argValue(
  '--review-file',
  path.join('scratch', 'cabedelo-instagram-unsafe-review', '2026-07-06T21-34-26-304Z', 'review-queue.json'),
);
const PREVIOUS_REFINED = argValue(
  '--previous-refined',
  path.join('scratch', 'cabedelo-instagram-targeted-refine', '2026-07-06T21-52-21-442Z', 'refined.json'),
);
const LIMIT = Number(argValue('--limit', '0')) || 0;
const DELAY_MS = Number(argValue('--delay-ms', '0')) || 0;
const APPLY = hasFlag('--apply');
const FORCE_API = hasFlag('--force-api');
const DRY_RUN = !APPLY;
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const OUT_DIR = path.join('scratch', 'cabedelo-instagram-unsafe-review', `${SEARCH_PROVIDER}-targeted-${RUN_ID}`);
const PROVIDER_LOG_KEY = `${SEARCH_PROVIDER}_instagram_unsafe_review`;

const STOP_TOKENS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no',
  'cabedelo', 'pb', 'paraiba', 'brasil', 'intermares', 'ponta', 'campina',
  'centro', 'poco', 'poço', 'camboinha', 'jacare', 'jacaré', 'renascer',
  'formosa', 'vila', 'sao', 'são', 'joao', 'joão', 'areia', 'dourada',
  'praia', 'beach', 'por', 'sol', 'restaurante', 'restaurant', 'bar',
  'lanchonete', 'pizzaria', 'pizza', 'hamburgueria', 'burger', 'cafeteria',
  'bistro', 'delivery', 'pedido', 'cardapio', 'cardápio', 'menu', 'oficial',
  'online', 'loja', 'unidade', 'sushi', 'temaki', 'temakeria', 'acai', 'açai',
  'acaiteria', 'sorveteria', 'gelato', 'churrascaria', 'galeteria',
  'tapiocaria', 'pastel', 'pastelaria', 'espetinho', 'lanches', 'lanche',
  'massas', 'pizzas', 'caldinho', 'comida', 'rua', 'lote', 'express',
  'premium', 'gourmet', 'self', 'service',
]);

const WEAK_SINGLE_TOKENS = new Set([
  'casa', 'sabor', 'cantinho', 'bom', 'melhor', 'popular', 'prime', 'familia',
  'family', 'brasil', 'food', 'hall', 'porto', 'rainha', 'paulista',
]);

const HARD_LOCATION_CONFLICTS = [
  'sao paulo, sp', 'sao paulo sp', 'rio de janeiro, rj', 'rio de janeiro rj',
  'recife, pe', 'recife pe', 'natal, rn', 'natal rn', 'fortaleza, ce',
  'fortaleza ce', 'maceio, al', 'maceio al', 'salvador, ba', 'salvador ba',
  'brasilia, df', 'brasilia df', 'curitiba, pr', 'curitiba pr', 'caico, rn',
  'caico rn', 'manaus, am', 'manaus am', 'viamao, rs', 'viamão, rs',
  'blumenau, sc', 'florianopolis, sc', 'florianópolis, sc', 'campinas, sp',
  'ico-ce', 'ico ce', 'icó-ce', 'icó ce', 'marica, rj', 'maricá, rj',
  'marica rj', 'maricá rj', 'guarus', 'barcelos', 'meier', 'méier',
  'jacarepagua', 'jacarepaguá',
];

const NEARBY_UNIT_CONFLICTS = [
  'bessa',
  'manaira',
  'manaíra',
  'tambau',
  'tambaú',
  'altiplano',
  'ruy carneiro',
];

const OUT_OF_SCOPE_PATTERNS = [
  /\bobra\b/i,
  /\bfest(?:a|ival)?\b/i,
  /\bfest\s*ver[aã]o\b/i,
  /\bshopping\b/i,
  /\bmall\b/i,
  /\bmarina\b/i,
  /\bctg\b/i,
  /\bcentro\s+de\s+tradi/i,
  /^rua\s/i,
];

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

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

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mergeLogs(value, patch) {
  return JSON.stringify({ ...parseJson(value), ...patch });
}

function parseUrl(value) {
  try {
    return new URL(clean(value));
  } catch {
    return null;
  }
}

function instagramHandleFromUrl(value) {
  const url = parseUrl(value);
  if (!url || !url.hostname.toLowerCase().includes('instagram.com')) return '';
  const first = url.pathname.split('/').filter(Boolean)[0] || '';
  if (!first || ['p', 'reel', 'stories', 'explore', 'tv'].includes(first.toLowerCase())) return '';
  return first.toLowerCase();
}

function canonicalInstagramProfileUrl(value) {
  const handle = instagramHandleFromUrl(value);
  return handle ? `https://instagram.com/${handle}` : '';
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function nationalPhoneDigits(value) {
  let digits = onlyDigits(value);
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

function formatBrazilPhone(digitsValue) {
  let digits = onlyDigits(digitsValue);
  if (digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return '';
}

function extractPhones(text) {
  const phones = new Set();
  const source = clean(text);
  for (const match of source.matchAll(/(?:\+?55\s*)?\(?\b([1-9]{2})\)?[\s.-]*(9?\d{4})\s*[-.]?\s*(\d{4})\b/g)) {
    const formatted = formatBrazilPhone(`${match[1]}${match[2]}${match[3]}`);
    if (formatted) phones.add(formatted);
  }
  for (const match of source.matchAll(/(?:phone=|wa\.me\/|api\.whatsapp\.com\/send\?phone=)(55\d{10,11})/gi)) {
    const formatted = formatBrazilPhone(match[1]);
    if (formatted) phones.add(formatted);
  }
  return [...phones];
}

function distinctiveTokens(name) {
  return normalize(name)
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP_TOKENS.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

function locationPhrases(row = {}) {
  const phrases = new Set();
  const roadWords = new Set(['r', 'rua', 'av', 'avenida', 'travessa', 'tv', 'praca', 'praça', 'rodovia', 'br', 'estrada', 'lote', 'loja', 'numero']);
  for (const raw of [row.neighborhood, row.address].filter(Boolean)) {
    const tokens = normalize(raw)
      .replace(/[.,;:()]/g, ' ')
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z0-9]/g, ''))
      .filter((token) => token.length >= 3)
      .filter((token) => !roadWords.has(token));
    if (tokens.length >= 2) phrases.add(tokens.join(' '));
    for (let index = 0; index < tokens.length - 1; index += 1) {
      phrases.add(`${tokens[index]} ${tokens[index + 1]}`);
    }
  }
  return [...phrases].filter((phrase) => phrase.length >= 7);
}

function flattenReviewQueue(review) {
  const buckets = review.buckets || {};
  return Object.entries(buckets).flatMap(([bucket, items]) => (
    Array.isArray(items) ? items.map((item) => ({ ...item, bucket })) : []
  ));
}

function loadPreviousRefined() {
  if (!PREVIOUS_REFINED || FORCE_API || !fs.existsSync(PREVIOUS_REFINED)) return new Map();
  const data = JSON.parse(fs.readFileSync(PREVIOUS_REFINED, 'utf8'));
  return new Map((data.items || []).map((item) => [item.id, item]));
}

async function fetchRestaurants(supabase, ids) {
  const out = new Map();
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,neighborhood,address,city,state,phone,whatsapp_url,instagram,social_networks,coleta_logs,is_deleted,reviews_count,rating')
      .in('id', chunk);
    if (error) throw error;
    for (const row of data || []) out.set(row.id, row);
  }
  return out;
}

function buildQueries(item, row) {
  const name = clean(row?.google_maps_name || row?.name || item.name);
  const handle = instagramHandleFromUrl(item.url || '');
  const neighborhood = clean(row?.neighborhood || item.neighborhood || '');
  const phone = clean(row?.phone || item.phone || '');
  const queries = new Set();
  if (handle) queries.add(`${name} ${handle} ${CITY} Instagram`);
  queries.add(`${name} ${CITY} ${STATE} Instagram`);
  if (neighborhood) queries.add(`${name} ${neighborhood} ${CITY} Instagram`);
  if (phone) queries.add(`${name} ${phone} Instagram`);
  return [...queries].slice(0, 1);
}

async function fetchSerpApi(apiKey, query) {
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('google_domain', 'google.com.br');
  url.searchParams.set('gl', 'br');
  url.searchParams.set('hl', 'pt-br');
  url.searchParams.set('num', '10');
  url.searchParams.set('api_key', apiKey);
  const response = await fetch(url);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`SerpApi returned non-JSON response: ${text.slice(0, 200)}`);
  }
  if (!response.ok || payload.error) throw new Error(payload.error || `SerpApi HTTP ${response.status}`);
  return payload;
}

async function fetchSearchProvider(env, apiKey, query) {
  if (SEARCH_PROVIDER === 'serpapi') return fetchSerpApi(apiKey, query);
  return dataForSeoOrganicSearch(env, query, {
    numResults: 10,
    timeoutMs: 60000,
    languageCode: 'pt',
    seDomain: 'google.com.br',
    locationName: `${CITY}, Paraiba, Brazil`,
  });
}

function organicEntries(payload) {
  return [
    ...(Array.isArray(payload.organic_results) ? payload.organic_results : []),
    ...(Array.isArray(payload.local_results?.places) ? payload.local_results.places : []),
  ].map((item) => ({
    title: clean(item.title),
    snippet: clean([item.snippet, item.type, item.address, item.phone].filter(Boolean).join(' | ')),
    link: clean(item.link || item.website || item.place_id_search || ''),
    displayedLink: clean(item.displayed_link || item.website || ''),
  })).filter((item) => item.link || item.title || item.snippet);
}

function groupedInstagramCandidates(payloads, originalUrl) {
  const byHandle = new Map();
  const add = (handle, entry) => {
    if (!handle) return;
    if (!byHandle.has(handle)) byHandle.set(handle, []);
    byHandle.get(handle).push(entry);
  };
  if (originalUrl) {
    const handle = instagramHandleFromUrl(originalUrl);
    if (handle) add(handle, { title: '', snippet: '', link: `https://instagram.com/${handle}`, displayedLink: '', synthetic: true });
  }
  for (const payload of payloads) {
    for (const entry of organicEntries(payload)) {
      const handle = instagramHandleFromUrl(entry.link);
      if (handle) add(handle, entry);
      for (const match of `${entry.title} ${entry.snippet}`.matchAll(/@([a-zA-Z0-9._]{2,30})/g)) {
        add(match[1].toLowerCase().replace(/[._]+$/g, ''), {
          ...entry,
          link: `https://instagram.com/${match[1].toLowerCase().replace(/[._]+$/g, '')}`,
          derived: true,
        });
      }
    }
  }
  return [...byHandle.entries()].map(([handle, entries]) => ({
    handle,
    url: `https://instagram.com/${handle}`,
    entries,
    evidenceText: clean(entries.map((entry) => `${entry.title} ${entry.snippet} ${entry.link}`).join(' | ')),
  }));
}

function scoreCandidate(candidate, item, row) {
  const name = row?.name || item.name || '';
  const tokens = distinctiveTokens(name);
  const text = normalize(candidate.evidenceText);
  const handle = normalize(candidate.handle);
  const handleMatches = tokens.filter((token) => handle.includes(token));
  const textMatches = tokens.filter((token) => text.includes(token));
  const cityConfirmed = text.includes(normalize(CITY));
  const stateConfirmed = text.includes(normalize(STATE));
  let neighborhood = normalize(row?.neighborhood || item.neighborhood || '');
  if (neighborhood === normalize(CITY) || neighborhood === normalize(STATE) || STOP_TOKENS.has(neighborhood)) {
    neighborhood = '';
  }
  const neighborhoodConfirmed = Boolean(neighborhood && neighborhood.length >= 4 && text.includes(neighborhood));
  const phraseMatches = locationPhrases(row || item).filter((phrase) => text.includes(phrase));
  const phones = extractPhones(candidate.evidenceText);
  const existingPhone = nationalPhoneDigits(row?.phone || item.phone || '');
  const exactPhone = Boolean(existingPhone && phones.some((phone) => nationalPhoneDigits(phone) === existingPhone));
  const ddd83 = phones.some((phone) => nationalPhoneDigits(phone).startsWith('83'));
  const conflicts = HARD_LOCATION_CONFLICTS.filter((pattern) => text.includes(normalize(pattern)));
  const nearbyConflicts = NEARBY_UNIT_CONFLICTS.filter((pattern) => text.includes(normalize(pattern)));
  const title = clean(candidate.entries.find((entry) => entry.title)?.title || candidate.handle);
  const categoryText = `${name} ${row?.category || item.category || ''} ${title} ${candidate.evidenceText}`;
  const outOfScope = OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(categoryText));
  const hasWeakSingleToken = tokens.length === 1 && WEAK_SINGLE_TOKENS.has(tokens[0]);
  const strongBrand = handleMatches.length >= 2
    || handleMatches.some((token) => token.length >= 5 && !hasWeakSingleToken)
    || textMatches.length >= 2
    || (tokens.length === 1 && tokens[0].length >= 6 && handleMatches.length === 1 && !hasWeakSingleToken);
  const locationSupported = cityConfirmed || neighborhoodConfirmed || phraseMatches.length > 0 || exactPhone;
  let score = 40;
  score += handleMatches.length * 32;
  score += Math.min(24, textMatches.length * 8);
  if (cityConfirmed) score += 18;
  if (stateConfirmed) score += 6;
  if (neighborhoodConfirmed) score += 16;
  if (phraseMatches.length) score += 18;
  if (exactPhone) score += 40;
  else if (ddd83) score += 6;
  if (!strongBrand) score -= 55;
  if (hasWeakSingleToken) score -= 20;
  if (conflicts.length && !cityConfirmed && !exactPhone) score -= 80;
  if (nearbyConflicts.length && !exactPhone && !phraseMatches.length && !neighborhoodConfirmed) score -= 55;
  if (outOfScope) score -= 100;

  let decision = 'hold';
  const reasons = [];
  if (outOfScope) reasons.push('out_of_scope');
  if (!strongBrand) reasons.push('brand_not_confirmed');
  if (!locationSupported) reasons.push('no_location_or_phone_support');
  if (conflicts.length && !cityConfirmed && !exactPhone) reasons.push(`location_conflict:${conflicts.join('|')}`);
  if (nearbyConflicts.length && !exactPhone && !phraseMatches.length && !neighborhoodConfirmed) {
    reasons.push(`nearby_unit_conflict:${nearbyConflicts.join('|')}`);
  }
  if (score >= 95 && strongBrand && locationSupported && !outOfScope && !(conflicts.length && !cityConfirmed && !exactPhone)) {
    decision = 'approve';
  } else if (score < 55 || outOfScope || !strongBrand) {
    decision = 'reject';
  }
  if (nearbyConflicts.length && !exactPhone && !phraseMatches.length && !neighborhoodConfirmed) {
    decision = 'hold';
  }

  return {
    decision,
    score,
    reasons,
    url: candidate.url,
    handle: candidate.handle,
    title,
    tokens,
    handleMatches,
    textMatches,
    cityConfirmed,
    stateConfirmed,
    neighborhoodConfirmed,
    phraseMatches,
    phones,
    exactPhone,
    ddd83,
    conflicts,
    nearbyConflicts,
    outOfScope,
    evidenceSample: candidate.evidenceText.slice(0, 1200),
  };
}

function socialNetworksWithInstagram(current, url, metadata) {
  const list = Array.isArray(current) ? current : [];
  return [
    ...list.filter((item) => item?.platform !== 'instagram'),
    {
      platform: 'instagram',
      url,
      source: `${SEARCH_PROVIDER}_targeted_unsafe_review`,
      confidence: metadata.score,
      collected_at: new Date().toISOString(),
      title: metadata.title,
    },
  ];
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const review = JSON.parse(fs.readFileSync(REVIEW_FILE, 'utf8'));
  const queue = flattenReviewQueue(review);
  const previous = loadPreviousRefined();
  const env = readEnv();
  if (FORCE_API || !previous.size) ensureProviderCredentials(env, SEARCH_PROVIDER);
  const apiKey = SEARCH_PROVIDER === 'serpapi'
    ? (env.SERPAPI_API_KEY || env.VITE_SERPAPI_API_KEY)
    : null;
  const supabase = createClient(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const ids = queue.map((item) => item.id).filter(Boolean);
  const restaurantById = await fetchRestaurants(supabase, ids);
  const targets = queue
    .map((item) => ({ item, row: restaurantById.get(item.id) }))
    .filter(({ row }) => row && !row.is_deleted && !clean(row.instagram))
    .slice(0, LIMIT || undefined);

  const items = [];
  let apiCalls = 0;
  for (let index = 0; index < targets.length; index += 1) {
    const { item, row } = targets[index];
    const previousItem = previous.get(item.id);
    const payloads = [];
    const queries = buildQueries(item, row);
    let source = 'api';
    if (previousItem && !FORCE_API) {
      source = 'previous_refined';
      payloads.push({
        organic_results: [{
          title: previousItem.title,
          snippet: previousItem.snippet,
          link: previousItem.url,
          displayed_link: previousItem.url,
        }],
      });
    } else {
      for (const query of queries) {
        if (DELAY_MS) await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        try {
          payloads.push(await fetchSearchProvider(env, apiKey, query));
          apiCalls += 1;
        } catch (error) {
          items.push({
            id: item.id,
            name: row.name,
            bucket: item.bucket,
            status: 'error',
            error: error.message,
            queries,
          });
          continue;
        }
      }
    }
    const candidates = groupedInstagramCandidates(payloads, item.url)
      .map((candidate) => scoreCandidate(candidate, item, row))
      .sort((a, b) => b.score - a.score);
    const best = candidates[0] || null;
    const status = best?.decision || 'reject';
    items.push({
      id: item.id,
      name: row.name,
      category: row.category || item.category || null,
      neighborhood: row.neighborhood || item.neighborhood || null,
      reviews_count: row.reviews_count ?? item.reviews_count ?? null,
      rating: row.rating ?? item.rating ?? null,
      bucket: item.bucket,
      previousReason: item.reason,
      previousScore: item.score,
      previousUrl: item.url || null,
      status,
      best,
      candidates: candidates.slice(0, 5),
      queries,
      source,
    });
    console.log(`${index + 1}/${targets.length} ${status.padEnd(7)} ${row.name} ${best?.url || ''} ${best?.score ?? ''}`);
  }

  const updates = [];
  const failures = [];
  if (APPLY) {
    for (const item of items.filter((entry) => entry.status === 'approve')) {
      const row = restaurantById.get(item.id);
      if (!row || row.instagram) continue;
      const update = {
        instagram: item.best.url,
        social_networks: socialNetworksWithInstagram(row.social_networks, item.best.url, {
          score: item.best.score,
          title: item.best.title,
        }),
        coleta_logs: mergeLogs(row.coleta_logs, {
          [PROVIDER_LOG_KEY]: {
            appliedAt: new Date().toISOString(),
            source: `google_${SEARCH_PROVIDER}_targeted_unsafe_review`,
            instagram: item.best.url,
            score: item.best.score,
            title: item.best.title,
            evidenceSample: item.best.evidenceSample,
            queries: item.queries,
            previousReason: item.previousReason,
            previousScore: item.previousScore,
          },
        }),
      };
      const { error } = await supabase
        .from('restaurants')
        .update(update)
        .eq('id', row.id)
        .eq('city', CITY)
        .eq('state', STATE);
      if (error) failures.push({ id: row.id, name: row.name, error: error.message });
      else updates.push({ id: row.id, name: row.name, instagram: item.best.url, score: item.best.score });
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    city: CITY,
    state: STATE,
    searchProvider: SEARCH_PROVIDER,
    reviewFile: REVIEW_FILE,
    previousRefined: fs.existsSync(PREVIOUS_REFINED) ? PREVIOUS_REFINED : null,
    totalUnsafeOriginal: queue.length,
    remainingWithoutInstagramReviewed: targets.length,
    apiCalls,
    counts: items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}),
    approved: items.filter((item) => item.status === 'approve').map((item) => ({
      id: item.id,
      name: item.name,
      instagram: item.best.url,
      score: item.best.score,
      title: item.best.title,
      evidence: item.best.evidenceSample.slice(0, 280),
    })),
    applied: updates,
    failures,
    outDir: OUT_DIR,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'review.json'), JSON.stringify({ summary, items }, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

await main();
