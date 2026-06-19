const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching all "Pendente" restaurants...');
  const { data: restaurants, error: restError } = await supabase
    .from('restaurants')
    .select('id, name, visit_status');

  if (restError) {
    console.error('Error fetching restaurants:', restError);
    return;
  }

  const pendenteList = restaurants.filter(r => r.visit_status === 'Pendente');
  console.log(`Found ${pendenteList.length} Pendente restaurants.`);

  for (const r of pendenteList) {
    // Check if this restaurant has menu categories
    const { data: categories, error: catError } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('restaurant_id', r.id);

    if (catError) {
      console.error(`Error checking categories for ${r.name}:`, catError);
      continue;
    }

    if (categories && categories.length > 0) {
      console.log(`Restaurant "${r.name}" has ${categories.length} categories but is stuck in "Pendente" status. Fixing to "Visitado"...`);
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ visit_status: 'Visitado' })
        .eq('id', r.id);

      if (updateError) {
        console.error(`Failed to update ${r.name}:`, updateError);
      } else {
        console.log(`Successfully updated "${r.name}" to "Visitado".`);
      }
    }
  }
  console.log('Finished stuck restaurants fix.');
}

run();
