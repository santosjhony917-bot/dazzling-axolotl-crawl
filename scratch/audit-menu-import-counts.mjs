import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const restaurantId = process.argv[2];
if (!restaurantId) {
  console.error('Usage: node scratch/audit-menu-import-counts.mjs <restaurant-id>');
  process.exit(1);
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
  .select('id,name,google_maps_name,menu_status,other_url,external_url')
  .eq('id', restaurantId)
  .single();
if (restaurantError) throw restaurantError;

const { data: categories, error: categoryError } = await supabase
  .from('menu_categories')
  .select('id,name,order_index')
  .eq('restaurant_id', restaurantId)
  .order('order_index');
if (categoryError) throw categoryError;

const categoryIds = (categories || []).map((category) => category.id);
const { data: items, error: itemError } = categoryIds.length
  ? await supabase
    .from('menu_items')
    .select('*')
    .in('category_id', categoryIds)
    .order('order_index')
  : { data: [], error: null };
if (itemError) throw itemError;

const itemIds = (items || []).map((item) => item.id);
const { data: options, error: optionError } = itemIds.length
  ? await supabase
    .from('menu_item_options')
    .select('*')
    .in('menu_item_id', itemIds)
    .order('order_index')
  : { data: [], error: null };
if (optionError) throw optionError;

console.log(JSON.stringify({
  restaurant,
  counts: {
    categories: categories?.length || 0,
    items: items?.length || 0,
    options: options?.length || 0,
  },
  sampleCategories: (categories || []).slice(0, 10).map((category) => category.name),
  sampleItems: (items || []).slice(0, 10).map((item) => ({
    name: item.name,
    price: item.price ?? item.base_price ?? item.price_min ?? item.display_price ?? null,
  })),
  sampleOptions: (options || []).slice(0, 16).map((option) => ({
    name: option.name,
    priceDelta: option.price_delta,
    absolutePrice: option.absolute_price,
    optionType: option.option_type,
    priceType: option.price_type,
  })),
}, null, 2));
