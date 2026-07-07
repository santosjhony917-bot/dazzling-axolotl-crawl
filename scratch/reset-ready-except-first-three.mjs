import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const CITY = 'Campina Grande';
const STATE = 'PB';
const KEEP_READY_IDS = new Set([
  '395c5d1a-99f7-40e3-82f3-af6e22406e75', // Bar da Curva - Sandro's Bar
  '528002c2-69ff-4e98-9646-8ed10b97ea69', // Restaurante Daikon
  '838f1dd1-a1a6-4969-ae6f-e3af43e66f96', // Seu Bibi Pastelaria
]);

function readEnv() {
  const envPath = path.resolve('.env');
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}

function stringifyCompact(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
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

const { data: readyRows, error } = await supabase
  .from('restaurants')
  .select('id,name,menu_status,menu_status_reason,menu_last_checked_at,ai_validated,is_published,is_deleted,coleta_logs')
  .eq('city', CITY)
  .eq('state', STATE)
  .eq('is_deleted', false)
  .eq('is_published', false)
  .eq('menu_status', 'found')
  .order('menu_last_checked_at', { ascending: false });

if (error) throw error;

const rows = readyRows || [];
const keep = rows.filter((row) => KEEP_READY_IDS.has(row.id));
const resetTargets = rows.filter((row) => !KEEP_READY_IDS.has(row.id));
const now = new Date().toISOString();

const updated = [];
const failed = [];

if (APPLY) {
  for (const row of resetTargets) {
    const logs = parseJson(row.coleta_logs);
    const nextLogs = {
      ...logs,
      reset_ready_except_first_three_v1: {
        status: 'reset_to_needs_recollection',
        resetAt: now,
        previous: {
          menu_status: row.menu_status || null,
          menu_status_reason: row.menu_status_reason || null,
          menu_last_checked_at: row.menu_last_checked_at || null,
          ai_validated: row.ai_validated ?? null,
        },
        reason: 'Usuario decidiu preservar somente os 3 primeiros cardapios estruturados aprovados; demais prontos devem ser refeitos pelo novo pipeline.',
      },
    };

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        ai_validated: false,
        is_published: false,
        menu_status: 'needs_recollection',
        menu_status_reason: 'Revisao solicitada: manter somente os 3 primeiros prontos; recoletar este cardapio pelo novo pipeline antes de publicar.',
        menu_last_checked_at: now,
        coleta_logs: stringifyCompact(nextLogs),
      })
      .eq('id', row.id)
      .eq('menu_status', 'found')
      .eq('is_published', false);

    if (updateError) {
      failed.push({ id: row.id, name: row.name, error: updateError.message });
    } else {
      updated.push({ id: row.id, name: row.name });
    }
  }
}

const { count: finalReadyCount, error: finalError } = await supabase
  .from('restaurants')
  .select('id', { count: 'exact', head: true })
  .eq('city', CITY)
  .eq('state', STATE)
  .eq('is_deleted', false)
  .eq('is_published', false)
  .eq('menu_status', 'found');

if (finalError) throw finalError;

console.log(JSON.stringify({
  apply: APPLY,
  city: CITY,
  state: STATE,
  readyBefore: rows.length,
  keepReady: keep.map((row) => ({
    id: row.id,
    name: row.name,
    checked: row.menu_last_checked_at,
    reason: row.menu_status_reason,
  })),
  targetsToReset: resetTargets.length,
  updated: updated.length,
  failed,
  finalReadyCount,
  resetSamples: resetTargets.slice(0, 80).map((row) => ({
    id: row.id,
    name: row.name,
    checked: row.menu_last_checked_at,
    reason: row.menu_status_reason,
  })),
}, null, 2));
