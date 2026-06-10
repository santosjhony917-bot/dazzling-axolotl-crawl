const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Inserting 2 test records...');
  await supabase.from('restaurants').insert([
    { name: 'TEST 1', visit_status: 'Pendente' },
    { name: 'TEST 2', visit_status: 'Visitado' }
  ]);

  console.log('Verifying records inserted...');
  let { count } = await supabase.from('restaurants').select('*', { count: 'exact' });
  console.log(`Current count: ${count}`);

  console.log('Running clear query...');
  const { data, error } = await supabase
    .from('restaurants')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('Clear query failed:', error);
  } else {
    console.log('Clear query succeeded! Response data:', data);
    let { count: finalCount } = await supabase.from('restaurants').select('*', { count: 'exact' });
    console.log(`Final count: ${finalCount}`);
  }
}

run();
