import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const IDS = [
  '8322d0f6-8e08-4de7-a73f-d71c57f0291d',
  '8bae41e4-1365-4def-9857-34e4abdbf329',
  'ecac91e3-52c0-4780-9867-6b3b1d096089',
];

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
  .select('id,name,address,number,neighborhood,city,state,phone,google_place_id,google_maps_url,instagram,image_url,cover_image_url,opening_hours,coleta_logs')
  .in('id', IDS);

if (error) throw error;

for (const row of data || []) {
  const logs = parseJson(row.coleta_logs);
  const { data: galleryRows } = await supabase
    .from('restaurant_gallery')
    .select('id,image_url,order_index')
    .eq('restaurant_id', row.id)
    .order('order_index', { ascending: true });
  console.log(JSON.stringify({
    id: row.id,
    name: row.name,
    address: row.address,
    number: row.number,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    phone: row.phone,
    placeId: row.google_place_id,
    instagram: row.instagram,
    hasLogo: Boolean(row.image_url),
    hasCover: Boolean(row.cover_image_url),
    galleryCount: galleryRows?.length || 0,
    hasHours: Boolean(row.opening_hours),
    sourceFile: logs?.serpapi_google_maps_phase1?.sourceFile || logs?.google_maps_base?.sourceFile || null,
    logKeys: Object.keys(logs || {}),
  }, null, 2));
}
