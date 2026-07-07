import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error('Use: node scratch/inspect-whatsapp-response-logs.mjs <restaurant_id> [...]');
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

const { data, error } = await supabase
  .from('restaurants')
  .select('id,name,phone,whatsapp_url,other_url,external_url,other_url_label,menu_status,menu_status_reason,coleta_logs')
  .in('id', ids);

if (error) throw error;

for (const row of data || []) {
  const logs = parseJson(row.coleta_logs);
  console.log(JSON.stringify({
    id: row.id,
    name: row.name,
    phone: row.phone,
    whatsapp_url: row.whatsapp_url,
    other_url: row.other_url,
    external_url: row.external_url,
    other_url_label: row.other_url_label,
    menu_status: row.menu_status,
    menu_status_reason: row.menu_status_reason,
    whatsappQueue: logs.campina_menu_whatsapp_queue_v1 || null,
    whatsappResponse: logs.campina_menu_whatsapp_response_v1 || null,
  }, null, 2));
}
