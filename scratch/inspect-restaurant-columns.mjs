import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

const wanted = [
  'id',
  'name',
  'address',
  'number',
  'neighborhood',
  'city',
  'state',
  'phone',
  'whatsapp_url',
  'instagram',
  'social_networks',
  'rating',
  'reviews_count',
  'opening_hours',
  'google_maps_url',
  'google_place_id',
  'google_maps_name',
  'latitude',
  'longitude',
  'location_source',
  'location_confidence',
  'location_verified_at',
  'location_issue_reason',
  'category',
  'is_deleted',
  'coleta_logs',
];

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const result = {};
for (const column of wanted) {
  const { error } = await supabase
    .from('restaurants')
    .select(column)
    .limit(1);
  result[column] = error ? { exists: false, error: error.message } : { exists: true };
}

console.log(JSON.stringify(result, null, 2));
