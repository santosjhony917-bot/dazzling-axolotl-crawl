const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Testing insert...');
  const testId = '99999999-9999-9999-9999-999999999999';
  
  // Try to insert a dummy restaurant
  const { data: insertData, error: insertError } = await supabase
    .from('restaurants')
    .insert({
      id: testId,
      name: 'RLS TEST RESTAURANT',
      visit_status: 'Pendente'
    });

  if (insertError) {
    console.error('Insert failed:', insertError);
  } else {
    console.log('Insert succeeded (RLS might be disabled or policy allows it). trying to select...');
    
    const { data: selectData, error: selectError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', testId);
      
    console.log('Select result:', selectData, selectError);

    console.log('Testing delete...');
    const { error: deleteError } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', testId);

    if (deleteError) {
      console.error('Delete failed:', deleteError);
    } else {
      console.log('Delete succeeded!');
    }
  }
}

run();
