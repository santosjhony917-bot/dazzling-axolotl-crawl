import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  dataForSeoMapsSearch,
  ensureProviderCredentials,
} from './search-provider.mjs';

const CITY = 'Cabedelo';
const STATE = 'PB';
const APPLY = process.argv.includes('--apply');
const FETCH_DETAILS = process.argv.includes('--fetch-details');
const argValue = (name, fallback = '') => {
  const prefix = `${name}=`;
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
};
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const ROOT = path.join('scratch', `${SEARCH_PROVIDER}-google-maps-phase1`);
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join(ROOT, `final-audit-${RUN_ID}`);

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

function parseGoogleMapsAddress(fullAddress) {
  let street = '';
  let number = '';
  let neighborhood = '';
  let city = '';
  let state = '';
  let cep = '';
  if (!fullAddress) return { street, number, neighborhood, city, state, cep };

  let working = clean(fullAddress)
    .replace(/\s*,?\s*(?:Brazil|Brasil)\s*[;,.]*\s*$/i, '')
    .replace(/^[^\p{L}\d]*(?=(?:R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|Praça|Praca|Alameda|Estrada|\d))/iu, '')
    .trim();

  const cepMatch = working.match(/\b(\d{5}-\d{3})\b/) || working.match(/\b(\d{8})\b/);
  if (cepMatch) {
    cep = cepMatch[1];
    working = working.replace(cepMatch[0], '').trim();
  }

  const stateMatch = working.match(/[\s,-]\s*([A-Z]{2})\s*$/);
  if (stateMatch) {
    state = stateMatch[1];
    working = working.substring(0, working.lastIndexOf(stateMatch[0])).trim();
  }

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
    } else if (/^\d+[A-Za-z/-]*$/.test(second) || normalize(second) === 's/n') {
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
      street = street.slice(0, streetHyphen).trim();
      neighborhood = parts[0].slice(streetHyphen + 3).trim();
    }
    const second = parts[1];
    const hyphen = second.indexOf(' - ');
    if (hyphen !== -1) {
      if (!neighborhood) neighborhood = second.slice(0, hyphen).trim();
      city = second.slice(hyphen + 3).trim();
    } else {
      city = second;
    }
    const numInStreet = street.match(/,\s*(\d+[A-Za-z/-]*)\s*$/);
    if (numInStreet) {
      number = numInStreet[1];
      street = street.substring(0, street.lastIndexOf(numInStreet[0])).trim();
    }
  } else {
    street = working;
  }

  city = clean(city).replace(/\s*-\s*PB$/i, '');
  return { street: clean(street), number: clean(number), neighborhood: clean(neighborhood), city: clean(city), state, cep };
}

function canonicalUrl(result) {
  if (result?.place_id) return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(result.place_id)}`;
  return clean(result?.link || '');
}

function keyForUrl(value) {
  return normalize(value).replace(/[?#].*$/, '');
}

function loadRawMaps() {
  const byPlace = new Map();
  const byUrl = new Map();
  if (!fs.existsSync(ROOT)) return { byPlace, byUrl };
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{4}-/.test(entry.name)) continue;
    const runDir = path.join(ROOT, entry.name);
    for (const file of fs.readdirSync(runDir).filter((name) => /^raw-\d+\.json$/.test(name))) {
      const raw = parseJson(fs.readFileSync(path.join(runDir, file), 'utf8'), null);
      for (const result of raw?.local_results || []) {
        const record = { result, runId: entry.name, file };
        if (result.place_id) byPlace.set(String(result.place_id), record);
        const url = canonicalUrl(result);
        if (url) byUrl.set(keyForUrl(url), record);
      }
    }
  }
  return { byPlace, byUrl };
}

function recordForRow(row, maps) {
  if (row.google_place_id && maps.byPlace.has(String(row.google_place_id))) return maps.byPlace.get(String(row.google_place_id));
  const key = keyForUrl(row.google_maps_url || '');
  return key ? maps.byUrl.get(key) : null;
}

function closedReasonFrom(value) {
  const text = normalize(value);
  if (/fechado permanentemente|permanently closed/.test(text)) return 'fechado_permanentemente';
  if (/fechado temporariamente|temporarily closed/.test(text)) return 'fechado_temporariamente';
  return '';
}

function looksRestaurant(row, result) {
  const text = normalize([
    row.name,
    row.google_maps_name,
    row.category,
    result?.title,
    result?.type,
    Array.isArray(result?.types) ? result.types.join(' ') : '',
  ].join(' '));
  const typeText = normalize([
    row.category,
    result?.type,
    Array.isArray(result?.types) ? result.types.join(' ') : '',
  ].join(' '));

  const rejected = [
    'hotel',
    'pousada',
    'supermercado',
    'farmacia',
    'barbearia',
    'imobiliaria',
    'igreja',
    'escola',
    'posto de gasolina',
    'acougue',
    'peixaria',
    'condominio',
    'residencial',
  ];
  if (rejected.some((term) => text.includes(term))) return false;
  if (/^(praia|playground|ponto turistico|atração turistica|tourist attraction)$/.test(typeText)) return false;

  const accepted = [
    'restaurante',
    'restaurant',
    'pizzaria',
    'pizza',
    'hamburg',
    'lanchonete',
    'lanche',
    'sushi',
    'japones',
    'acai',
    'açaí',
    'cafeteria',
    'cafe',
    'café',
    'churrascaria',
    'bar',
    'pastel',
    'tapioca',
    'self-service',
    'sorveteria',
    'delivery',
    'barraca de comida',
    'loja de sucos',
    'microcervejaria',
  ];
  return accepted.some((term) => text.includes(term));
}

function normalizeOpeningHours(value) {
  if (!value || typeof value !== 'object') return null;
  const day = () => ({ isOpen: false, slots: [] });
  const schedule = {
    monday: day(),
    tuesday: day(),
    wednesday: day(),
    thursday: day(),
    friday: day(),
    saturday: day(),
    sunday: day(),
  };
  const aliases = {
    segunda: 'monday',
    'segunda-feira': 'monday',
    monday: 'monday',
    terca: 'tuesday',
    'terça': 'tuesday',
    'terca-feira': 'tuesday',
    'terça-feira': 'tuesday',
    tuesday: 'tuesday',
    quarta: 'wednesday',
    'quarta-feira': 'wednesday',
    wednesday: 'wednesday',
    quinta: 'thursday',
    'quinta-feira': 'thursday',
    thursday: 'thursday',
    sexta: 'friday',
    'sexta-feira': 'friday',
    friday: 'friday',
    sabado: 'saturday',
    'sábado': 'saturday',
    saturday: 'saturday',
    domingo: 'sunday',
    sunday: 'sunday',
  };
  const parseSlot = (text) => {
    const normalized = clean(text);
    if (!normalized || /fechado|closed/i.test(normalized)) return [];
    if (/24\s*h|24 horas|open 24/i.test(normalized)) return [{ start: '00:00', end: '23:59' }];
    return normalized.split(/\s*,\s*/).map((part) => {
      const match = part.match(/(\d{1,2})(?::(\d{2}))?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?/);
      if (!match) return null;
      return {
        start: `${String(match[1]).padStart(2, '0')}:${String(match[2] || '00').padStart(2, '0')}`,
        end: `${String(match[3]).padStart(2, '0')}:${String(match[4] || '00').padStart(2, '0')}`,
      };
    }).filter(Boolean);
  };

  if (Object.keys(schedule).every((key) => value[key]?.slots && typeof value[key].isOpen === 'boolean')) return value;

  let seen = false;
  for (const [rawDay, rawHours] of Object.entries(value)) {
    const key = aliases[normalize(rawDay)];
    if (!key) continue;
    const slots = parseSlot(rawHours);
    schedule[key] = { isOpen: slots.length > 0, slots };
    seen = true;
  }
  return seen ? schedule : null;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function whatsappFromPhone(phone) {
  let digits = onlyDigits(phone);
  if (!digits) return null;
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  return digits.length >= 12 ? `https://wa.me/${digits}` : null;
}

function isAreaOnlyAddress(parsed) {
  const area = normalize(parsed.street);
  const knownAreas = new Set([
    'areia dourada',
    'cabedelo',
    'camboinha',
    'centro',
    'intermares',
    'jacare',
    'ponta de campina',
    'ponta de matos',
    'renascer',
    'recanto do poco',
    'vila sao joao',
  ]);
  return knownAreas.has(area)
    && normalize(parsed.city) === normalize(CITY)
    && !parsed.number
    && !parsed.neighborhood;
}

async function fetchDetails(env, apiKey, row) {
  if (SEARCH_PROVIDER !== 'serpapi') {
    const search = {
      query: clean(row.google_maps_name || row.name),
      lat: Number(row.latitude) || -6.9875,
      lng: Number(row.longitude) || -34.8389,
      zoom: 17,
      area: clean(row.neighborhood || row.address || CITY),
    };
    const payload = await dataForSeoMapsSearch(env, search, {
      timeoutMs: 60000,
      depth: 20,
      languageCode: 'pt',
      seDomain: 'google.com.br',
      tag: `phase1-final-audit/${row.id}`,
    });
    return (payload.local_results || []).find((item) => item.place_id === row.google_place_id)
      || payload.local_results?.[0]
      || {};
  }

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_maps');
  url.searchParams.set('place_id', row.google_place_id);
  url.searchParams.set('google_domain', 'google.com.br');
  url.searchParams.set('hl', 'pt');
  url.searchParams.set('gl', 'br');
  url.searchParams.set('api_key', apiKey);
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error || `SerpApi HTTP ${response.status}`);
  return payload.place_results || payload.local_results?.[0] || payload;
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
  .select('id,name,google_maps_name,category,address,number,neighborhood,city,state,cep,phone,whatsapp_url,rating,reviews_count,opening_hours,google_maps_url,google_place_id,latitude,longitude,location_source,location_confidence,location_verified_at,location_issue_reason,menu_status_reason,is_deleted,visit_notes,coleta_logs')
  .eq('state', STATE));

const active = rows.filter((row) => !row.is_deleted && normalize(row.city) === normalize(CITY));
const maps = loadRawMaps();
const detailsById = new Map();
const providerErrors = [];

if (FETCH_DETAILS) {
  ensureProviderCredentials(env, SEARCH_PROVIDER);
  const apiKey = SEARCH_PROVIDER === 'serpapi'
    ? (env.SERPAPI_API_KEY || env.VITE_SERPAPI_API_KEY)
    : null;
  const targets = active.filter((row) => row.google_place_id && (
    !row.phone || row.rating == null || row.reviews_count == null || !row.opening_hours
  ));
  for (const [index, row] of targets.entries()) {
    process.stdout.write(`[details ${index + 1}/${targets.length}] ${row.name}\n`);
    try {
      detailsById.set(row.id, await fetchDetails(env, apiKey, row));
    } catch (error) {
      providerErrors.push({ id: row.id, name: row.name, error: error.message || String(error) });
    }
  }
}

const approved = [];
const rejected = [];
const pending = [];
const plannedUpdates = [];

for (const row of active) {
  const rawRecord = recordForRow(row, maps);
  const raw = rawRecord?.result || {};
  const details = detailsById.get(row.id) || {};
  const source = { ...raw, ...details };
  const closedText = [raw.hours, raw.open_state, raw.description, details.hours, details.open_state, details.description].join(' ');
  const closedReason = closedReasonFrom(closedText);
  const restaurantOk = looksRestaurant(row, source);
  const rawAddress = clean(details.address || raw.address);
  const parsed = parseGoogleMapsAddress(rawAddress);
  const patch = {};
  const pendingReasons = [];

  if (closedReason) {
    rejected.push({ id: row.id, name: row.name, reason: closedReason });
    continue;
  }
  if (!restaurantOk) {
    rejected.push({ id: row.id, name: row.name, reason: 'nao_restaurante_ou_categoria_ambigua' });
    continue;
  }

  approved.push(row);

  if (clean(details.title || raw.title) && clean(details.title || raw.title) !== clean(row.google_maps_name || row.name)) {
    patch.google_maps_name = clean(details.title || raw.title);
  }
  if (clean(details.type || raw.type) && clean(details.type || raw.type) !== clean(row.category)) patch.category = clean(details.type || raw.type);
  if (!row.phone && clean(details.phone || raw.phone)) patch.phone = clean(details.phone || raw.phone);
  if (!row.whatsapp_url && (patch.phone || row.phone)) patch.whatsapp_url = whatsappFromPhone(patch.phone || row.phone);
  if (row.rating == null && (details.rating ?? raw.rating) != null) patch.rating = Number(details.rating ?? raw.rating);
  if (row.reviews_count == null && (details.reviews ?? raw.reviews ?? raw.reviews_original) != null) {
    patch.reviews_count = Number(details.reviews ?? raw.reviews ?? raw.reviews_original);
  }

  if (rawAddress) {
    if (isAreaOnlyAddress(parsed)) {
      if ((!row.neighborhood || normalize(row.neighborhood) === normalize(CITY)) && parsed.street) {
        patch.neighborhood = parsed.street;
      }
    } else if (parsed.street && clean(row.address) !== parsed.street) {
      patch.address = parsed.street;
    }
    if (parsed.number && parsed.number !== row.number) patch.number = parsed.number;
    if (parsed.neighborhood && normalize(row.neighborhood) !== normalize(parsed.neighborhood)) patch.neighborhood = parsed.neighborhood;
    if (parsed.cep && clean(row.cep) !== parsed.cep) patch.cep = parsed.cep;
  }

  if (normalize(row.city) !== normalize(CITY)) patch.city = CITY;
  if (normalize(row.state) !== normalize(STATE)) patch.state = STATE;

  const coords = details.gps_coordinates || raw.gps_coordinates || {};
  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);
  if (Number.isFinite(latitude) && row.latitude == null) patch.latitude = latitude;
  if (Number.isFinite(longitude) && row.longitude == null) patch.longitude = longitude;
  if ((patch.latitude != null || patch.longitude != null) && !row.location_source) patch.location_source = `${SEARCH_PROVIDER}_google_maps`;
  if ((patch.latitude != null || patch.longitude != null) && row.location_confidence == null) patch.location_confidence = 0.9;
  if (patch.latitude != null || patch.longitude != null) patch.location_verified_at = new Date().toISOString();

  const hours = normalizeOpeningHours(details.operating_hours) || normalizeOpeningHours(raw.operating_hours);
  if (!row.opening_hours && hours) patch.opening_hours = hours;

  if (!row.cep && !patch.cep) pendingReasons.push('pendente_cep');
  if (!row.phone && !patch.phone) pendingReasons.push('pendente_telefone_google');
  if (row.rating == null && patch.rating == null) pendingReasons.push('pendente_nota_google');
  if (row.reviews_count == null && patch.reviews_count == null) pendingReasons.push('pendente_avaliacoes_google');
  if (!row.opening_hours && !patch.opening_hours) pendingReasons.push('pendente_horario_google');
  if (!row.number && !patch.number) pendingReasons.push('pendente_numero_google');
  if (!row.neighborhood && !patch.neighborhood) pendingReasons.push('pendente_bairro_google');

  const auditLog = {
    cabedelo_phase1_final_audit_v1: {
      auditedAt: new Date().toISOString(),
      status: pendingReasons.length ? 'aprovado_com_pendencias' : 'aprovado',
      pending: pendingReasons,
      cep_status: row.cep || patch.cep ? 'ok' : 'pendente_cep',
      source: detailsById.has(row.id) ? `${SEARCH_PROVIDER}_google_maps_place_details` : `${SEARCH_PROVIDER}_google_maps_cached_raw`,
      rawRunId: rawRecord?.runId || null,
      rawFile: rawRecord?.file || null,
    },
  };

  patch.coleta_logs = mergeLogs(row.coleta_logs, auditLog);

  if (pendingReasons.length) pending.push({ id: row.id, name: row.name, pending: pendingReasons });
  plannedUpdates.push({ id: row.id, name: row.name, patch });
}

const applied = [];
const failed = [];
if (APPLY) {
  for (const item of plannedUpdates) {
    const { error } = await supabase
      .from('restaurants')
      .update(item.patch)
      .eq('id', item.id);
    if (error) failed.push({ id: item.id, name: item.name, error: error.message });
    else applied.push({ id: item.id, name: item.name });
  }
}

const finalRows = APPLY
  ? await selectAll(() => supabase
    .from('restaurants')
    .select('id,name,category,address,number,neighborhood,city,state,cep,phone,whatsapp_url,rating,reviews_count,opening_hours,google_maps_url,google_place_id,latitude,longitude,is_deleted,coleta_logs')
    .eq('city', CITY)
    .eq('state', STATE))
  : active;
const finalActive = finalRows.filter((row) => !row.is_deleted);

const report = {
  runId: RUN_ID,
  apply: APPLY,
  fetchDetails: FETCH_DETAILS,
  city: CITY,
  state: STATE,
  processados: active.length,
  aprovados: approved.length,
  rejeitados: rejected.length,
  pendentes: pending.length,
  atualizacoesPlanejadas: plannedUpdates.length,
  atualizacoesAplicadas: applied.length,
  falhas: failed,
  searchProvider: SEARCH_PROVIDER,
  providerErrors,
  coberturaFinal: {
    google_maps_url: finalActive.filter((row) => row.google_maps_url).length,
    google_place_id: finalActive.filter((row) => row.google_place_id).length,
    coordenadas: finalActive.filter((row) => row.latitude != null && row.longitude != null).length,
    endereco: finalActive.filter((row) => row.address).length,
    numero: finalActive.filter((row) => row.number).length,
    bairro: finalActive.filter((row) => row.neighborhood && normalize(row.neighborhood) !== normalize(CITY)).length,
    cidade_uf: finalActive.filter((row) => normalize(row.city) === normalize(CITY) && normalize(row.state) === normalize(STATE)).length,
    cep: finalActive.filter((row) => row.cep).length,
    telefone: finalActive.filter((row) => row.phone).length,
    whatsapp_url: finalActive.filter((row) => row.whatsapp_url).length,
    nota: finalActive.filter((row) => row.rating != null).length,
    avaliacoes: finalActive.filter((row) => row.reviews_count != null).length,
    horario_funcionamento: finalActive.filter((row) => row.opening_hours).length,
  },
  pendenciasPorTipo: pending.reduce((acc, item) => {
    for (const reason of item.pending) acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {}),
  principaisErrosEncontrados: [
    `${pending.filter((item) => item.pending.includes('pendente_cep')).length} aprovados sem CEP no Google/${SEARCH_PROVIDER}; marcados como pendente_cep em coleta_logs.`,
    `${pending.filter((item) => item.pending.includes('pendente_horario_google')).length} aprovados sem tabela semanal de horario no Google/${SEARCH_PROVIDER}; nao foi inventado horario.`,
    `${pending.filter((item) => item.pending.includes('pendente_telefone_google')).length} aprovados sem telefone no Google/${SEARCH_PROVIDER}.`,
    `${pending.filter((item) => item.pending.includes('pendente_nota_google')).length} aprovados sem nota/avaliacoes no Google/${SEARCH_PROVIDER}.`,
    `${rejected.length} rejeicoes nesta auditoria final; os checks anteriores de fechado e nao-restaurante tambem retornaram zero suspeitos ativos.`,
  ],
  rejeitados: rejected,
  pendentesAmostra: pending.slice(0, 60),
};

const markdown = [
  `# Relatorio Fase 1 Cabedelo/PB`,
  ``,
  `- Run: ${RUN_ID}`,
  `- Modo apply: ${APPLY ? 'sim' : 'nao'}`,
  `- ${SEARCH_PROVIDER} details: ${FETCH_DETAILS ? 'sim' : 'nao'}`,
  ``,
  `## Resumo`,
  ``,
  `- Processados: ${report.processados}`,
  `- Aprovados: ${report.aprovados}`,
  `- Rejeitados: ${report.rejeitados}`,
  `- Pendentes: ${report.pendentes}`,
  `- Atualizacoes aplicadas: ${report.atualizacoesAplicadas}`,
  ``,
  `## Cobertura final`,
  ``,
  ...Object.entries(report.coberturaFinal).map(([key, value]) => `- ${key}: ${value}/${finalActive.length}`),
  ``,
  `## Pendencias por tipo`,
  ``,
  ...Object.entries(report.pendenciasPorTipo).map(([key, value]) => `- ${key}: ${value}`),
  ``,
  `## Principais erros encontrados`,
  ``,
  ...report.principaisErrosEncontrados.map((line) => `- ${line}`),
].join('\n');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'report.md'), `${markdown}\n`);
console.log(JSON.stringify({ ...report, outDir: OUT_DIR }, null, 2));
