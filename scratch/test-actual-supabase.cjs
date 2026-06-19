const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing connection to real Supabase...');
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name')
      .limit(5);
    
    if (error) {
      console.error('Error fetching from Supabase:', error);
    } else {
      console.log('Successfully fetched restaurants:', data);
    }
  } catch (e) {
    console.error('Exception during fetch:', e);
  }
}

test();
