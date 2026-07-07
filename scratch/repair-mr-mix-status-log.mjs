import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const id = '038a3209-6f23-4395-a5c0-a09ed9bf846b';
const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const index = trimmed.indexOf('=');
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
);

const { data, error: readError } = await supabase
  .from('restaurants')
  .select('coleta_logs')
  .eq('id', id)
  .single();
if (readError) throw readError;

let logs = {};
if (data?.coleta_logs && typeof data.coleta_logs === 'object') logs = data.coleta_logs;
else if (typeof data?.coleta_logs === 'string') {
  try {
    logs = JSON.parse(data.coleta_logs);
  } catch {
    logs = {};
  }
}

logs.google_maps_base = {
  ...(logs.google_maps_base || {}),
  statusText: null,
  statusRepairReason: 'Removido texto de avaliacao capturado indevidamente como status de funcionamento.',
  statusRepairedAt: new Date().toISOString(),
};

const { error } = await supabase
  .from('restaurants')
  .update({ coleta_logs: logs })
  .eq('id', id);
if (error) throw error;
console.log(JSON.stringify({ repaired: true, id }, null, 2));
