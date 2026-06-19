const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function find() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, city, state')
    .ilike('name', '%Casa%');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Results:', JSON.stringify(data, null, 2));
}

find();
