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
  .select('id,name,menu_status,menu_status_reason,ai_validated,is_published,is_deleted,city,state')
  .in('id', IDS)
  .order('name');
if (error) throw error;

const rows = data || [];
const uiBuckets = rows.map((row) => {
  let bucket = 'pendentes';
  if (row.is_deleted) bucket = 'rejeitados';
  else if (row.is_published && row.menu_status === 'found') bucket = 'base_publicada';
  else if (!row.is_published && row.menu_status === 'found') bucket = 'prontos';
  else if (['not_found', 'unavailable'].includes(row.menu_status)) bucket = 'sem_cardapio';
  else if (['manual_required', 'blocked', 'failed', 'invalid_source'].includes(row.menu_status)) bucket = 'revisao';
  return { ...row, expectedUiBucket: bucket };
});

console.log(JSON.stringify(uiBuckets, null, 2));
