import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const offset = Number(process.argv[2] || 0);
const limit = Number(process.argv[3] || 10);

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

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const decodeLoose = (value) => {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
  } catch {
    return String(value || '').replace(/\+/g, ' ');
  }
};

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,created_at,name,google_maps_name,google_maps_url,address,city,state,rating,reviews_count,location_issue_reason,coleta_logs')
    .not('google_maps_url', 'is', null)
    .order('created_at', { ascending: true })
    .range(from, from + 999);
  if (error) throw error;
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}

const targets = rows.filter((row) =>
  !normalize(`${row.city} ${row.state} ${row.address} ${row.location_issue_reason}`).includes('campina grande do sul')
  && normalize(row.state) !== 'pr'
  && (
    normalize(row.city).includes('campina grande')
    || normalize(decodeLoose(row.google_maps_url)).includes('campina grande')
    || normalize(row.google_maps_name).includes('campina grande')
    || normalize(row.name).includes('campina grande')
  )
);

console.log(JSON.stringify(
  targets.slice(offset, offset + limit).map((row, index) => ({
    offset: offset + index,
    id: row.id,
    name: row.name,
    address: row.address,
    rating: row.rating,
    reviews: row.reviews_count,
    issue: row.location_issue_reason,
  })),
  null,
  2,
));
