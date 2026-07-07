import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
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
const OUT_DIR = path.join(ROOT, `closed-cleanup-${RUN_ID}`);

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

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mergeLogs(value, patch) {
  return JSON.stringify({ ...parseJson(value), ...patch });
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

function parseJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function loadRawByPlaceId() {
  const byPlaceId = new Map();
  if (!fs.existsSync(ROOT)) return byPlaceId;
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{4}-/.test(entry.name)) continue;
    const runDir = path.join(ROOT, entry.name);
    for (const file of fs.readdirSync(runDir).filter((name) => /^raw-\d+\.json$/.test(name))) {
      const raw = parseJsonFile(path.join(runDir, file));
      for (const result of raw?.local_results || []) {
        if (result.place_id) byPlaceId.set(result.place_id, { result, runId: entry.name, file });
      }
    }
  }
  return byPlaceId;
}

function closedReasonFromText(value) {
  const text = normalize(value);
  if (/fechado permanentemente|permanently closed/.test(text)) return 'permanently_closed';
  if (/fechado temporariamente|temporarily closed/.test(text)) return 'temporarily_closed';
  return '';
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
  .select('id,name,category,city,state,google_place_id,coleta_logs,visit_notes,is_deleted')
  .eq('city', CITY)
  .eq('state', STATE)
  .eq('is_deleted', false));

const rawByPlaceId = loadRawByPlaceId();
const planned = [];

for (const row of rows) {
  const logs = parseJson(row.coleta_logs);
  const raw = row.google_place_id ? rawByPlaceId.get(row.google_place_id) : null;
  const evidenceText = [
    logs[`phase1_${SEARCH_PROVIDER}_google_maps_backfill_v1`]?.hours_source,
    logs.phase1_dataforseo_google_maps_backfill_v1?.hours_source,
    logs.phase1_serpapi_google_maps_backfill_v1?.hours_source,
    raw?.result?.hours,
    raw?.result?.open_state,
    raw?.result?.description,
  ].filter(Boolean).join(' | ');
  const reason = closedReasonFromText(evidenceText);
  if (!reason) continue;
  planned.push({
    id: row.id,
    name: row.name,
    category: row.category,
    reason,
    evidenceText: clean(evidenceText),
    rawRunId: raw?.runId || null,
    rawFile: raw?.file || null,
    update: {
      is_deleted: true,
      menu_status_reason: `Removido da expansao: Google/${SEARCH_PROVIDER} indicou ${reason === 'permanently_closed' ? 'fechado permanentemente' : 'fechado temporariamente'}.`,
      visit_notes: clean(`${row.visit_notes || ''}\n[${new Date().toISOString()}] Soft-delete automatico Cabedelo: ${reason}; evidencia Google/${SEARCH_PROVIDER}: ${clean(evidenceText).slice(0, 240)}`),
      coleta_logs: mergeLogs(row.coleta_logs, {
        cabedelo_closed_status_cleanup_v1: {
          reason,
          cleanedAt: new Date().toISOString(),
          evidenceText: clean(evidenceText),
          rawRunId: raw?.runId || null,
          rawFile: raw?.file || null,
        },
      }),
    },
  });
}

const updated = [];
const failed = [];
if (APPLY) {
  for (const item of planned) {
    const { error } = await supabase
      .from('restaurants')
      .update(item.update)
      .eq('id', item.id);
    if (error) failed.push({ id: item.id, name: item.name, error: error.message });
    else updated.push({ id: item.id, name: item.name, reason: item.reason });
  }
}

const summary = {
  apply: APPLY,
  city: CITY,
  state: STATE,
  activeRows: rows.length,
  plannedRemovals: planned.length,
  updated: updated.length,
  failed,
  planned: planned.map(({ update, ...item }) => item),
  updatedRows: updated,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
