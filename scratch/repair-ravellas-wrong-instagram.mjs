import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnv() {
  const env = { ...process.env };
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

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mergeLogs(value, patch) {
  return JSON.stringify({ ...parseJson(value), ...patch });
}

const id = '47118179-91f8-4cd7-a84d-f015a7d6033f';
const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const { data: row, error: selectError } = await supabase
  .from('restaurants')
  .select('id,name,instagram,social_networks,coleta_logs,city,state')
  .eq('id', id)
  .maybeSingle();
if (selectError) throw selectError;
if (!row) throw new Error('Ravellas row not found');

const currentSocial = Array.isArray(row.social_networks) ? row.social_networks : [];
const update = {
  instagram: null,
  social_networks: currentSocial.filter((item) => item?.platform !== 'instagram'),
  coleta_logs: mergeLogs(row.coleta_logs, {
    browserbase_instagram_hold_rescore_reverted: {
      revertedAt: new Date().toISOString(),
      reason: 'candidate handle euqueropizzafoodtruck was only a mention in evidence, not Ravellas profile',
      removedInstagram: row.instagram || null,
    },
  }),
};

const { error } = await supabase
  .from('restaurants')
  .update(update)
  .eq('id', id)
  .eq('city', 'Cabedelo')
  .eq('state', 'PB');
if (error) throw error;

console.log(JSON.stringify({
  repaired: true,
  id,
  name: row.name,
  removedInstagram: row.instagram,
}, null, 2));
