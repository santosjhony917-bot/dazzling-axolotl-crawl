const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Searching for restaurants with "Barca" in the name...');
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      id,
      name,
      restaurant_gallery (
        id,
        image_url
      )
    `)
    .eq('id', '06ae6f7e-cf1f-4804-a719-5675e56dba96');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} match(es):`);
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
