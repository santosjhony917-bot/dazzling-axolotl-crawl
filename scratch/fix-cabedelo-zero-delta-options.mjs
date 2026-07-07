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

function byId(rows) {
  const map = new Map();
  for (const row of rows || []) map.set(row.id, row);
  return map;
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

const { data: restaurants, error: restaurantError } = await supabase
  .from('restaurants')
  .select('id,name')
  .in('id', IDS);
if (restaurantError) throw restaurantError;

const { data: categories, error: categoryError } = await supabase
  .from('menu_categories')
  .select('id,restaurant_id')
  .in('restaurant_id', IDS);
if (categoryError) throw categoryError;

const categoryIds = (categories || []).map((category) => category.id);
const { data: items, error: itemError } = categoryIds.length
  ? await supabase
    .from('menu_items')
    .select('id,category_id,name')
    .in('category_id', categoryIds)
  : { data: [], error: null };
if (itemError) throw itemError;

const itemIds = (items || []).map((item) => item.id);
const { data: options, error: optionError } = itemIds.length
  ? await supabase
    .from('menu_item_options')
    .select('id,menu_item_id,name,group_name,price,price_delta,price_behavior')
    .in('menu_item_id', itemIds)
    .eq('price_behavior', 'price_delta')
  : { data: [], error: null };
if (optionError) throw optionError;

const restaurantById = byId(restaurants);
const categoryById = byId(categories);
const itemById = byId(items);

const itemRestaurantId = new Map();
for (const item of items || []) {
  const category = categoryById.get(item.category_id);
  if (category) itemRestaurantId.set(item.id, category.restaurant_id);
}

const bad = (options || []).filter((option) => {
  const delta = option.price_delta == null ? null : Number(option.price_delta);
  return delta == null || !Number.isFinite(delta) || delta <= 0;
});

if (bad.length) {
  const { error: updateError } = await supabase
    .from('menu_item_options')
    .update({
      price_behavior: 'included',
      price: null,
      price_delta: null,
    })
    .in('id', bad.map((option) => option.id));
  if (updateError) throw updateError;
}

const byRestaurant = {};
for (const option of bad) {
  const restaurantId = itemRestaurantId.get(option.menu_item_id) || 'unknown';
  const restaurantName = restaurantById.get(restaurantId)?.name || restaurantId;
  byRestaurant[restaurantName] = (byRestaurant[restaurantName] || 0) + 1;
}

console.log(JSON.stringify({
  checkedPriceDeltaOptions: (options || []).length,
  correctedToIncluded: bad.length,
  byRestaurant,
  sample: bad.slice(0, 10).map((option) => ({
    item: itemById.get(option.menu_item_id)?.name || option.menu_item_id,
    group: option.group_name,
    option: option.name,
    previousPrice: option.price,
    previousDelta: option.price_delta,
  })),
}, null, 2));
