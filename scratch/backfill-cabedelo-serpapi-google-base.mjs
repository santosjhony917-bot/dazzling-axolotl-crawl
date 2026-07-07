import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const CITY = 'Cabedelo';
const STATE = 'PB';
const ROOT = path.join('scratch', 'serpapi-google-maps-phase1');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join(ROOT, `backfill-${RUN_ID}`);

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function parseJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function parseLogs(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mergeLogs(value, patch) {
  return JSON.stringify({ ...parseLogs(value), ...patch });
}

function canonicalUrl(result) {
  if (result.place_id) return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(result.place_id)}`;
  return result.link || '';
}

function keyForPlace(value) {
  return clean(value).toLowerCase().replace(/[?#].*$/, '');
}

function whatsappFromPhone(phone) {
  let digits = onlyDigits(phone);
  if (!digits) return null;
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  return digits.length >= 12 ? `https://wa.me/${digits}` : null;
}

function parseGoogleMapsAddress(fullAddress) {
  let street = '';
  let number = '';
  let neighborhood = '';
  let city = '';
  let state = '';
  let cep = '';
  if (!fullAddress) return { street, number, neighborhood, city, state, cep };

  let working = String(fullAddress).replace(/\s+/g, ' ').trim();
  working = working
    .replace(/\s*,?\s*(?:Brazil|Brasil)\s*[;,.]*\s*$/i, '')
    .replace(/^[^\p{L}\d]*(?=(?:R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|Praça|Praca|Alameda|Estrada|\d))/iu, '')
    .trim();
  const cepMatch = working.match(/\b(\d{5}-\d{3})\b/) || working.match(/\b(\d{8})\b/);
  if (cepMatch) {
    cep = cepMatch[1];
    working = working.replace(cepMatch[0], '').trim();
  }
  working = working.replace(/[,\s-]+$/g, '').trim();
  const stateMatch = working.match(/[\s,-]\s*([A-Z]{2})\s*$/);
  if (stateMatch) {
    state = stateMatch[1];
    working = working.substring(0, working.lastIndexOf(stateMatch[0])).trim();
  }
  working = working.replace(/[,\s-]+$/g, '').trim();
  working = working.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  const parts = working.split(',').map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 3) {
    street = parts[0];
    const second = parts[1];
    const hyphen = second.indexOf(' - ');
    if (hyphen !== -1) {
      const before = second.slice(0, hyphen).trim();
      const after = second.slice(hyphen + 3).trim();
      if (/\d/.test(before) || normalize(before) === 's/n') {
        number = before;
        neighborhood = after;
      } else {
        street += `, ${second}`;
      }
    } else if (/^\d+/.test(second) || normalize(second) === 's/n') {
      number = second;
    } else {
      neighborhood = second;
    }
    const rest = parts.slice(2).join(', ').trim();
    const restHyphen = rest.indexOf(' - ');
    if (restHyphen !== -1 && !neighborhood) {
      neighborhood = rest.slice(0, restHyphen).trim();
      city = rest.slice(restHyphen + 3).trim();
    } else {
      city = rest;
    }
  } else if (parts.length === 2) {
    street = parts[0];
    const second = parts[1];
    const hyphen = second.indexOf(' - ');
    if (hyphen !== -1) {
      neighborhood = second.slice(0, hyphen).trim();
      city = second.slice(hyphen + 3).trim();
    } else {
      city = second;
    }
    const numInStreet = street.match(/,\s*(\d+[A-Za-z]?)\s*$/);
    if (numInStreet) {
      number = numInStreet[1];
      street = street.substring(0, street.lastIndexOf(numInStreet[0])).trim();
    }
  } else {
    street = working;
  }

  return { street, number, neighborhood, city, state, cep };
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

function loadSerpapiResults() {
  const byPlace = new Map();
  const byUrl = new Map();
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{4}-/.test(entry.name)) continue;
    const runDir = path.join(ROOT, entry.name);
    for (const file of fs.readdirSync(runDir).filter((name) => /^raw-\d+\.json$/.test(name))) {
      const raw = parseJsonFile(path.join(runDir, file));
      for (const result of raw?.local_results || []) {
        const record = { result, runId: entry.name, file };
        if (result.place_id) byPlace.set(String(result.place_id), record);
        const url = canonicalUrl(result);
        if (url) byUrl.set(keyForPlace(url), record);
      }
    }
  }
  return { byPlace, byUrl };
}

function buildUpdate(row, record) {
  const result = record.result;
  const address = clean(result.address || '');
  const parsed = parseGoogleMapsAddress(address);
  const phone = clean(result.phone || '');
  const rating = result.rating == null ? null : Number(result.rating);
  const reviewsCount = result.reviews ?? result.reviews_original ?? null;
  const coords = result.gps_coordinates || {};
  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);
  const sourceCategory = clean(result.type || (Array.isArray(result.types) ? result.types.join(', ') : result.types) || '');

  const update = {
    google_maps_name: clean(result.title || result.name || row.google_maps_name || row.name),
    category: sourceCategory || row.category,
    phone: phone || row.phone || null,
    whatsapp_url: whatsappFromPhone(phone) || row.whatsapp_url || null,
    address: parsed.street || address || row.address || null,
    number: parsed.number || row.number || null,
    neighborhood: parsed.neighborhood || row.neighborhood || null,
    cep: parsed.cep || row.cep || null,
    rating,
    reviews_count: reviewsCount == null ? null : Number(reviewsCount),
    opening_hours: result.operating_hours || row.opening_hours || null,
    latitude: Number.isFinite(latitude) ? latitude : row.latitude,
    longitude: Number.isFinite(longitude) ? longitude : row.longitude,
    location_source: Number.isFinite(latitude) && Number.isFinite(longitude) ? 'serpapi_google_maps' : row.location_source,
    location_confidence: Number.isFinite(latitude) && Number.isFinite(longitude) ? 0.9 : row.location_confidence,
    location_verified_at: new Date().toISOString(),
    coleta_logs: mergeLogs(row.coleta_logs, {
      phase1_serpapi_google_maps_backfill_v1: {
        runId: record.runId,
        file: record.file,
        backfilledAt: new Date().toISOString(),
        category_source: sourceCategory,
        address_source: address,
        rating_source: rating,
        reviews_source: reviewsCount,
        phone_source: phone,
        website_source: clean(result.website || ''),
        hours_source: clean(result.hours || result.open_state || ''),
        has_operating_hours: Boolean(result.operating_hours),
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
      },
    }),
  };

  return Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined));
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
  .select('id,name,google_maps_name,category,address,number,neighborhood,cep,city,state,phone,whatsapp_url,rating,reviews_count,opening_hours,google_maps_url,google_place_id,latitude,longitude,location_source,location_confidence,coleta_logs,is_deleted')
  .eq('city', CITY)
  .eq('state', STATE)
  .eq('is_deleted', false));

const { byPlace, byUrl } = loadSerpapiResults();
const planned = [];
const missing = [];

for (const row of rows) {
  const record = (row.google_place_id && byPlace.get(row.google_place_id))
    || (row.google_maps_url && byUrl.get(keyForPlace(row.google_maps_url)));
  if (!record) {
    missing.push({ id: row.id, name: row.name, google_maps_url: row.google_maps_url, google_place_id: row.google_place_id });
    continue;
  }
  planned.push({ row, record, update: buildUpdate(row, record) });
}

const updated = [];
const failed = [];

if (APPLY) {
  for (const item of planned) {
    const { error } = await supabase
      .from('restaurants')
      .update(item.update)
      .eq('id', item.row.id);
    if (error) {
      failed.push({ id: item.row.id, name: item.row.name, error: error.message });
    } else {
      updated.push({ id: item.row.id, name: item.update.google_maps_name || item.row.name });
    }
  }
}

const summary = {
  apply: APPLY,
  city: CITY,
  state: STATE,
  activeRows: rows.length,
  plannedUpdates: planned.length,
  missingEvidence: missing.length,
  updated: updated.length,
  failed,
  coverage: {
    phone: planned.filter((item) => item.update.phone).length,
    whatsapp_url: planned.filter((item) => item.update.whatsapp_url).length,
    address: planned.filter((item) => item.update.address).length,
    rating: planned.filter((item) => item.update.rating != null).length,
    reviews_count: planned.filter((item) => item.update.reviews_count != null).length,
    opening_hours: planned.filter((item) => item.update.opening_hours).length,
    coordinates: planned.filter((item) => item.update.latitude != null && item.update.longitude != null).length,
  },
  samples: planned.slice(0, 20).map((item) => ({
    id: item.row.id,
    name: item.update.google_maps_name,
    category: item.update.category,
    address: [item.update.address, item.update.number, item.update.neighborhood].filter(Boolean).join(', '),
    phone: item.update.phone,
    rating: item.update.rating,
    reviews_count: item.update.reviews_count,
    has_opening_hours: Boolean(item.update.opening_hours),
  })),
  missing: missing.slice(0, 30),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
