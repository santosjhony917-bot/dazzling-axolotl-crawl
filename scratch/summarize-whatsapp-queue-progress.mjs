import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const queueFile = process.argv.find(arg => arg.startsWith('--queue='))?.slice('--queue='.length);
if (!queueFile) {
  console.error('Use --queue=<queue.json>');
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const index = trimmed.indexOf('=');
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const parseJson = value => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch {}
  }
  return {};
};

const queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
const ids = queue.map(row => row.restaurant_id);
const rows = [];
for (let index = 0; index < ids.length; index += 100) {
  const chunk = ids.slice(index, index + 100);
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,coleta_logs,menu_status,other_url,external_url,whatsapp_url,phone')
    .in('id', chunk);
  if (error) throw error;
  rows.push(...(data || []));
}

const byId = new Map(rows.map(row => [row.id, row]));
const queueStatus = {};
const responseStatus = {};
const samples = {
  sent: [],
  invalid_phone: [],
  chat_not_ready: [],
  link_menu_received: [],
  image_menu_received: [],
  document_menu_received: [],
};

for (const entry of queue) {
  const row = byId.get(entry.restaurant_id);
  const logs = parseJson(row?.coleta_logs);
  const queueLog = logs.campina_menu_whatsapp_queue_v1 || {};
  const responseLog = logs.campina_menu_whatsapp_response_v1 || {};
  const qStatus = queueLog.status || 'not_started';
  const rStatus = responseLog.status || 'no_response_saved';
  queueStatus[qStatus] = (queueStatus[qStatus] || 0) + 1;
  responseStatus[rStatus] = (responseStatus[rStatus] || 0) + 1;
  if (samples[qStatus] && samples[qStatus].length < 8) samples[qStatus].push(entry.name);
  if (samples[rStatus] && samples[rStatus].length < 8) samples[rStatus].push(entry.name);
}

console.log(JSON.stringify({
  queueFile,
  total: queue.length,
  queueStatus,
  responseStatus,
  samples,
}, null, 2));
