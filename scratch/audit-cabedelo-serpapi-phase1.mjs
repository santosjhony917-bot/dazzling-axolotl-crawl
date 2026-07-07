import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--soft-delete');
const CITY = 'Cabedelo';
const STATE = 'PB';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'serpapi-google-maps-phase1', `audit-${RUN_ID}`);

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
    .toLowerCase();
}

function parseColetaLogs(value) {
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

function source(row) {
  const logs = parseColetaLogs(row.coleta_logs);
  return logs.phase1_serpapi_google_maps_v1 || {};
}

function reasonFor(row) {
  const src = source(row);
  const name = normalize(row.name);
  const type = normalize(src.source_category || row.category || '');
  const address = normalize(src.source_address || row.address || '');
  const lat = Number(row.latitude);

  if (/^(intermares|ponta de campina)$/.test(name)) return 'place_is_beach_or_area_not_establishment';
  if (/^(praia|playground|torrefacao de cafe|local para eventos)$/.test(type)) return 'category_not_restaurant_lead';
  if (/joao pessoa\s*-\s*pb|manaira/.test(address)) return 'outside_cabedelo_address';
  if (/bessa/.test(address) && Number.isFinite(lat) && lat < -7.076) return 'outside_cabedelo_bessa_south';
  if (/sao braz s\/a|coffee shop sao braz|medellin cafe/.test(name)) return 'outside_cabedelo_or_non_food_chain_unit';
  return null;
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
  .select('id,name,city,state,category,address,latitude,longitude,google_maps_url,menu_status,menu_status_reason,is_deleted,visit_notes,coleta_logs')
  .eq('city', CITY)
  .eq('state', STATE)
  .eq('is_deleted', false));

const suspects = rows
  .map((row) => {
    const src = source(row);
    return {
      id: row.id,
      name: row.name,
      source_category: src.source_category || null,
      source_address: src.source_address || row.address || null,
      latitude: row.latitude,
      longitude: row.longitude,
      google_maps_url: row.google_maps_url,
      reason: reasonFor(row),
    };
  })
  .filter((row) => row.reason);

const result = {
  apply: APPLY,
  city: CITY,
  state: STATE,
  activeRows: rows.length,
  suspectCount: suspects.length,
  suspects,
  deleted: [],
  failed: [],
};

if (APPLY && suspects.length) {
  for (const suspect of suspects) {
    const row = rows.find((item) => item.id === suspect.id);
    const note = [
      row?.visit_notes || '',
      '',
      `[${new Date().toISOString()}] Removido da Fase 1 SerpApi: ${suspect.reason}.`,
    ].join('\n').trim();
    const { error } = await supabase
      .from('restaurants')
      .update({
        is_deleted: true,
        menu_status_reason: suspect.reason,
        visit_notes: note,
      })
      .eq('id', suspect.id);
    if (error) {
      result.failed.push({ id: suspect.id, name: suspect.name, error: error.message });
    } else {
      result.deleted.push({ id: suspect.id, name: suspect.name, reason: suspect.reason });
    }
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'audit.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
