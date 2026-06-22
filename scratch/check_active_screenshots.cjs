const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: leads, error } = await supabase
    .from('commercial_leads')
    .select('id, restaurant_id, public_profile_screenshot_url, restaurant:restaurants(name)')
    .not('public_profile_screenshot_url', 'is', null);

  if (error) {
    console.error('Error fetching leads:', error.message);
    return;
  }

  console.log('Active leads with screenshots:', leads.length);
  leads.forEach(lead => {
    console.log(`- Lead ID: ${lead.id} | Name: ${lead.restaurant?.name} | Screenshot: ${lead.public_profile_screenshot_url}`);
  });
}

run();
