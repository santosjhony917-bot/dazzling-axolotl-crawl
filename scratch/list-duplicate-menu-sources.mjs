import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,google_maps_name,other_url,external_url,other_url_label,menu_status')
    .eq('city', 'Campina Grande')
    .eq('state', 'PB')
    .eq('is_deleted', false)
    .range(from, from + 999);
  if (error) throw error;
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}

const map = new Map();
for (const row of rows) {
  const url = row.other_url || row.external_url;
  if (!url) continue;
  if (!map.has(url)) map.set(url, []);
  map.get(url).push(row);
}

const duplicates = [...map.entries()]
  .filter(([, grouped]) => grouped.length > 1)
  .map(([url, grouped]) => ({
    url,
    count: grouped.length,
    labels: [...new Set(grouped.map((row) => row.other_url_label).filter(Boolean))],
    restaurants: grouped.map((row) => ({
      id: row.id,
      name: row.google_maps_name || row.name,
      status: row.menu_status,
    })),
  }))
  .sort((a, b) => b.count - a.count || a.url.localeCompare(b.url));

console.log(JSON.stringify({
  duplicateUrlCount: duplicates.length,
  duplicates: duplicates.slice(0, 80),
}, null, 2));
