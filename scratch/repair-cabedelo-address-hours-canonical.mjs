import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const CITY = 'Cabedelo';
const STATE = 'PB';
const argValue = (name, fallback = '') => {
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const ROOT = path.join('scratch', `${SEARCH_PROVIDER}-google-maps-phase1`);
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join(ROOT, `canonical-hours-address-${RUN_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

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

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalize = (value) => clean(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mergeLogs(current, patch) {
  return JSON.stringify({ ...parseJson(current), ...patch });
}

function canonicalUrl(result) {
  if (result?.place_id) return `https://www.google.com/maps/place/?q=place_id:${result.place_id}`;
  return clean(result?.link || result?.gps_coordinates?.link || '');
}

function keyForPlace(value) {
  return normalize(value).replace(/data=!.*$/, '').replace(/[/?#]+$/, '');
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
    const streetHyphen = street.indexOf(' - ');
    if (streetHyphen !== -1) {
      const before = street.slice(0, streetHyphen).trim();
      const after = street.slice(streetHyphen + 3).trim();
      if (before && after) {
        street = before;
        neighborhood = after;
      }
    }
    const second = parts[1];
    const hyphen = second.indexOf(' - ');
    if (hyphen !== -1) {
      if (!neighborhood) neighborhood = second.slice(0, hyphen).trim();
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

function emptyWeek() {
  const day = () => ({ isOpen: false, slots: [] });
  return {
    monday: day(),
    tuesday: day(),
    wednesday: day(),
    thursday: day(),
    friday: day(),
    saturday: day(),
    sunday: day(),
  };
}

const DAY_ALIASES = {
  domingo: 'sunday',
  sunday: 'sunday',
  sabado: 'saturday',
  saturday: 'saturday',
  sexta: 'friday',
  'sexta feira': 'friday',
  friday: 'friday',
  quinta: 'thursday',
  'quinta feira': 'thursday',
  thursday: 'thursday',
  quarta: 'wednesday',
  'quarta feira': 'wednesday',
  wednesday: 'wednesday',
  terca: 'tuesday',
  'terca feira': 'tuesday',
  tuesday: 'tuesday',
  segunda: 'monday',
  'segunda feira': 'monday',
  monday: 'monday',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function dayKey(value) {
  return DAY_ALIASES[normalize(value).replace(/-/g, ' ')] || '';
}

function parseTimeSlotText(value) {
  const text = clean(value);
  if (!text || /fechado|closed/i.test(text)) return [];
  if (/24\s*h|24 horas|open 24/i.test(text)) return [{ start: '00:00', end: '23:59' }];
  return text
    .split(/\s*,\s*/)
    .map((part) => {
      const match = part.match(/(\d{1,2})(?::(\d{2}))?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?/);
      if (!match) return null;
      const start = `${String(match[1]).padStart(2, '0')}:${String(match[2] || '00').padStart(2, '0')}`;
      const end = `${String(match[3]).padStart(2, '0')}:${String(match[4] || '00').padStart(2, '0')}`;
      return { start, end };
    })
    .filter(Boolean);
}

function normalizeOperatingHours(operatingHours) {
  if (!operatingHours || typeof operatingHours !== 'object') return null;
  if (DAY_ORDER.every((key) => operatingHours[key]?.slots && typeof operatingHours[key].isOpen === 'boolean')) {
    return operatingHours;
  }
  const schedule = emptyWeek();
  let seen = false;
  for (const [rawDay, rawHours] of Object.entries(operatingHours)) {
    const key = dayKey(rawDay);
    if (!key) continue;
    seen = true;
    const slots = parseTimeSlotText(rawHours);
    schedule[key] = { isOpen: slots.length > 0, slots };
  }
  return seen ? schedule : null;
}

function slotFromBioMatch(match) {
  const start = `${String(match[3]).padStart(2, '0')}:${String(match[4] || '00').padStart(2, '0')}`;
  const end = `${String(match[5]).padStart(2, '0')}:${String(match[6] || '00').padStart(2, '0')}`;
  return { start, end };
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

function normalizeOpeningHoursFromBio(text) {
  const normalized = normalize(text).replace(/[àáâã]/g, 'a');
  const dayPattern = '(domingo|segunda(?: feira)?|terca(?: feira)?|quarta(?: feira)?|quinta(?: feira)?|sexta(?: feira)?|sabado)';
  const range = new RegExp(`${dayPattern}\\s*(?:a|ate)\\s*${dayPattern}\\s*[-–]?\\s*(\\d{1,2})h?(?::?(\\d{2}))?\\s*(?:a|as|ate|-)\\s*(\\d{1,2})h?(?::?(\\d{2}))?`, 'i');
  const match = normalized.match(range);
  if (!match) return null;
  const startDay = dayKey(match[1]);
  const endDay = dayKey(match[2]);
  const slot = slotFromBioMatch(match);
  const schedule = emptyWeek();
  const days = daysBetween(startDay, endDay);
  if (!days.length) return null;
  for (const day of days) schedule[day] = { isOpen: true, slots: [slot] };
  return schedule;
}

async function selectAll(supabase) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_url,google_place_id,address,number,neighborhood,city,state,cep,opening_hours,coleta_logs,is_deleted')
      .eq('state', STATE)
      .eq('is_deleted', false)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []).filter((row) => {
      const logs = parseJson(row.coleta_logs);
      return normalize(row.city) === normalize(CITY)
        || logs[`phase1_${SEARCH_PROVIDER}_google_maps_v1`]?.city === CITY
        || logs[`phase1_${SEARCH_PROVIDER}_google_maps_backfill_v1`]?.runId
        || logs.phase1_serpapi_google_maps_v1?.city === CITY
        || logs.phase1_serpapi_google_maps_backfill_v1?.runId
        || logs.phase1_dataforseo_google_maps_v1?.city === CITY
        || logs.phase1_dataforseo_google_maps_backfill_v1?.runId;
    }));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function loadProviderResults() {
  const byPlace = new Map();
  const byUrl = new Map();
  if (!fs.existsSync(ROOT)) return { byPlace, byUrl };
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{4}-/.test(entry.name)) continue;
    const runDir = path.join(ROOT, entry.name);
    for (const file of fs.readdirSync(runDir).filter((name) => /^raw-\d+\.json$/.test(name))) {
      const raw = parseJson(fs.readFileSync(path.join(runDir, file), 'utf8'));
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

function recordForRow(row, maps) {
  if (row.google_place_id && maps.byPlace.has(String(row.google_place_id))) return maps.byPlace.get(String(row.google_place_id));
  const key = keyForPlace(row.google_maps_url || '');
  return key ? maps.byUrl.get(key) : null;
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

const rows = await selectAll(supabase);
const maps = loadProviderResults();
const updates = [];
let canonicalizedGoogle = 0;
let bioFallback = 0;
let addressFixed = 0;

for (const row of rows) {
  const logs = parseJson(row.coleta_logs);
  const record = recordForRow(row, maps);
  const result = record?.result || null;
  const rawAddress = clean(result?.address)
    || clean(logs[`phase1_${SEARCH_PROVIDER}_google_maps_backfill_v1`]?.address_source)
    || clean(logs[`phase1_${SEARCH_PROVIDER}_google_maps_v1`]?.address_source)
    || clean(logs.phase1_dataforseo_google_maps_backfill_v1?.address_source)
    || clean(logs.phase1_dataforseo_google_maps_v1?.address_source)
    || clean(logs.phase1_serpapi_google_maps_backfill_v1?.address_source)
    || clean(logs.phase1_serpapi_google_maps_v1?.address_source);
  const parsed = parseGoogleMapsAddress(rawAddress);

  const googleHours = normalizeOperatingHours(result?.operating_hours)
    || normalizeOperatingHours(row.opening_hours);
  const bioHours = googleHours ? null : normalizeOpeningHoursFromBio(
    logs[`${SEARCH_PROVIDER}_instagram_discovery_v2`]?.opening_hours_text
      || logs[`${SEARCH_PROVIDER}_instagram_discovery_v2`]?.snippet
      || logs.dataforseo_instagram_discovery_v2?.opening_hours_text
      || logs.dataforseo_instagram_discovery_v2?.snippet
      || logs.serpapi_instagram_discovery_v2?.opening_hours_text
      || logs.serpapi_instagram_discovery_v2?.snippet
      || ''
  );
  const nextHours = googleHours || bioHours || null;
  const hoursSource = googleHours ? 'google_maps_operating_hours' : bioHours ? 'instagram_bio_fallback' : null;

  const patch = {};
  if (parsed.street && parsed.street !== row.address) patch.address = parsed.street;
  if ((parsed.number || null) !== (row.number || null)) patch.number = parsed.number || null;
  if (parsed.neighborhood && normalize(parsed.neighborhood) !== normalize(row.neighborhood)) patch.neighborhood = parsed.neighborhood;
  if (normalize(row.city) !== normalize(CITY)) patch.city = CITY;
  if (normalize(row.state) !== normalize(STATE)) patch.state = STATE;
  if (parsed.cep && parsed.cep !== row.cep) patch.cep = parsed.cep;
  if (Object.keys(patch).some((key) => ['address', 'number', 'neighborhood', 'city', 'state', 'cep'].includes(key))) addressFixed += 1;

  if (nextHours) {
    patch.opening_hours = nextHours;
    if (hoursSource === 'google_maps_operating_hours') canonicalizedGoogle += 1;
    if (hoursSource === 'instagram_bio_fallback') bioFallback += 1;
  }

  if (!Object.keys(patch).length) continue;
  patch.coleta_logs = mergeLogs(row.coleta_logs, {
    canonical_address_hours_repair_v1: {
      repairedAt: new Date().toISOString(),
      rawAddress: rawAddress || null,
      addressPatch: Object.fromEntries(Object.entries(patch).filter(([key]) => ['address', 'number', 'neighborhood', 'city', 'state', 'cep'].includes(key))),
      hoursSource,
      sourceRunId: record?.runId || null,
      sourceFile: record?.file || null,
    },
  });
  updates.push({ id: row.id, name: row.name, patch });
}

for (const update of updates) {
  const { error } = await supabase
    .from('restaurants')
    .update(update.patch)
    .eq('id', update.id);
  if (error) throw new Error(`${update.name}: ${error.message}`);
}

const summary = {
  city: CITY,
  state: STATE,
  scanned: rows.length,
  updated: updates.length,
  addressFixed,
  canonicalizedGoogle,
  bioFallback,
  outDir: OUT_DIR,
};
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify({ summary, updates }, null, 2));
console.log(JSON.stringify(summary, null, 2));
