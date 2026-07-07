import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const CITY = 'Campina Grande';
const STATE = 'PB';
const PRESERVE_AFTER = argValue('--preserve-after', '2026-07-06T18:29:00Z');

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
}

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

function classifyOrigin(row) {
  const aiLog = parseJson(row.ai_log);
  const coletaLogs = parseJson(row.coleta_logs);
  const reason = String(row.menu_status_reason || '');
  const checkedMs = Date.parse(row.menu_last_checked_at || '');
  const preserveAfterMs = Date.parse(PRESERVE_AFTER || '');
  const isAfterNewPipelineStart = Number.isFinite(checkedMs)
    && Number.isFinite(preserveAfterMs)
    && checkedMs >= preserveAfterMs;
  const haystack = JSON.stringify({
    reason,
    aiLog,
    coletaLogs,
    other_url: row.other_url,
    external_url: row.external_url,
  });

  if (isAfterNewPipelineStart && /\d+\s+itens?\s+estruturados?\s+via\s+(cardapio_web|anota_ai|instadelivery|brendi|saipos|olaclick|goomer|deliverydireto|deliverymuch|menudino|diggy|meucarrinho|yooga|pedir|hybrid)\b/i.test(reason)) {
    return 'new_structured';
  }
  if (isAfterNewPipelineStart && /structured-menu-collector|structured-menu-collection|browserbase|cardapio_web_fast_path/i.test(haystack)) {
    return 'new_structured';
  }
  if (/validar-ia-extension|extens[aã]o|extension|chrome|p[oó]s-auditoria|curadoria ia|card[aá]pio normalizado pela ia|existing_structured_menu_preserved/i.test(haystack)) {
    return 'old_extension_or_ai';
  }
  return 'unknown_old_ready';
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

const { data: rows, error } = await supabase
  .from('restaurants')
  .select('id,name,menu_status,menu_status_reason,menu_last_checked_at,ai_validated,is_published,is_deleted,other_url,external_url,ai_log,coleta_logs')
  .eq('city', CITY)
  .eq('state', STATE)
  .eq('is_deleted', false)
  .eq('is_published', false)
  .eq('menu_status', 'found')
  .order('menu_last_checked_at', { ascending: false });

if (error) throw error;

const readyRows = rows || [];
const classified = readyRows.map((row) => ({
  row,
  origin: classifyOrigin(row),
}));
const targets = classified.filter((entry) => entry.origin !== 'new_structured');
const preserved = classified.filter((entry) => entry.origin === 'new_structured');
const now = new Date().toISOString();

const counts = classified.reduce((acc, entry) => {
  acc[entry.origin] = (acc[entry.origin] || 0) + 1;
  return acc;
}, {});

const updated = [];
const failed = [];

if (APPLY) {
  for (const { row, origin } of targets) {
    const logs = parseJson(row.coleta_logs);
    const nextLogs = {
      ...logs,
      reset_ready_for_new_structured_review_v1: {
        status: 'reset_to_needs_recollection',
        resetAt: now,
        previous: {
          menu_status: row.menu_status || null,
          menu_status_reason: row.menu_status_reason || null,
          menu_last_checked_at: row.menu_last_checked_at || null,
          ai_validated: row.ai_validated ?? null,
          origin,
        },
        reason: 'Registro estava em Prontos p/ App por validacao antiga/extensao; voltar para pendente para recoleta pelo pipeline estruturado Browserbase/API.',
      },
    };

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        ai_validated: false,
        is_published: false,
        menu_status: 'needs_recollection',
        menu_status_reason: 'Revisao solicitada: estava em Prontos p/ App por validacao antiga/extensao; recoletar pelo pipeline estruturado Browserbase/API antes de publicar.',
        menu_last_checked_at: now,
        coleta_logs: stringifyCompact(nextLogs),
      })
      .eq('id', row.id)
      .eq('menu_status', 'found')
      .eq('is_published', false);

    if (updateError) {
      failed.push({ id: row.id, name: row.name, error: updateError.message });
    } else {
      updated.push({ id: row.id, name: row.name, origin });
    }
  }
}

const result = {
  apply: APPLY,
  city: CITY,
  state: STATE,
  preserveAfter: PRESERVE_AFTER,
  readyFound: readyRows.length,
  counts,
  targetsToReset: targets.length,
  preservedNewStructured: preserved.length,
  updated: updated.length,
  failed,
  targetSamples: targets.slice(0, 80).map(({ row, origin }) => ({
    id: row.id,
    name: row.name,
    origin,
    checked: row.menu_last_checked_at,
    reason: row.menu_status_reason,
    source: row.other_url || row.external_url || '',
  })),
  preservedSamples: preserved.slice(0, 40).map(({ row }) => ({
    id: row.id,
    name: row.name,
    checked: row.menu_last_checked_at,
    reason: row.menu_status_reason,
  })),
};

console.log(JSON.stringify(result, null, 2));
