import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const restaurantId = process.argv[2];
if (!restaurantId) {
  throw new Error('Use: node scratch/inspect-menu-items.mjs <restaurant_id>');
}

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

const { data: categories, error: categoryError } = await supabase
  .from('menu_categories')
  .select('id,name,order_index')
  .eq('restaurant_id', restaurantId)
  .order('order_index', { ascending: true });

if (categoryError) throw categoryError;

const categoryIds = (categories || []).map((category) => category.id);
if (!categoryIds.length) {
  console.log(JSON.stringify([], null, 2));
  process.exit(0);
}

const { data, error } = await supabase
  .from('menu_items')
  .select('id,name,display_name,description,price,price_min,price_max,price_type,price_source,category_id')
  .in('category_id', categoryIds)
  .order('name')
  .limit(120);

if (error) throw error;

const categoryById = new Map((categories || []).map((category) => [category.id, category]));
const rows = (data || []).map((item) => ({
  ...item,
  category_name: categoryById.get(item.category_id)?.name || null,
}));

console.log(JSON.stringify(rows, null, 2));
