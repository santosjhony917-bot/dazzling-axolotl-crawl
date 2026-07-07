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

const ids = (process.argv.find((arg) => arg.startsWith('--ids='))?.slice('--ids='.length) || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
if (!ids.length) throw new Error('Use --ids=<uuid>[,<uuid>].');

const operationalRe = /\b(ketchup|catchup|talher|talheres|guardanapo|descartavel|descartaveis|sacola|embalagem|cpf|troco|canudo|colher|garfo|faca|palito|copo descartavel|prato descartavel)\b/i;
const instructionRe = /\b(turbine|turbinar|transforme|transformar|clique|click|escolha|selecione)\b.{0,80}\b(combo|lanche|sabor|sabores|opcao|opcoes)\b/i;

const { data: restaurants, error: restaurantError } = await supabase
  .from('restaurants')
  .select('id,name,google_maps_name,menu_status,menu_status_reason')
  .in('id', ids);
if (restaurantError) throw restaurantError;

const { data: categories, error: categoryError } = await supabase
  .from('menu_categories')
  .select('*')
  .in('restaurant_id', ids);
if (categoryError) throw categoryError;

const categoryIds = (categories || []).map((category) => category.id);
const { data: items, error: itemError } = categoryIds.length
  ? await supabase.from('menu_items').select('*').in('category_id', categoryIds)
  : { data: [], error: null };
if (itemError) throw itemError;

const itemIds = (items || []).map((item) => item.id);
const options = [];
for (let index = 0; index < itemIds.length; index += 100) {
  const chunk = itemIds.slice(index, index + 100);
  const { data, error } = await supabase
    .from('menu_item_options')
    .select('*')
    .in('menu_item_id', chunk);
  if (error) throw error;
  options.push(...(data || []));
}

const restaurantByCategory = new Map((categories || []).map((category) => [category.id, category.restaurant_id]));
const restaurantsById = new Map((restaurants || []).map((restaurant) => [restaurant.id, restaurant]));

const result = ids.map((id) => {
  const restaurant = restaurantsById.get(id) || { id };
  const ownCategories = (categories || []).filter((category) => category.restaurant_id === id);
  const ownCategoryIds = new Set(ownCategories.map((category) => category.id));
  const ownItems = (items || []).filter((item) => ownCategoryIds.has(item.category_id));
  const ownItemIds = new Set(ownItems.map((item) => item.id));
  const ownOptions = (options || []).filter((option) => ownItemIds.has(option.menu_item_id));
  const pricedItems = ownItems.filter((item) => item.price !== null || item.price_min !== null || item.price_max !== null);
  const operationalOptions = ownOptions.filter((option) => operationalRe.test(`${option.group_name || ''} ${option.name || ''}`));
  const instructionOptions = ownOptions.filter((option) => instructionRe.test(`${option.group_name || ''} ${option.name || ''}`));
  const badDeltaRows = ownOptions.filter((option) =>
    option.price_behavior === 'price_delta'
    && option.price !== null
    && option.price !== undefined
  );
  const missingDeltaRows = ownOptions.filter((option) =>
    option.price_behavior === 'price_delta'
    && (option.price_delta === null || option.price_delta === undefined)
  );
  return {
    id,
    name: restaurant.google_maps_name || restaurant.name || null,
    menuStatus: restaurant.menu_status || null,
    menuStatusReason: restaurant.menu_status_reason || null,
    categories: ownCategories.length,
    items: ownItems.length,
    options: ownOptions.length,
    pricedItems: pricedItems.length,
    pricedItemRatio: ownItems.length ? Number((pricedItems.length / ownItems.length).toFixed(4)) : 0,
    operationalOptions: operationalOptions.length,
    instructionOptions: instructionOptions.length,
    badDeltaRows: badDeltaRows.length,
    missingDeltaRows: missingDeltaRows.length,
    sampleCategories: ownCategories.slice(0, 8).map((category) => category.name),
    sampleIssues: {
      operationalOptions: operationalOptions.slice(0, 5).map((option) => `${option.group_name || ''}: ${option.name || ''}`),
      instructionOptions: instructionOptions.slice(0, 5).map((option) => `${option.group_name || ''}: ${option.name || ''}`),
      badDeltaRows: badDeltaRows.slice(0, 5).map((option) => `${option.group_name || ''}: ${option.name || ''}`),
      missingDeltaRows: missingDeltaRows.slice(0, 5).map((option) => `${option.group_name || ''}: ${option.name || ''}`),
    },
  };
});

console.log(JSON.stringify({ result }, null, 2));
