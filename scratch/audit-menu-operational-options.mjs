import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ids = process.argv.slice(2).filter(Boolean);
if (!ids.length) {
  console.error('Usage: node scratch/audit-menu-operational-options.mjs <restaurant-id> [...]');
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

const operationalRe = /\b(ketchup|catchup|talher|talheres|guardanapo|guardanapos|embalagem|sacola|descartavel|descartaveis|cpf|troco|canudo|palito|palitos)\b/i;

for (const restaurantId of ids) {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id,name,menu_status')
    .eq('id', restaurantId)
    .single();
  if (restaurantError) throw restaurantError;

  const { data: categories, error: categoryError } = await supabase
    .from('menu_categories')
    .select('id,name')
    .eq('restaurant_id', restaurantId);
  if (categoryError) throw categoryError;

  const categoryIds = (categories || []).map((category) => category.id);
  const { data: items, error: itemError } = categoryIds.length
    ? await supabase
      .from('menu_items')
      .select('id,name,description')
      .in('category_id', categoryIds)
    : { data: [], error: null };
  if (itemError) throw itemError;

  const itemIds = (items || []).map((item) => item.id);
  const { data: groups, error: groupError } = itemIds.length
    ? await supabase
      .from('menu_option_groups')
      .select('*')
      .in('menu_item_id', itemIds)
    : { data: [], error: null };
  if (groupError) throw groupError;

  const { data: options, error: optionError } = itemIds.length
    ? await supabase
      .from('menu_item_options')
      .select('*')
      .in('menu_item_id', itemIds)
    : { data: [], error: null };
  if (optionError) throw optionError;

  const badCategories = (categories || []).filter((category) => operationalRe.test(category.name || ''));
  const badItems = (items || []).filter((item) => operationalRe.test(`${item.name || ''} ${item.description || ''}`));
  const badGroups = (groups || []).filter((group) => operationalRe.test(`${group.name || ''} ${group.description || ''}`));
  const badOptions = (options || []).filter((option) => operationalRe.test(`${option.name || ''} ${option.description || ''} ${option.group_name || ''}`));

  console.log(JSON.stringify({
    restaurant,
    counts: {
      categories: categories?.length || 0,
      items: items?.length || 0,
      groups: groups?.length || 0,
      options: options?.length || 0,
    },
    operationalMatches: {
      categories: badCategories.map((item) => item.name).slice(0, 20),
      items: badItems.map((item) => item.name).slice(0, 20),
      groups: badGroups.map((item) => item.name).slice(0, 20),
      options: badOptions.map((item) => item.name).slice(0, 20),
    },
    sampleGroups: (groups || []).slice(0, 12).map((group) => ({
      name: group.name,
      min_quantity: group.min_quantity,
      max_quantity: group.max_quantity,
      is_required: group.is_required,
      semantic_type: group.semantic_type,
      price_behavior: group.price_behavior,
    })),
  }, null, 2));
}
