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

function norm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
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

const report = {
  removedStandaloneAddonCategories: [],
  removedDuplicateOptions: [],
};

const casaId = '07f16c40-a81c-4d0a-8f71-5ef78a3be31c';
const acaiId = 'cb4d3075-dcad-45a2-a348-e8de93ef15cc';

const { data: casaCategories, error: casaCategoryError } = await supabase
  .from('menu_categories')
  .select('id,name')
  .eq('restaurant_id', casaId);
if (casaCategoryError) throw casaCategoryError;

const addonCategories = (casaCategories || []).filter((category) =>
  ['adicionais extras', 'balde com gelo'].includes(norm(category.name)),
);

for (const category of addonCategories) {
  const { data: items, error: itemError } = await supabase
    .from('menu_items')
    .select('id,name')
    .eq('category_id', category.id);
  if (itemError) throw itemError;
  const itemIds = (items || []).map((item) => item.id);
  if (itemIds.length) {
    const { data: groups, error: groupFetchError } = await supabase
      .from('menu_option_groups')
      .select('id')
      .in('menu_item_id', itemIds);
    if (groupFetchError) throw groupFetchError;
    const groupIds = (groups || []).map((group) => group.id);
    if (groupIds.length) {
      const { error } = await supabase.from('menu_item_options').delete().in('group_id', groupIds);
      if (error) throw error;
    }
    const { error: optionError } = await supabase.from('menu_item_options').delete().in('menu_item_id', itemIds);
    if (optionError) throw optionError;
    if (groupIds.length) {
      const { error: groupError } = await supabase.from('menu_option_groups').delete().in('id', groupIds);
      if (groupError) throw groupError;
    }
    const { error: deleteItemError } = await supabase.from('menu_items').delete().in('id', itemIds);
    if (deleteItemError) throw deleteItemError;
  }
  const { error: deleteCategoryError } = await supabase.from('menu_categories').delete().eq('id', category.id);
  if (deleteCategoryError) throw deleteCategoryError;
  report.removedStandaloneAddonCategories.push({
    category: category.name,
    items: (items || []).map((item) => item.name),
  });
}

const { data: acaiCategories, error: acaiCategoryError } = await supabase
  .from('menu_categories')
  .select('id')
  .eq('restaurant_id', acaiId);
if (acaiCategoryError) throw acaiCategoryError;

const acaiCategoryIds = (acaiCategories || []).map((category) => category.id);
const { data: acaiItems, error: acaiItemError } = acaiCategoryIds.length
  ? await supabase.from('menu_items').select('id,name').in('category_id', acaiCategoryIds)
  : { data: [], error: null };
if (acaiItemError) throw acaiItemError;

const itemById = new Map((acaiItems || []).map((item) => [item.id, item]));
const acaiItemIds = (acaiItems || []).map((item) => item.id);
const { data: options, error: optionFetchError } = acaiItemIds.length
  ? await supabase
    .from('menu_item_options')
    .select('id,menu_item_id,group_name,name,price,price_delta,order_index')
    .in('menu_item_id', acaiItemIds)
    .order('menu_item_id')
    .order('group_name')
    .order('name')
    .order('order_index')
  : { data: [], error: null };
if (optionFetchError) throw optionFetchError;

const seen = new Map();
const duplicateIds = [];
for (const option of options || []) {
  const key = [option.menu_item_id, norm(option.group_name), norm(option.name)].join('|');
  if (!seen.has(key)) {
    seen.set(key, option);
    continue;
  }
  duplicateIds.push(option.id);
  report.removedDuplicateOptions.push({
    item: itemById.get(option.menu_item_id)?.name || option.menu_item_id,
    group: option.group_name,
    option: option.name,
  });
}

if (duplicateIds.length) {
  const { error } = await supabase.from('menu_item_options').delete().in('id', duplicateIds);
  if (error) throw error;
}

console.log(JSON.stringify(report, null, 2));
