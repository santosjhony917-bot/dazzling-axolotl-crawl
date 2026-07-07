import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const RESTAURANT_IDS = (process.env.RESTAURANT_IDS || '8322d0f6-8e08-4de7-a73f-d71c57f0291d')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const APPLY = process.argv.includes('--apply');

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

const PLACEHOLDER_RE = /\b(sabor|opcao|item|produto)\s+(nao|não)\s+especificad[oa]|\bnao\s+especificad[oa]\b|\bnão\s+especificad[oa]\b/i;

const { data: categories, error: categoriesError } = await supabase
  .from('menu_categories')
  .select('id,name,restaurant_id')
  .in('restaurant_id', RESTAURANT_IDS);
if (categoriesError) throw categoriesError;

const categoryIds = (categories || []).map((category) => category.id);
const { data: items, error: itemsError } = categoryIds.length
  ? await supabase.from('menu_items').select('id,name,category_id').in('category_id', categoryIds)
  : { data: [], error: null };
if (itemsError) throw itemsError;

const itemIds = (items || []).map((item) => item.id);
const { data: options, error: optionsError } = itemIds.length
  ? await supabase.from('menu_item_options').select('*').in('menu_item_id', itemIds)
  : { data: [], error: null };
if (optionsError) throw optionsError;

const itemById = new Map((items || []).map((item) => [item.id, item]));
const matches = (options || [])
  .filter((option) => PLACEHOLDER_RE.test(option.name || '') || PLACEHOLDER_RE.test(option.group_name || ''))
  .map((option) => ({
    id: option.id,
    name: option.name,
    group_name: option.group_name,
    menu_item_id: option.menu_item_id,
    item_name: itemById.get(option.menu_item_id)?.name || null,
  }));

if (APPLY && matches.length) {
  const { error: deleteError } = await supabase
    .from('menu_item_options')
    .delete()
    .in('id', matches.map((match) => match.id));
  if (deleteError) throw deleteError;
}

console.log(JSON.stringify({
  apply: APPLY,
  restaurantIds: RESTAURANT_IDS,
  matched: matches.length,
  deleted: APPLY ? matches.length : 0,
  matches,
}, null, 2));
