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

async function countRows(supabase, apply) {
  let query = supabase
    .from('restaurants')
    .select('id', { count: 'exact', head: true })
    .eq('city', 'Cabedelo')
    .eq('state', 'PB');
  query = apply(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
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

const reviewStatuses = ['manual_required', 'blocked', 'failed', 'invalid_source'];
const noMenuStatuses = ['not_found', 'unavailable'];

const counts = {
  prontos: await countRows(supabase, (q) => q.eq('is_deleted', false).eq('is_published', false).eq('menu_status', 'found')),
  revisao: await countRows(supabase, (q) => q.eq('is_deleted', false).eq('is_published', false).in('menu_status', reviewStatuses)),
  sem_cardapio: await countRows(supabase, (q) => q.eq('is_deleted', false).eq('is_published', false).in('menu_status', noMenuStatuses)),
  publicados_com_cardapio: await countRows(supabase, (q) => q.eq('is_deleted', false).eq('is_published', true).eq('menu_status', 'found')),
};

console.log(JSON.stringify(counts, null, 2));
