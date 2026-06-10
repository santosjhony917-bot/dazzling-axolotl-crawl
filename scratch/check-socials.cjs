const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching all restaurants from Supabase...');
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, social_networks, other_url, visit_status');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} records.`);
    data.forEach(r => {
      console.log(`- [${r.visit_status}] Name: "${r.name}" | Socials:`, JSON.stringify(r.social_networks), `| other_url: ${r.other_url}`);
    });
  }
}

run();
