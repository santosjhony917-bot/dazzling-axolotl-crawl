import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import {
  dataForSeoMapsSearch,
  ensureProviderCredentials,
} from './search-provider.mjs';

const APPLY = process.argv.includes('--apply');
const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
const MAX_QUERIES = Number(argValue('--max-queries', '80'));
const SKIP_QUERIES = Number(argValue('--skip-queries', '0'));
const QUERY_DELAY_MS = Number(argValue('--delay-ms', '450'));
const REQUEST_TIMEOUT_MS = Number(argValue('--timeout-ms', '30000'));
const PLAN = argValue('--plan', 'premium_gift');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const PROVIDER_LOG_KEY = `phase1_${SEARCH_PROVIDER}_google_maps_v1`;
const OUT_DIR = path.join('scratch', `${SEARCH_PROVIDER}-google-maps-phase1`, RUN_ID);

const RESTAURANT_INSERT_COLUMNS = new Set([
  'id',
  'name',
  'plan',
  'city',
  'state',
  'category',
  'phone',
  'whatsapp_url',
  'address',
  'number',
  'neighborhood',
  'cep',
  'rating',
  'reviews_count',
  'opening_hours',
  'google_maps_url',
  'google_place_id',
  'google_maps_name',
  'latitude',
  'longitude',
  'location_source',
  'location_confidence',
  'location_verified_at',
  'is_published',
  'ai_validated',
  'menu_status',
  'menu_status_reason',
  'other_url',
  'external_url',
  'ifood_url',
  'claim_code',
  'visit_notes',
  'coleta_logs',
]);

const CABEDELO_POINTS = [
  { area: 'Centro Cabedelo', lat: -6.9748, lng: -34.8373, zoom: 15 },
  { area: 'Porto/Cabedelo', lat: -6.9665, lng: -34.8405, zoom: 15 },
  { area: 'Jacare', lat: -6.9987, lng: -34.8411, zoom: 15 },
  { area: 'Poco', lat: -7.0205, lng: -34.8426, zoom: 15 },
  { area: 'Camboinha', lat: -7.0125, lng: -34.8302, zoom: 15 },
  { area: 'Ponta de Campina', lat: -7.0374, lng: -34.8347, zoom: 15 },
  { area: 'Intermares', lat: -7.0477, lng: -34.8456, zoom: 15 },
  { area: 'Bessa/Intermares limite', lat: -7.0606, lng: -34.8494, zoom: 15 },
  { area: 'Renascer', lat: -7.0324, lng: -34.8705, zoom: 15 },
  { area: 'Jardim Manguinhos/Formosa', lat: -6.9884, lng: -34.8497, zoom: 15 },
];

const DEFAULT_FOOD_TERMS = [
  'restaurantes',
  'pizzaria',
  'hamburgueria',
  'lanchonete',
  'sushi',
  'acai',
  'cafeteria',
  'bar restaurante',
];
const FOOD_TERMS = argValue('--terms', '')
  .split(',')
  .map((term) => clean(term))
  .filter(Boolean);
if (!FOOD_TERMS.length) FOOD_TERMS.push(...DEFAULT_FOOD_TERMS);

const LOCATION_BOX = {
  minLat: -7.076,
  maxLat: -6.925,
  minLng: -34.930,
  maxLng: -34.770,
};

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
}

function readEnv() {
  const env = { ...process.env };
  if (!fs.existsSync('.env')) return env;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    if (!env[key]) env[key] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ç/g, 'c');
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function writeJson(name, value) {
  ensureOutDir();
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(value, null, 2));
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(name, rows) {
  ensureOutDir();
  const headers = [
    'status',
    'name',
    'type',
    'address',
    'rating',
    'reviews',
    'place_id',
    'google_maps_url',
    'query',
    'area',
    'll',
    'reason',
  ];
  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(';')),
  ];
  fs.writeFileSync(path.join(OUT_DIR, name), `${lines.join('\n')}\n`);
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

function canonicalGoogleMapsUrl(result) {
  if (result.place_id) return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(result.place_id)}`;
  if (result.data_id) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean(result.title || result.name || ''))}&query_place_id=${encodeURIComponent(result.data_id)}`;
  if (result.link && /^https?:\/\//i.test(result.link)) return result.link;
  const coords = result.gps_coordinates || {};
  const lat = Number(coords.latitude);
  const lng = Number(coords.longitude);
  const query = clean(`${result.title || result.name || ''} ${result.address || ''} ${CITY} ${STATE}`);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function resultKey(result) {
  return clean(result.place_id || result.data_id || result.cid || canonicalGoogleMapsUrl(result)).toLowerCase().replace(/[?#].*$/, '');
}

function inCityByCoordinates(result) {
  const coords = result.gps_coordinates || {};
  const lat = Number(coords.latitude);
  const lng = Number(coords.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return lat >= LOCATION_BOX.minLat
    && lat <= LOCATION_BOX.maxLat
    && lng >= LOCATION_BOX.minLng
    && lng <= LOCATION_BOX.maxLng;
}

function locationLooksCabedelo(result) {
  const text = normalize([
    result.address,
    result.title,
    result.name,
    result.description,
    result.snippet,
  ].join(' '));
  const addressText = normalize(result.address || '');
  if (/joao pessoa\s*-\s*pb|manaira/.test(addressText)) return false;
  const explicitCabedeloArea = /cabedelo|intermares|ponta de campina|poco|camboinha|formosa|jacare|renascer|areia dourada|recanto do poco/.test(text);
  if (/(joao pessoa|bessa|manaira|tamba[uú]|tambau|brisanet|jardim oceania)/.test(text) && !explicitCabedeloArea) return false;
  const coordinateDecision = inCityByCoordinates(result);
  if (coordinateDecision === true) return true;
  if (coordinateDecision === false) return false;
  return explicitCabedeloArea;
}

function classifyScope(result) {
  const nameText = normalize(result.title || result.name || '');
  const typeText = normalize(Array.isArray(result.types) ? result.types.join(' ') : (result.type || result.types || ''));
  const text = normalize([
    result.title,
    result.name,
    result.type,
    result.types,
    result.address,
    result.description,
    result.open_state,
    result.hours,
  ].join(' '));

  if (/fechado permanentemente|permanently closed/.test(text)) return { accept: false, reason: 'permanently_closed' };
  if (/fechado temporariamente|temporarily closed/.test(text)) return { accept: false, reason: 'temporarily_closed' };

  const hardReject = [
    'padaria',
    'bakery',
    'acougue',
    'butcher',
    'peixaria',
    'fish market',
    'conveniencia',
    'convenience',
    'posto de gasolina',
    'gas station',
    'supermercado',
    'supermarket',
    'mercado publico',
    'hotel',
    'pousada',
    'barbearia',
    'barber',
    'shopping',
    'farmacia',
    'pharmacy',
    'igreja',
    'church',
    'escola',
    'school',
    'condominio',
    'residencial',
    'imobiliaria',
    'loja de bolos',
    'cake shop',
    'buffet',
    'catering',
  ];
  if (hardReject.some((term) => text.includes(term))) return { accept: false, reason: 'excluded_category_or_name' };
  if (/^(praia|playground|torrefacao de cafe)$/.test(typeText)) return { accept: false, reason: 'excluded_category_or_name' };
  if (/^(intermares|ponta de campina)$/.test(nameText)) return { accept: false, reason: 'excluded_category_or_name' };

  const positive = [
    'restaurant',
    'restaurante',
    'pizzaria',
    'pizza',
    'hamburg',
    'burger',
    'lanchonete',
    'lanche',
    'sushi',
    'japones',
    'acai',
    'cafeteria',
    'cafe',
    'churrascaria',
    'bar e restaurante',
    'bar restaurante',
    'pastel',
    'esfiha',
    'esfiharia',
    'tapioca',
    'self service',
    'delivery',
    'food',
    'comida',
    'sorveteria',
  ];
  if (!positive.some((term) => text.includes(term))) return { accept: false, reason: 'not_clearly_food_establishment' };
  return { accept: true, reason: 'food_scope' };
}

function normalizeLead(result, search) {
  const title = clean(result.title || result.name || 'Pendente Google Maps');
  const mapsUrl = canonicalGoogleMapsUrl(result);
  const coords = result.gps_coordinates || {};
  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);
  return {
    id: randomUUID(),
    name: title || 'Pendente Google Maps',
    google_maps_name: title || null,
    google_maps_url: mapsUrl,
    google_place_id: result.place_id || null,
    data_id: result.data_id || null,
    category_source: clean(result.type || (Array.isArray(result.types) ? result.types.join(', ') : result.types) || ''),
    address_source: clean(result.address || ''),
    rating_source: result.rating ?? null,
    reviews_source: result.reviews ?? result.reviews_original ?? null,
    phone_source: clean(result.phone || ''),
    website_source: clean(result.website || ''),
    hours_source: clean(result.hours || result.open_state || ''),
    operating_hours_source: result.operating_hours || null,
    closed_status_source: clean(result.open_state || result.hours || ''),
    gps_coordinates: result.gps_coordinates || null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    query: search.query,
    area: search.area,
    ll: search.ll,
    raw: result,
  };
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

function parseGoogleTimeSlots(value) {
  const text = String(value || '').trim();
  if (!text || /fechado|closed/i.test(text)) return [];
  if (/24\s*h|24 horas|open 24/i.test(text)) return [{ start: '00:00', end: '23:59' }];
  return text
    .split(/\s*,\s*/)
    .map((part) => {
      const match = part.match(/(\d{1,2})(?::(\d{2}))?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?/);
      if (!match) return null;
      const startHour = String(match[1]).padStart(2, '0');
      const startMinute = String(match[2] || '00').padStart(2, '0');
      const endHour = String(match[3]).padStart(2, '0');
      const endMinute = String(match[4] || '00').padStart(2, '0');
      return { start: `${startHour}:${startMinute}`, end: `${endHour}:${endMinute}` };
    })
    .filter(Boolean);
}

function normalizeGoogleOpeningHours(operatingHours) {
  const emptyDay = () => ({ isOpen: false, slots: [] });
  const schedule = {
    monday: emptyDay(),
    tuesday: emptyDay(),
    wednesday: emptyDay(),
    thursday: emptyDay(),
    friday: emptyDay(),
    saturday: emptyDay(),
    sunday: emptyDay(),
  };
  const aliases = {
    domingo: 'sunday',
    sunday: 'sunday',
    sabado: 'saturday',
    sábado: 'saturday',
    saturday: 'saturday',
    sexta: 'friday',
    'sexta-feira': 'friday',
    friday: 'friday',
    quinta: 'thursday',
    'quinta-feira': 'thursday',
    thursday: 'thursday',
    quarta: 'wednesday',
    'quarta-feira': 'wednesday',
    wednesday: 'wednesday',
    terca: 'tuesday',
    terça: 'tuesday',
    'terca-feira': 'tuesday',
    'terça-feira': 'tuesday',
    tuesday: 'tuesday',
    segunda: 'monday',
    'segunda-feira': 'monday',
    monday: 'monday',
  };
  if (!operatingHours || typeof operatingHours !== 'object') return null;
  let seen = false;
  for (const [rawDay, rawHours] of Object.entries(operatingHours)) {
    const day = aliases[normalize(rawDay)];
    if (!day) continue;
    seen = true;
    const slots = parseGoogleTimeSlots(rawHours);
    schedule[day] = { isOpen: slots.length > 0, slots };
  }
  return seen ? schedule : null;
}

function whatsappFromPhone(phone) {
  let digits = onlyDigits(phone);
  if (!digits) return null;
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  return digits.length >= 12 ? `https://wa.me/${digits}` : null;
}

function buildPayload(lead, knownColumns) {
  const parsedAddress = parseGoogleMapsAddress(lead.address_source);
  const payload = {
    id: lead.id,
    name: lead.name || 'Pendente Google Maps',
    plan: PLAN,
    city: CITY,
    state: STATE,
    category: lead.category_source || 'Pendente validacao',
    phone: lead.phone_source || null,
    whatsapp_url: whatsappFromPhone(lead.phone_source),
    address: parsedAddress.street || lead.address_source || null,
    number: parsedAddress.number || null,
    neighborhood: parsedAddress.neighborhood || null,
    cep: parsedAddress.cep || null,
    rating: lead.rating_source == null ? null : Number(lead.rating_source),
    reviews_count: lead.reviews_source == null ? null : Number(lead.reviews_source),
    opening_hours: normalizeGoogleOpeningHours(lead.operating_hours_source),
    google_maps_url: lead.google_maps_url || null,
    google_place_id: lead.google_place_id || lead.data_id || null,
    google_maps_name: lead.google_maps_name || lead.name || null,
    latitude: lead.latitude,
    longitude: lead.longitude,
    location_source: lead.latitude != null && lead.longitude != null ? `${SEARCH_PROVIDER}_google_maps` : null,
    location_confidence: lead.latitude != null && lead.longitude != null ? 0.9 : null,
    location_verified_at: lead.latitude != null && lead.longitude != null ? new Date().toISOString() : null,
    is_published: false,
    ai_validated: false,
    menu_status: 'unknown',
    menu_status_reason: null,
    other_url: null,
    external_url: null,
    ifood_url: null,
    claim_code: `CLAIM-${String(lead.id).slice(0, 5).toUpperCase()}`,
    visit_notes: `Google Maps: ${lead.google_maps_url}\nFase 1 ${SEARCH_PROVIDER}: somente identidade/link do Maps. Proxima etapa deve enriquecer dados oficiais e coletar cardapio.`,
    coleta_logs: JSON.stringify({
      [PROVIDER_LOG_KEY]: {
        runId: RUN_ID,
        collectedAt: new Date().toISOString(),
        search_provider: SEARCH_PROVIDER,
        city: CITY,
        state: STATE,
        query: lead.query,
        area: lead.area,
        ll: lead.ll,
        category_source: lead.category_source,
        address_source: lead.address_source,
        rating_source: lead.rating_source,
        reviews_source: lead.reviews_source,
        phone_source: lead.phone_source,
        website_source: lead.website_source,
        hours_source: lead.hours_source,
        operating_hours_source: lead.operating_hours_source,
        closed_status_source: lead.closed_status_source,
        latitude: lead.latitude,
        longitude: lead.longitude,
      },
    }),
  };
  return Object.fromEntries(Object.entries(payload).filter(([key]) => knownColumns.has(key)));
}

async function serpApiSearch(apiKey, search) {
  const params = new URLSearchParams({
    engine: 'google_maps',
    q: search.query,
    type: 'search',
    hl: 'pt',
    gl: 'br',
    google_domain: 'google.com.br',
    ll: search.ll,
    api_key: apiKey,
  });
  if (search.start) params.set('start', String(search.start));
  const url = `https://serpapi.com/search.json?${params.toString()}`;
  const { response, data } = await fetchJsonWithTimeout(url, REQUEST_TIMEOUT_MS);
  if (!response.ok || data.error) {
    throw new Error(data.error || `SerpApi HTTP ${response.status}`);
  }
  return data;
}

async function providerMapsSearch(env, apiKey, search) {
  if (SEARCH_PROVIDER === 'serpapi') return serpApiSearch(apiKey, search);
  return dataForSeoMapsSearch(env, search, {
    timeoutMs: REQUEST_TIMEOUT_MS,
    depth: Number(argValue('--depth', '100')),
    languageCode: 'pt',
    seDomain: 'google.com.br',
    tag: `${CITY}/${STATE}/${search.area}`,
  });
}

function buildQueries() {
  const searches = [];
  for (const point of CABEDELO_POINTS) {
    const ll = `@${point.lat},${point.lng},${point.zoom}z`;
    for (const term of FOOD_TERMS) {
      searches.push({
        query: `${term} ${CITY} ${STATE}`,
        term,
        area: point.area,
        lat: point.lat,
        lng: point.lng,
        ll,
        start: 0,
      });
    }
  }
  return searches.slice(SKIP_QUERIES, SKIP_QUERIES + MAX_QUERIES);
}

const env = readEnv();
ensureProviderCredentials(env, SEARCH_PROVIDER);
const apiKey = SEARCH_PROVIDER === 'serpapi'
  ? (env.SERPAPI_API_KEY || env.VITE_SERPAPI_API_KEY)
  : null;

let supabase = null;
let existingRows = [];

if (APPLY) {
  supabase = createClient(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );

  existingRows = await selectAll(() => supabase
    .from('restaurants')
    .select('id,name,google_maps_url,google_place_id,is_deleted')
    .eq('city', CITY)
    .eq('state', STATE));
}

const existingKeys = new Set();
for (const row of existingRows) {
  if (row.google_maps_url) existingKeys.add(clean(row.google_maps_url).toLowerCase().replace(/[?#].*$/, ''));
  if (row.google_place_id) existingKeys.add(clean(row.google_place_id).toLowerCase());
}

const queries = buildQueries();
const rawResults = [];
const decisions = [];
const acceptedByKey = new Map();
const rejected = [];
const errors = [];

for (let index = 0; index < queries.length; index += 1) {
  const search = queries[index];
  console.log(`[${index + 1}/${queries.length}] ${search.query} :: ${search.area} :: ${search.ll}`);
  try {
    const data = await providerMapsSearch(env, apiKey, search);
    writeJson(`raw-${String(index + 1).padStart(3, '0')}.json`, {
      search,
      search_metadata: data.search_metadata,
      search_parameters: data.search_parameters,
      local_results: data.local_results || [],
    });
    const localResults = data.local_results || [];
    rawResults.push({ search, count: localResults.length });
    for (const result of localResults) {
      const key = resultKey(result);
      const lead = normalizeLead(result, search);
      const scope = classifyScope(result);
      const isCabedelo = locationLooksCabedelo(result);
      let status = 'accepted';
      let reason = scope.reason;

      if (!scope.accept) {
        status = 'rejected';
      } else if (!isCabedelo) {
        status = 'rejected';
        reason = 'outside_cabedelo_or_location_uncertain';
      } else if (acceptedByKey.has(key)) {
        status = 'duplicate_in_run';
        reason = 'duplicate_in_run';
      } else if (existingKeys.has(key) || (lead.google_place_id && existingKeys.has(clean(lead.google_place_id).toLowerCase()))) {
        status = 'already_in_database';
        reason = 'already_in_database';
      }

      const decision = {
        status,
        reason,
        name: lead.name,
        type: lead.category_source,
        address: lead.address_source,
        rating: lead.rating_source,
        reviews: lead.reviews_source,
        place_id: lead.google_place_id || lead.data_id || '',
        google_maps_url: lead.google_maps_url,
        query: search.query,
        area: search.area,
        ll: search.ll,
      };
      decisions.push(decision);

      if (status === 'accepted') {
        acceptedByKey.set(key, lead);
      } else if (status === 'rejected') {
        rejected.push({ ...decision, raw: result });
      }
    }
  } catch (error) {
    errors.push({ search, error: error.message || String(error) });
    console.error(`[ERRO] ${search.query} :: ${search.area}: ${error.message || error}`);
  }
  if (QUERY_DELAY_MS > 0) await sleep(QUERY_DELAY_MS);
}

const accepted = [...acceptedByKey.values()];
const payloads = accepted.map((lead) => buildPayload(lead, RESTAURANT_INSERT_COLUMNS));
const inserted = [];
const failed = [];

if (APPLY && payloads.length) {
  for (let index = 0; index < payloads.length; index += 50) {
    const chunk = payloads.slice(index, index + 50);
    const { data, error } = await supabase
      .from('restaurants')
      .insert(chunk)
      .select('id,name,google_maps_url,google_place_id');
    if (error) {
      failed.push({ index, count: chunk.length, error: error.message });
    } else {
      inserted.push(...(data || []));
    }
  }
}

const summary = {
  runId: RUN_ID,
  outDir: OUT_DIR,
  apply: APPLY,
  city: CITY,
  state: STATE,
  skippedQueries: SKIP_QUERIES,
  queryCount: queries.length,
  terms: FOOD_TERMS,
  searchProvider: SEARCH_PROVIDER,
  providerErrors: errors.length,
  serpApiErrors: SEARCH_PROVIDER === 'serpapi' ? errors.length : 0,
  dataForSeoErrors: SEARCH_PROVIDER === 'dataforseo' ? errors.length : 0,
  rawResultCount: rawResults.reduce((sum, row) => sum + row.count, 0),
  acceptedCount: accepted.length,
  rejectedCount: rejected.length,
  duplicateInRunCount: decisions.filter((row) => row.status === 'duplicate_in_run').length,
  alreadyInDatabaseCount: decisions.filter((row) => row.status === 'already_in_database').length,
  insertedCount: inserted.length,
  failed,
  existingBefore: existingRows.length,
  querySamples: queries.slice(0, 12),
  acceptedSamples: accepted.slice(0, 25).map((lead) => ({
    name: lead.name,
    type: lead.category_source,
    address: lead.address_source,
    rating: lead.rating_source,
    reviews: lead.reviews_source,
    google_maps_url: lead.google_maps_url,
  })),
  errors,
};

writeJson('summary.json', summary);
writeJson('accepted-leads.json', accepted);
writeJson('decisions.json', decisions);
writeJson('rejected.json', rejected);
writeCsv('decisions.csv', decisions);

console.log(JSON.stringify(summary, null, 2));
