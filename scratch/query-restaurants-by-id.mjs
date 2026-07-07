import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ids = process.argv.slice(2).filter(Boolean);
if (ids.length === 0) {
  console.error('Usage: node scratch/query-restaurants-by-id.mjs <id> [...]');
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

const { data, error } = await supabase
  .from('restaurants')
  .select('id,name,google_maps_name,category,address,number,neighborhood,city,state,phone,whatsapp_url,instagram,other_url,external_url,menu_status,coleta_logs,is_deleted')
  .in('id', ids);

if (error) throw error;
console.log(JSON.stringify(data, null, 2));
