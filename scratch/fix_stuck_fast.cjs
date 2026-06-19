const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching active restaurant IDs from menu_categories...');
  const { data: categories, error: catError } = await supabase
    .from('menu_categories')
    .select('restaurant_id');

  if (catError) {
    console.error('Error fetching categories:', catError);
    return;
  }

  const activeIds = [...new Set(categories.map(c => c.restaurant_id).filter(Boolean))];
  console.log(`Found ${activeIds.length} unique restaurant IDs with menu categories.`);

  if (activeIds.length === 0) {
    console.log('No restaurants have menu categories.');
    return;
  }

  console.log('Updating stuck restaurants to "Visitado" in bulk...');
  // We can update in chunks of 100 to avoid long query parameters
  const chunkSize = 100;
  let updatedCount = 0;

  for (let i = 0; i < activeIds.length; i += chunkSize) {
    const chunk = activeIds.slice(i, i + chunkSize);
    const { data, error, count } = await supabase
      .from('restaurants')
      .update({ visit_status: 'Visitado' })
      .eq('visit_status', 'Pendente')
      .in('id', chunk);

    if (error) {
      console.error(`Error updating chunk starting at index ${i}:`, error);
    } else {
      console.log(`Updated chunk starting at index ${i} successfully.`);
    }
  }

  console.log('Bulk update finished.');
}

run();
