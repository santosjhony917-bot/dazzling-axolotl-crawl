const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Searching for "dogão" in Supabase...');
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .ilike('name', '%dogão%');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} matches in Supabase:`);
    data.forEach(r => {
      console.log(`\nID: ${r.id}`);
      console.log(`Name: ${r.name}`);
      console.log(`Visit Status: ${r.visit_status}`);
      console.log(`Is Deleted: ${r.is_deleted}`);
      console.log(`Other URL: ${r.other_url}`);
      console.log(`External URL: ${r.external_url}`);
      console.log(`Menu Categories (Length):`, r.menu_categories ? r.menu_categories.length : 'none');
    });
  }
}

run();
