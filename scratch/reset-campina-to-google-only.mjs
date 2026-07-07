import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const CITY = argValue('--city', 'Campina Grande');
const STATE = argValue('--state', 'PB');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'reset-campina-google-only', RUN_ID);

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
}

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function chunks(values, size = 100) {
  const out = [];
  for (let index = 0; index < values.length; index += size) out.push(values.slice(index, index + size));
  return out;
}

async function selectAll(queryFactory, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await queryFactory().range(from, to);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function existingPayload(row, payload) {
  const allowed = new Set(Object.keys(row || {}));
  return Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.has(key)));
}

function uniqueIds(rows) {
  return [...new Set(rows.map((row) => row.id).filter(Boolean))];
}

function writeJson(name, value) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(value, null, 2));
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

const restaurants = await selectAll(() => supabase
  .from('restaurants')
  .select('*')
  .eq('city', CITY)
  .eq('state', STATE)
  .eq('is_deleted', false)
  .order('created_at', { ascending: true }));

const restaurantIds = uniqueIds(restaurants);
const withGoogleUrl = restaurants.filter((row) => row.google_maps_url);
const withoutGoogleUrl = restaurants.filter((row) => !row.google_maps_url);

let menuCategories = [];
for (const idChunk of chunks(restaurantIds, 100)) {
  const part = await selectAll(() => supabase
    .from('menu_categories')
    .select('*')
    .in('restaurant_id', idChunk));
  menuCategories.push(...part);
}

const categoryIds = uniqueIds(menuCategories);
let menuItems = [];
for (const idChunk of chunks(categoryIds, 100)) {
  const part = await selectAll(() => supabase
    .from('menu_items')
    .select('*')
    .in('category_id', idChunk));
  menuItems.push(...part);
}

const itemIds = uniqueIds(menuItems);
let menuOptionGroups = [];
let menuItemOptions = [];
for (const idChunk of chunks(itemIds, 100)) {
  const groups = await selectAll(() => supabase
    .from('menu_option_groups')
    .select('*')
    .in('menu_item_id', idChunk));
  const options = await selectAll(() => supabase
    .from('menu_item_options')
    .select('*')
    .in('menu_item_id', idChunk));
  menuOptionGroups.push(...groups);
  menuItemOptions.push(...options);
}

let restaurantGallery = [];
for (const idChunk of chunks(restaurantIds, 100)) {
  const part = await selectAll(() => supabase
    .from('restaurant_gallery')
    .select('*')
    .in('restaurant_id', idChunk));
  restaurantGallery.push(...part);
}

const baseReset = {
  ai_validated: false,
  is_published: false,
  menu_status: 'unknown',
  menu_status_reason: null,
  menu_last_checked_at: null,
  address: null,
  ai_log: null,
  ai_normalized_name: null,
  category: null,
  cep: null,
  cnpj: null,
  coleta_logs: null,
  contact_candidates: null,
  contacts_last_checked_at: null,
  cover_image_url: null,
  description: null,
  email: null,
  external_url: null,
  followers_override: null,
  google_maps_name: null,
  google_place_id: null,
  ifood_url: null,
  image_url: null,
  instagram_url: null,
  latitude: null,
  location_confidence: null,
  location_issue_reason: null,
  location_source: null,
  location_verified_at: null,
  longitude: null,
  name_cleanup_notes: null,
  neighborhood: null,
  number: null,
  opening_hours: null,
  other_url: null,
  other_url_label: null,
  phone: null,
  primary_contact_source: null,
  rating: null,
  reviews_count: null,
  social_networks: null,
  temporarily_closed: null,
  permanently_closed: null,
  whatsapp_url: null,
};

const resetPayload = restaurants[0] ? existingPayload(restaurants[0], baseReset) : {};
const resetColumns = Object.keys(resetPayload).sort();
const now = new Date().toISOString();
const summary = {
  apply: APPLY,
  runId: RUN_ID,
  outDir: OUT_DIR,
  city: CITY,
  state: STATE,
  restaurantsFound: restaurants.length,
  withGoogleMapsUrl: withGoogleUrl.length,
  withoutGoogleMapsUrl: withoutGoogleUrl.length,
  menuCategories: menuCategories.length,
  menuItems: menuItems.length,
  menuOptionGroups: menuOptionGroups.length,
  menuItemOptions: menuItemOptions.length,
  restaurantGallery: restaurantGallery.length,
  resetColumns,
  preservedColumns: [
    'id',
    'created_at',
    'name',
    'city',
    'state',
    'google_maps_url',
    'plan',
    'user_id',
    'is_deleted',
  ],
  samplesWithoutGoogleUrl: withoutGoogleUrl.slice(0, 30).map((row) => ({
    id: row.id,
    name: row.name,
    google_maps_url: row.google_maps_url,
  })),
  readyBefore: restaurants.filter((row) => row.menu_status === 'found').length,
  generatedAt: now,
};

writeJson('summary.json', summary);

const failures = [];
if (APPLY) {
  writeJson('restaurants-before.json', restaurants);
  writeJson('menu-categories-before.json', menuCategories);
  writeJson('menu-items-before.json', menuItems);
  writeJson('menu-option-groups-before.json', menuOptionGroups);
  writeJson('menu-item-options-before.json', menuItemOptions);
  writeJson('restaurant-gallery-before.json', restaurantGallery);

  for (const idChunk of chunks(categoryIds, 100)) {
    const { error } = await supabase.from('menu_categories').delete().in('id', idChunk);
    if (error) failures.push({ table: 'menu_categories', ids: idChunk, error: error.message });
  }

  for (const idChunk of chunks(restaurantGallery.map((row) => row.id).filter(Boolean), 100)) {
    const { error } = await supabase.from('restaurant_gallery').delete().in('id', idChunk);
    if (error) failures.push({ table: 'restaurant_gallery', ids: idChunk, error: error.message });
  }

  for (const idChunk of chunks(restaurantIds, 100)) {
    const { error } = await supabase
      .from('restaurants')
      .update(resetPayload)
      .in('id', idChunk);
    if (error) failures.push({ table: 'restaurants', ids: idChunk, error: error.message });
  }
}

const { count: finalReadyCount, error: finalReadyError } = await supabase
  .from('restaurants')
  .select('id', { count: 'exact', head: true })
  .eq('city', CITY)
  .eq('state', STATE)
  .eq('is_deleted', false)
  .eq('is_published', false)
  .eq('menu_status', 'found');

if (finalReadyError) throw finalReadyError;

const result = {
  ...summary,
  finalReadyCount,
  failures,
  appliedAt: APPLY ? new Date().toISOString() : null,
};

writeJson('result.json', result);
console.log(JSON.stringify(result, null, 2));
