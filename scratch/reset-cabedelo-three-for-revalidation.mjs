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

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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

const { data: rows, error: selectError } = await supabase
  .from('restaurants')
  .select('id,name,coleta_logs')
  .in('id', IDS);
if (selectError) throw selectError;

const { error: deleteGalleryError } = await supabase
  .from('restaurant_gallery')
  .delete()
  .in('restaurant_id', IDS);
if (deleteGalleryError) throw deleteGalleryError;

const now = new Date().toISOString();
for (const row of rows || []) {
  const logs = parseJson(row.coleta_logs);
  const { error } = await supabase
    .from('restaurants')
    .update({
      ai_validated: false,
      image_url: null,
      cover_image_url: null,
      menu_status: 'manual_required',
      menu_status_reason: 'Revalidacao obrigatoria: menu, midia, endereco e horario serao reprocessados pelo pipeline novo antes de Prontos p/ App.',
      coleta_logs: {
        ...logs,
        revalidation_reset_v1: {
          resetAt: now,
          reason: 'Corrigir galeria com pessoas, deltas de adicionais/sabores, placeholders e horario/endereco na tela editar.',
        },
      },
    })
    .eq('id', row.id);
  if (error) throw error;
}

console.log(JSON.stringify({
  resetAt: now,
  restaurants: rows?.map((row) => ({ id: row.id, name: row.name })) || [],
  galleryPurged: true,
  readyCleared: true,
}, null, 2));
