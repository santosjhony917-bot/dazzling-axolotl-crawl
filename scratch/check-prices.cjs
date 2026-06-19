const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const restaurantId = '19999f5d-3199-4a4c-831b-333952d14ccd';
  console.log(`Checking menu items in Supabase for restaurant: ${restaurantId}...`);
  
  // Get categories first
  const { data: cats, error: catError } = await supabase
    .from('menu_categories')
    .select('id, name')
    .eq('restaurant_id', restaurantId);

  if (catError) {
    console.error('Error fetching categories:', catError);
    return;
  }

  const catIds = cats.map(c => c.id);
  
  // Get items
  const { data: items, error: itemError } = await supabase
    .from('menu_items')
    .select('id, name, price, description')
    .in('category_id', catIds)
    .limit(10);

  if (itemError) {
    console.error('Error fetching items:', itemError);
    return;
  }

  console.log('Sample items in Supabase:', JSON.stringify(items, null, 2));
}

check();
