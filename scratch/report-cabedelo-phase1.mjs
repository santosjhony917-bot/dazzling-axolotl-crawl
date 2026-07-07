import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const CITY = 'Cabedelo';
const STATE = 'PB';
const argValue = (name, fallback = '') => {
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', `${SEARCH_PROVIDER}-google-maps-phase1`, `report-${RUN_ID}`);

function readEnv() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    if (!env[key]) env[key] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

async function selectAll(queryFactory, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
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

const rows = await selectAll(() => supabase
  .from('restaurants')
  .select('id,name,category,address,number,neighborhood,phone,whatsapp_url,rating,reviews_count,opening_hours,google_maps_url,google_place_id,latitude,longitude,is_deleted')
  .eq('city', CITY)
  .eq('state', STATE));

const active = rows.filter((row) => !row.is_deleted);
const deleted = rows.filter((row) => row.is_deleted);
const categories = Object.entries(active.reduce((map, row) => {
  const key = row.category || 'Sem categoria';
  map[key] = (map[key] || 0) + 1;
  return map;
}, {})).sort((a, b) => b[1] - a[1]);

const report = {
  city: CITY,
  state: STATE,
  searchProvider: SEARCH_PROVIDER,
  totalRows: rows.length,
  activeRows: active.length,
  deletedRows: deleted.length,
  coverage: {
    google_maps_url: active.filter((row) => row.google_maps_url).length,
    google_place_id: active.filter((row) => row.google_place_id).length,
    coordinates: active.filter((row) => row.latitude != null && row.longitude != null).length,
    address: active.filter((row) => row.address).length,
    phone: active.filter((row) => row.phone).length,
    whatsapp_url: active.filter((row) => row.whatsapp_url).length,
    rating: active.filter((row) => row.rating != null).length,
    reviews_count: active.filter((row) => row.reviews_count != null).length,
    opening_hours: active.filter((row) => row.opening_hours).length,
  },
  categories,
  topByReviews: active
    .filter((row) => row.reviews_count != null)
    .sort((a, b) => Number(b.reviews_count || 0) - Number(a.reviews_count || 0))
    .slice(0, 20)
    .map((row) => ({
      name: row.name,
      category: row.category,
      rating: row.rating,
      reviews_count: row.reviews_count,
      phone: row.phone,
    })),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
