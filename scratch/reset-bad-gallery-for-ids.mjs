import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ids = process.argv.slice(2).filter((arg) => /^[0-9a-f-]{36}$/i.test(arg));
if (!ids.length) throw new Error('Informe pelo menos um restaurant_id.');

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

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
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

const { data: restaurants, error: readError } = await supabase
  .from('restaurants')
  .select('id,name,coleta_logs')
  .in('id', ids);
if (readError) throw readError;

const { error: galleryError } = await supabase
  .from('restaurant_gallery')
  .delete()
  .in('restaurant_id', ids);
if (galleryError) throw galleryError;

const now = new Date().toISOString();
for (const restaurant of restaurants || []) {
  const logs = parseJson(restaurant.coleta_logs);
  const { error } = await supabase
    .from('restaurants')
    .update({
      cover_image_url: null,
      ai_validated: false,
      menu_status: 'manual_required',
      menu_status_reason: 'Galeria removida para recoleta com fonte original/API e criterio visual premium.',
      coleta_logs: {
        ...logs,
        gallery_quality_reset_v1: {
          checkedAt: now,
          reason: 'bad_gallery_quality_or_screenshot_source',
          source: 'codex_manual_quality_gate',
        },
      },
    })
    .eq('id', restaurant.id);
  if (error) throw error;
  console.log(JSON.stringify({ reset: restaurant.name, id: restaurant.id }));
}
