const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
async function run() {
  const { data, error } = await supabase.from('restaurants').select('name, social_networks, image_url, ai_log, phone').order('updated_at', { ascending: false }).limit(2);
  console.log(JSON.stringify(data, null, 2));
}
run();
