import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const id = process.argv[2];
if (!id) throw new Error('Informe restaurant_id.');

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

function safeJson(value) {
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

const { data: restaurant, error: restaurantError } = await supabase
  .from('restaurants')
  .select('id,name,address,number,neighborhood,city,state,cep,latitude,longitude,instagram,followers_override,image_url,cover_image_url,menu_status,menu_status_reason,ai_validated,coleta_logs,other_url')
  .eq('id', id)
  .single();
if (restaurantError) throw restaurantError;

const { data: gallery, error: galleryError } = await supabase
  .from('restaurant_gallery')
  .select('*')
  .eq('restaurant_id', id)
  .order('order_index');
if (galleryError) throw galleryError;

const logs = safeJson(restaurant.coleta_logs);
console.log(JSON.stringify({
  restaurant: {
    ...restaurant,
    coleta_logs: undefined,
    logKeys: Object.keys(logs),
    phase1: logs.phase1_serpapi_google_maps_v1 || null,
    instagramReview: logs.serpapi_instagram_unsafe_review_fast_apply || null,
    media: logs.apify_instagram_media_enrichment || logs.apify_instagram_original_gallery_enrichment_v1 || logs.serpapi_google_photos_enrichment_v1 || null,
  },
  galleryColumns: gallery?.[0] ? Object.keys(gallery[0]) : [],
  gallery: (gallery || []).map((row) => ({
    id: row.id,
    image_url: row.image_url,
    caption: row.caption,
    order_index: row.order_index,
    keys: Object.keys(row),
    metadata: row.metadata || row.meta || row.extra || null,
  })),
}, null, 2));
