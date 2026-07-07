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

const ids = [
  'e6fc253f-7f28-47f8-891f-df98848adda0',
  'c23b0422-4e34-43be-b07e-6a494804f6fc',
];

const { data, error } = await supabase
  .from('restaurants')
  .update({
    ai_validated: true,
    menu_status: 'found',
    menu_status_reason: 'QA estrutural do banco aprovada após ajuste: delta zero em sabor incluso é permitido; sem bloqueios semânticos.',
  })
  .in('id', ids)
  .select('id,name,menu_status,ai_validated');

if (error) throw error;

console.log(JSON.stringify({ restored: data }, null, 2));
