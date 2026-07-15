import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const city = 'João Pessoa';
const state = 'PB';
async function fetchAll(table, select, filterFn) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from(table).select(select).range(from, from + 999);
    if (filterFn) query = filterFn(query);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}
const restaurants = await fetchAll('restaurants', 'id,name,city,state,is_deleted', q => q.eq('city', city).eq('state', state));
const activeRestaurants = restaurants.filter((row) => row.is_deleted !== true);
const categories = await fetchAll('menu_categories', 'id,restaurant_id,is_active', q => q.order('created_at', { ascending: true }));
const activeRestaurantIds = new Set(activeRestaurants.map((row) => row.id));
const activeCategories = categories.filter((row) => row.is_active !== false && activeRestaurantIds.has(row.restaurant_id));
const items = await fetchAll('menu_items', 'id,category_id,is_active', q => q.order('created_at', { ascending: true }));
const activeItems = items.filter((row) => row.is_active !== false);
const categoryLookup = new Map(activeCategories.map((row) => [row.id, row.restaurant_id]));
const activeItemRestaurantIds = new Set(activeItems.map((item) => categoryLookup.get(item.category_id)).filter(Boolean));
const activeMenuRestaurants = activeRestaurants.filter((row) => activeItemRestaurantIds.has(row.id));
const runs = await fetchAll('menu_import_runs', 'restaurant_id,status,restaurants!inner(city,state,name)', q => q.eq('restaurants.city', city).eq('restaurants.state', state).eq('status','committed'));
const committedRestaurantIds = new Set(runs.map(r => r.restaurant_id));
const extra = activeMenuRestaurants.filter(r => !committedRestaurantIds.has(r.id));
console.log(JSON.stringify({extraCount: extra.length, extras: extra.map(r => ({id:r.id,name:r.name}))}, null, 2));
