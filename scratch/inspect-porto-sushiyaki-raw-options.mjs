import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnv() {
  const env = { ...process.env };
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

const restaurantIds = [
  '2ef9ccde-0e20-4108-a8ac-874108b3c16b',
  '2ed733a0-a4c7-4bb4-b280-21d7752c0409',
];

function scanArrays(value, pathName = 'raw', depth = 0, found = []) {
  if (!value || typeof value !== 'object' || depth > 4) return found;
  if (Array.isArray(value)) {
    if (value.length) {
      const sample = value[0];
      found.push({
        path: pathName,
        length: value.length,
        keys: sample && typeof sample === 'object' ? Object.keys(sample).slice(0, 30) : [],
        sample,
      });
    }
    return found;
  }
  for (const [key, child] of Object.entries(value)) {
    if (!child || typeof child !== 'object') continue;
    scanArrays(child, `${pathName}.${key}`, depth + 1, found);
  }
  return found;
}

const { data: categories, error: categoryError } = await supabase
  .from('menu_categories')
  .select('id,restaurant_id,name')
  .in('restaurant_id', restaurantIds);
if (categoryError) throw categoryError;

const categoryIds = (categories || []).map((category) => category.id);
const { data: items, error: itemError } = await supabase
  .from('menu_items')
  .select('id,category_id,name,description,price,display_price,price_min,price_max,commercial_type,is_configurable,raw_data,source_url')
  .in('category_id', categoryIds)
  .order('order_index');
if (itemError) throw itemError;

const categoryById = new Map((categories || []).map((category) => [category.id, category]));
const inspected = [];
for (const item of items || []) {
  const category = categoryById.get(item.category_id);
  const arrays = scanArrays(item.raw_data || {});
  if (!arrays.length) continue;
  inspected.push({
    restaurantId: category?.restaurant_id,
    category: category?.name,
    itemId: item.id,
    name: item.name,
    price: item.display_price ?? item.price ?? item.price_min,
    commercialType: item.commercial_type,
    isConfigurable: item.is_configurable,
    rawKeys: Object.keys(item.raw_data || {}),
    arrays,
  });
}

const outputPath = 'scratch/porto-sushiyaki-raw-options-inspect.json';
fs.writeFileSync(outputPath, JSON.stringify(inspected, null, 2), 'utf8');

console.log(JSON.stringify({
  items: items?.length || 0,
  withArrays: inspected.length,
  byRestaurant: inspected.reduce((acc, entry) => {
    acc[entry.restaurantId] = (acc[entry.restaurantId] || 0) + 1;
    return acc;
  }, {}),
  outputPath,
  samples: inspected.slice(0, 5),
}, null, 2));
