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

const idsPath = 'scratch/cabedelo-green-2026-07-07-ids.txt';
const ids = fs.readFileSync(idsPath, 'utf8').split(/\s+/).filter(Boolean);

const operationalRe = /\b(ketchup|catchup|talher|talheres|guardanapo|descartavel|descartaveis|sacola|embalagem|cpf|troco)\b/i;

function inc(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

const { data: restaurants, error: restaurantError } = await supabase
  .from('restaurants')
  .select('id,name,google_maps_name,city,state,menu_status,menu_status_reason,other_url,external_url,menu_last_checked_at')
  .in('id', ids);
if (restaurantError) throw restaurantError;

const { data: categories, error: categoryError } = await supabase
  .from('menu_categories')
  .select('id,restaurant_id,name')
  .in('restaurant_id', ids);
if (categoryError) throw categoryError;

const categoryIds = (categories || []).map((category) => category.id);
let items = [];
if (categoryIds.length) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id,category_id,name,price')
    .in('category_id', categoryIds);
  if (error) throw error;
  items = data || [];
}

const itemIds = items.map((item) => item.id);
let options = [];
if (itemIds.length) {
  const { data, error } = await supabase
    .from('menu_item_options')
    .select('id,menu_item_id,name,group_name,price,price_delta,price_behavior')
    .in('menu_item_id', itemIds);
  if (error) throw error;
  options = data || [];
}

const restaurantById = new Map((restaurants || []).map((restaurant) => [restaurant.id, restaurant]));
const restaurantByCategoryId = new Map((categories || []).map((category) => [category.id, category.restaurant_id]));
const restaurantByItemId = new Map(items.map((item) => [item.id, restaurantByCategoryId.get(item.category_id)]));

const categoriesByRestaurant = new Map();
for (const category of categories || []) inc(categoriesByRestaurant, category.restaurant_id);

const itemsByRestaurant = new Map();
for (const item of items) inc(itemsByRestaurant, restaurantByCategoryId.get(item.category_id));

const optionsByRestaurant = new Map();
let operationalOptionsDetected = 0;
let priceDeltaRowsWithPriceFilled = 0;
for (const option of options) {
  const restaurantId = restaurantByItemId.get(option.menu_item_id);
  inc(optionsByRestaurant, restaurantId);
  if (operationalRe.test(`${option.group_name || ''} ${option.name || ''}`)) operationalOptionsDetected += 1;
  if (option.price_behavior === 'price_delta' && option.price !== null && option.price !== undefined) {
    priceDeltaRowsWithPriceFilled += 1;
  }
}

const rows = ids.map((id) => {
  const restaurant = restaurantById.get(id) || { id };
  return {
    id,
    name: restaurant.google_maps_name || restaurant.name || null,
    status: restaurant.menu_status || null,
    categories: categoriesByRestaurant.get(id) || 0,
    items: itemsByRestaurant.get(id) || 0,
    options: optionsByRestaurant.get(id) || 0,
    lastCheckedAt: restaurant.menu_last_checked_at || null,
    reason: restaurant.menu_status_reason || null,
    url: restaurant.other_url || restaurant.external_url || null,
  };
});

console.log(JSON.stringify({
  ids: ids.length,
  restaurants: restaurants?.length || 0,
  totalCategories: categories?.length || 0,
  totalItems: items.length,
  totalOptions: options.length,
  operationalOptionsDetected,
  priceDeltaRowsWithPriceFilled,
  rows,
}, null, 2));
