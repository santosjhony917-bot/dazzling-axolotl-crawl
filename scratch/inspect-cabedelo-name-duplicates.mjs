import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnv() {
  const env = { ...process.env };
  if (!fs.existsSync('.env')) return env;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}
function norm(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const env = readEnv();
const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from('restaurants')
  .select('id,name,google_maps_name,address,neighborhood,city,state,menu_status,menu_status_reason,ai_validated,is_published,is_deleted')
  .eq('city', 'Cabedelo')
  .eq('state', 'PB')
  .or('name.ilike.%pizza%,name.ilike.%burguer%,google_maps_name.ilike.%pizza%,google_maps_name.ilike.%burguer%')
  .order('name');
if (error) throw error;
const wanted = ['ilovepizzapb', 'eu quero pizza', 'i love burguer'];
const out = (data || [])
  .filter(row => {
    const hay = norm([row.name, row.google_maps_name, row.address].join(' '));
    return wanted.some(w => hay.includes(norm(w)) || norm(w).includes(hay));
  })
  .map(row => ({
    id: row.id,
    name: row.name,
    google_maps_name: row.google_maps_name,
    address: row.address,
    neighborhood: row.neighborhood,
    menu_status: row.menu_status,
    ai_validated: row.ai_validated,
    is_published: row.is_published,
    is_deleted: row.is_deleted,
    reason: row.menu_status_reason,
  }));
console.log(JSON.stringify(out, null, 2));
