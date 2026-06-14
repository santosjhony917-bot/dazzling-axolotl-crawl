const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, visit_status, claim_code')
    .eq('visit_status', 'Visitado')
    .limit(20);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} restaurants with visit_status = 'Visitado' in database:`);
    data.forEach(r => console.log(`- ${r.name} (${r.visit_status}) [claim_code: ${r.claim_code}]`));
  }
}

test();
