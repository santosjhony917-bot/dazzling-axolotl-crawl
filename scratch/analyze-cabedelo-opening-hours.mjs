import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  dataForSeoMapsSearch,
  ensureProviderCredentials,
} from './search-provider.mjs';

const CITY = 'Cabedelo';
const STATE = 'PB';
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const ROOT = path.join('scratch', `${SEARCH_PROVIDER}-google-maps-phase1`);
const FETCH_DETAILS = Math.max(0, Math.min(Number(argValue('--fetch-details', '0')) || 0, 25));
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join(ROOT, `hours-analysis-${RUN_ID}`);

function argValue(name, fallback = '') {
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
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

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function selectAll(queryFactory, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function loadRawByPlaceId() {
  const byPlaceId = new Map();
  if (!fs.existsSync(ROOT)) return byPlaceId;
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{4}-/.test(entry.name)) continue;
    const runDir = path.join(ROOT, entry.name);
    for (const file of fs.readdirSync(runDir).filter((name) => /^raw-\d+\.json$/.test(name))) {
      let raw;
      try {
        raw = JSON.parse(fs.readFileSync(path.join(runDir, file), 'utf8'));
      } catch {
        continue;
      }
      for (const result of raw.local_results || []) {
        if (!result.place_id) continue;
        byPlaceId.set(result.place_id, { result, runId: entry.name, file });
      }
    }
  }
  return byPlaceId;
}

function categoryCounts(rows) {
  return Object.entries(rows.reduce((acc, row) => {
    const key = row.category || 'Sem categoria';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
}

function reviewBucket(row) {
  const reviews = Number(row.reviews_count);
  if (!Number.isFinite(reviews)) return 'sem_avaliacoes';
  if (reviews === 0) return '0';
  if (reviews <= 5) return '1-5';
  if (reviews <= 20) return '6-20';
  if (reviews <= 100) return '21-100';
  if (reviews <= 500) return '101-500';
  return '501+';
}

function bucketCounts(rows) {
  return Object.entries(rows.reduce((acc, row) => {
    const key = reviewBucket(row);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => a[0].localeCompare(b[0]));
}

async function fetchPlaceDetails(env, apiKey, row) {
  if (SEARCH_PROVIDER !== 'serpapi') {
    const payload = await dataForSeoMapsSearch(env, {
      query: clean(row.google_maps_name || row.name),
      lat: Number(row.latitude) || -6.9875,
      lng: Number(row.longitude) || -34.8389,
      zoom: 17,
      area: clean(row.neighborhood || row.address || CITY),
    }, {
      timeoutMs: 60000,
      depth: 20,
      languageCode: 'pt',
      seDomain: 'google.com.br',
      tag: `hours-analysis/${row.id}`,
    });
    const match = (payload.local_results || []).find((item) => item.place_id === row.google_place_id)
      || payload.local_results?.[0]
      || {};
    return {
      search_metadata: payload.search_metadata,
      local_results: payload.local_results,
      place_results: match,
      raw_dataforseo: payload.raw_dataforseo,
    };
  }

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_maps');
  url.searchParams.set('place_id', row.google_place_id);
  url.searchParams.set('google_domain', 'google.com.br');
  url.searchParams.set('hl', 'pt');
  url.searchParams.set('gl', 'br');
  url.searchParams.set('api_key', apiKey);
  const response = await fetch(url);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `SerpApi HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return payload;
}

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const rows = await selectAll(() => supabase
  .from('restaurants')
  .select('id,name,google_maps_name,category,address,number,neighborhood,phone,rating,reviews_count,opening_hours,google_place_id,google_maps_url,latitude,longitude,coleta_logs,is_deleted')
  .eq('city', CITY)
  .eq('state', STATE)
  .eq('is_deleted', false)
  .order('reviews_count', { ascending: false, nullsFirst: false }));

const rawByPlaceId = loadRawByPlaceId();
const withHours = rows.filter((row) => row.opening_hours);
const missing = rows.filter((row) => !row.opening_hours);

const missingDetails = missing.map((row) => {
  const raw = row.google_place_id ? rawByPlaceId.get(row.google_place_id)?.result : null;
  const logs = parseJson(row.coleta_logs);
  const backfill = logs[`phase1_${SEARCH_PROVIDER}_google_maps_backfill_v1`]
    || logs.phase1_serpapi_google_maps_backfill_v1
    || logs.phase1_dataforseo_google_maps_backfill_v1
    || {};
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    rating: row.rating,
    reviews_count: row.reviews_count,
    phone: row.phone,
    address: clean([row.address, row.number, row.neighborhood].filter(Boolean).join(', ')),
    place_id: row.google_place_id,
    raw_has_operating_hours: Boolean(raw?.operating_hours),
    raw_hours: clean(raw?.hours || raw?.open_state || ''),
    raw_unclaimed_listing: raw?.unclaimed_listing === true,
    backfill_has_operating_hours: backfill.has_operating_hours === true,
    backfill_hours_source: clean(backfill.hours_source || ''),
  };
});

const rawMissingKinds = Object.entries(missingDetails.reduce((acc, row) => {
  const key = row.raw_has_operating_hours
    ? 'raw_has_operating_hours_but_db_missing'
    : row.raw_hours
      ? 'raw_has_only_open_state_or_text'
      : 'raw_has_no_hours_signal';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {})).sort((a, b) => b[1] - a[1]);

const detailChecks = [];
if (FETCH_DETAILS > 0) {
  ensureProviderCredentials(env, SEARCH_PROVIDER);
  const apiKey = SEARCH_PROVIDER === 'serpapi'
    ? (env.SERPAPI_API_KEY || env.VITE_SERPAPI_API_KEY)
    : null;
  const targets = missing
    .filter((row) => row.google_place_id)
    .sort((a, b) => Number(b.reviews_count || 0) - Number(a.reviews_count || 0))
    .slice(0, FETCH_DETAILS);
  for (const row of targets) {
    try {
      const payload = await fetchPlaceDetails(env, apiKey, row);
      const place = payload.place_results || payload.local_results?.[0] || payload;
      detailChecks.push({
        id: row.id,
        name: row.name,
        place_id: row.google_place_id,
        detail_has_operating_hours: Boolean(place.operating_hours),
        detail_hours: clean(place.hours || place.open_state || ''),
        detail_status: payload.search_metadata?.status || null,
        detail_keys: Object.keys(place).slice(0, 80),
      });
    } catch (error) {
      detailChecks.push({
        id: row.id,
        name: row.name,
        place_id: row.google_place_id,
        error: error.message || String(error),
      });
    }
  }
}

const report = {
  city: CITY,
  state: STATE,
  searchProvider: SEARCH_PROVIDER,
  activeRows: rows.length,
  withOpeningHours: withHours.length,
  missingOpeningHours: missing.length,
  coveragePercent: rows.length ? Number(((withHours.length / rows.length) * 100).toFixed(1)) : 0,
  missingByCategory: categoryCounts(missing),
  missingByReviewBucket: bucketCounts(missing),
  rawMissingKinds,
  missingSamples: missingDetails.slice(0, 40),
  detailChecks,
  likelyExplanation: [
    `A coleta de Fase 1 usou ${SEARCH_PROVIDER} Google Maps/local_results, que nem sempre retorna operating_hours em todo resultado.`,
    'Alguns estabelecimentos realmente nao possuem horario cadastrado/publico no Google Maps, especialmente leads pequenos, delivery, barraca, acai, lanchonete e registros com pouca avaliacao.',
    'Quando o resultado bruto tem apenas hours/open_state, ele informa estado atual ou resumo, mas nao uma tabela semanal segura para opening_hours.',
    'Se o endpoint detalhado por place_id retornar operating_hours para parte dos faltantes, a solucao e rodar uma segunda etapa de enriquecimento somente para os faltantes.',
  ],
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
