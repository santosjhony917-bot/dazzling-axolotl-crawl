import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const id = process.argv[2];
if (!id) {
  throw new Error('Usage: node scratch/inspect-restaurant.mjs <restaurant-id>');
}

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

const { data, error } = await supabase
  .from('restaurants')
  .select('id,name,google_maps_name,google_maps_url,address,number,neighborhood,city,state,cep,phone,rating,reviews_count,opening_hours,location_issue_reason,coleta_logs')
  .eq('id', id)
  .single();

if (error) throw error;
console.log(JSON.stringify(data, null, 2));
