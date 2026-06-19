const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Fetching all restaurants to measure payload size...');
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      return;
    }
    
    const size = Buffer.byteLength(JSON.stringify(data));
    console.log(`Total restaurants fetched: ${data.length}`);
    console.log(`JSON size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    
    // Print keys of first object
    if (data.length > 0) {
      console.log('First restaurant keys:', Object.keys(data[0]));
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

test();
