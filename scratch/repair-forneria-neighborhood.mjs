import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const id = '0b4eb55c-e0d9-4068-b198-e5f8cb7a985e';
const { data, error } = await supabase
  .from('restaurants')
  .select('coleta_logs')
  .eq('id', id)
  .single();
if (error) throw error;

let logs = {};
try {
  logs = typeof data.coleta_logs === 'string'
    ? JSON.parse(data.coleta_logs || '{}')
    : (data.coleta_logs || {});
} catch {
  logs = {};
}

logs.neighborhood_repair_v1 = {
  repairedAt: new Date().toISOString(),
  neighborhood: 'Monte Castelo',
  source: 'web_search_public_instagram_location_and_instadelivery_portal',
  evidence: [
    'Instagram snippets: Monte Castelo, Cabedelo',
    'InstaDelivery portal: Rua Monte Castelo 12b, Cabedelo/PB',
  ],
};

const { error: updateError } = await supabase
  .from('restaurants')
  .update({
    neighborhood: 'Monte Castelo',
    coleta_logs: JSON.stringify(logs),
  })
  .eq('id', id);
if (updateError) throw updateError;

console.log(JSON.stringify({ updated: true, id, neighborhood: 'Monte Castelo' }, null, 2));
