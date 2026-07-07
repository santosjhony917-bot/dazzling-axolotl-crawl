import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};

const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const RUNS = argValue('--runs', '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

function readEnv() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}

function readProcessedIds(runs) {
  const ids = [];
  for (const run of runs) {
    const file = path.join('scratch', `${SEARCH_PROVIDER}-menu-discovery`, run, 'results.jsonl');
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
      const row = JSON.parse(line);
      if (row.restaurant?.id) ids.push(row.restaurant.id);
    }
  }
  return ids;
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

const processedIds = readProcessedIds(RUNS);
const processedUnique = new Set(processedIds);
const { data, error } = await supabase
  .from('restaurants')
  .select('id,name,reviews_count,instagram,is_deleted')
  .eq('city', CITY)
  .eq('state', STATE)
  .or('is_deleted.eq.false,is_deleted.is.null');

if (error) throw error;

const active = data || [];
const unprocessed = active
  .filter((row) => !processedUnique.has(row.id))
  .sort((a, b) => (b.reviews_count ?? -1) - (a.reviews_count ?? -1)
    || String(a.name || '').localeCompare(String(b.name || '')));

const outFile = path.join('scratch', `${CITY.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-instagram-unprocessed-ids.txt`);
fs.writeFileSync(outFile, unprocessed.map((row) => row.id).join('\n'), 'utf8');

console.log(JSON.stringify({
  city: CITY,
  state: STATE,
  searchProvider: SEARCH_PROVIDER,
  active: active.length,
  processedRows: processedIds.length,
  processedUnique: processedUnique.size,
  duplicatedSearches: processedIds.length - processedUnique.size,
  unprocessed: unprocessed.length,
  withInstagramInDatabase: active.filter((row) => row.instagram && String(row.instagram).trim()).length,
  unprocessedIdsFile: outFile,
  unprocessedSample: unprocessed.slice(0, 30).map((row) => ({
    id: row.id,
    name: row.name,
    reviews_count: row.reviews_count,
  })),
}, null, 2));
