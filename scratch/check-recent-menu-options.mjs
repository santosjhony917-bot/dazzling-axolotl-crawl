import { createClient } from '@supabase/supabase-js';

const ids = process.argv
  .slice(2)
  .flatMap((arg) => arg.split(','))
  .map((arg) => arg.trim())
  .filter(Boolean);

if (!ids.length) {
  throw new Error('Use: node scratch/check-recent-menu-options.mjs <restaurant_id> [restaurant_id...]');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const { data: restaurants, error: restaurantsError } = await supabase
  .from('restaurants')
  .select('id,name,menu_status,ai_validated')
  .in('id', ids);
if (restaurantsError) throw restaurantsError;

const { data: categories, error: categoriesError } = await supabase
  .from('menu_categories')
  .select('id,restaurant_id,name')
  .in('restaurant_id', ids);
if (categoriesError) throw categoriesError;

const categoryIds = categories.map((category) => category.id);
const { data: items, error: itemsError } = categoryIds.length
  ? await supabase
    .from('menu_items')
    .select('id,category_id,name,price,price_min,price_max')
    .in('category_id', categoryIds)
  : { data: [], error: null };
if (itemsError) throw itemsError;

const itemIds = items.map((item) => item.id);
const { data: groups, error: groupsError } = itemIds.length
  ? await supabase
    .from('menu_option_groups')
    .select('*')
    .in('menu_item_id', itemIds)
  : { data: [], error: null };

const { data: options, error: optionsError } = itemIds.length
  ? await supabase
    .from('menu_item_options')
    .select('*')
    .in('menu_item_id', itemIds)
  : { data: [], error: null };
if (optionsError) throw optionsError;

const categoryById = new Map(categories.map((category) => [category.id, category]));
const itemById = new Map(items.map((item) => [item.id, item]));

function restaurantIdForItemId(itemId) {
  const item = itemById.get(itemId);
  if (!item) return null;
  return categoryById.get(item.category_id)?.restaurant_id || null;
}

function groupByRestaurant(rows, getRestaurantId) {
  const map = new Map();
  for (const row of rows || []) {
    const restaurantId = getRestaurantId(row);
    if (!restaurantId) continue;
    if (!map.has(restaurantId)) map.set(restaurantId, []);
    map.get(restaurantId).push(row);
  }
  return map;
}

const categoriesByRestaurant = groupByRestaurant(categories, (row) => row.restaurant_id);
const itemsByRestaurant = groupByRestaurant(items, (row) => categoryById.get(row.category_id)?.restaurant_id);
const groupsByRestaurant = groupsError ? new Map() : groupByRestaurant(groups, (row) => restaurantIdForItemId(row.menu_item_id));
const optionsByRestaurant = groupByRestaurant(options, (row) => restaurantIdForItemId(row.menu_item_id));

const result = restaurants.map((restaurant) => {
  const restaurantOptions = optionsByRestaurant.get(restaurant.id) || [];
  return {
    id: restaurant.id,
    name: restaurant.name,
    menu_status: restaurant.menu_status,
    ai_validated: restaurant.ai_validated,
    categories: (categoriesByRestaurant.get(restaurant.id) || []).length,
    items: (itemsByRestaurant.get(restaurant.id) || []).length,
    option_groups: (groupsByRestaurant.get(restaurant.id) || []).length,
    options: restaurantOptions.length,
    option_groups_error: groupsError?.message || null,
    option_samples: restaurantOptions.slice(0, 12).map((option) => ({
      name: option.name,
      group_name: option.group_name,
      price: option.price,
      price_delta: option.price_delta,
      menu_option_group_id: option.menu_option_group_id,
      is_required: option.is_required,
      min_quantity: option.min_quantity,
      max_quantity: option.max_quantity,
    })),
  };
});

console.log(JSON.stringify(result, null, 2));
