const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, is_published');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const matches = restaurants.filter(r => r.name.toLowerCase().includes('arretad'));
  console.log(`Found ${matches.length} matching restaurants:`);
  matches.forEach(m => {
    console.log(`- ID: ${m.id} | Name: "${m.name}" | Published: ${m.is_published}`);
  });
}

run();
