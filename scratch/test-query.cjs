const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing connection and columns...');
  
  // Test 1: Simple select of all restaurants
  const { data: allData, error: allErr } = await supabase
    .from('restaurants')
    .select('id, name, city, visit_status');
    
  if (allErr) {
    console.error('Test 1 Error:', allErr.message);
  } else {
    console.log(`Test 1: Found ${allData.length} total restaurants in database.`);
    if (allData.length > 0) {
      console.log('Sample item:', allData[0]);
    }
  }

  // Test 2: Query with is_deleted
  const { data: filterData, error: filterErr } = await supabase
    .from('restaurants')
    .select('*')
    .eq('visit_status', 'Pendente')
    .or('is_deleted.eq.false,is_deleted.is.null');

  if (filterErr) {
    console.error('Test 2 Error (is_deleted query):', filterErr.message);
  } else {
    console.log(`Test 2: Found ${filterData.length} pending, non-deleted restaurants.`);
  }
}

test();
