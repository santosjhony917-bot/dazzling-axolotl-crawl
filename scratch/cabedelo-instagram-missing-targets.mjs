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
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
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
  .select('id,name,reviews_count,instagram')
  .eq('city', 'Cabedelo')
  .eq('state', 'PB')
  .or('is_deleted.eq.false,is_deleted.is.null')
  .order('reviews_count', { ascending: false, nullsFirst: false });

if (error) throw error;

const active = data || [];
const missing = active.filter((row) => !String(row.instagram || '').trim());
const idsFile = 'scratch/cabedelo-instagram-missing-ids.txt';
fs.writeFileSync(idsFile, missing.map((row) => row.id).join('\n'), 'utf8');

console.log(JSON.stringify({
  active: active.length,
  withInstagram: active.length - missing.length,
  missingInstagram: missing.length,
  idsFile,
  sample: missing.slice(0, 20).map((row) => ({
    id: row.id,
    name: row.name,
    reviews_count: row.reviews_count,
  })),
}, null, 2));
