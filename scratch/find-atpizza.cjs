const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function find() {
  console.log('Searching for atpizza in database...');
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, other_url, external_url')
    .or('name.ilike.%atpizza%,other_url.ilike.%atpizza%,external_url.ilike.%atpizza%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Results:', JSON.stringify(data, null, 2));
}

find();
