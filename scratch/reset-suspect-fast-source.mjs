import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const nameLike = process.argv[2] || '';
if (!nameLike) throw new Error('Informe um trecho do nome.');

function readEnv() {
  const env = { ...process.env };
  if (!fs.existsSync('.env')) return env;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
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

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await supabase
  .from('restaurants')
  .select('id,name,other_url,other_url_label,menu_status,menu_status_reason,coleta_logs')
  .ilike('name', `%${nameLike}%`)
  .eq('city', 'Cabedelo');
if (error) throw error;

for (const row of data || []) {
  const logs = parseJson(row.coleta_logs);
  const discovery = logs.serpapi_fast_menu_discovery_v1 || null;
  if (!discovery) {
    console.log(JSON.stringify({ skipped: row.name, reason: 'no_fast_discovery_log' }));
    continue;
  }
  const { error: updateError } = await supabase
    .from('restaurants')
    .update({
      other_url: null,
      other_url_label: null,
      menu_status: 'manual_required',
      menu_status_reason: 'Fonte SerpApi removida: match de marca fraco detectado na revisão automática.',
      coleta_logs: {
        ...logs,
        serpapi_fast_menu_discovery_reverted_v1: {
          revertedAt: new Date().toISOString(),
          previousOtherUrl: row.other_url,
          previousLabel: row.other_url_label,
          previousReason: row.menu_status_reason,
          reason: 'weak_brand_match_after_rule_fix',
        },
      },
    })
    .eq('id', row.id);
  if (updateError) throw updateError;
  console.log(JSON.stringify({ reset: row.name, id: row.id, previousOtherUrl: row.other_url }));
}
