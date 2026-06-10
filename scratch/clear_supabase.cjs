const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('📡 Conectando ao Supabase para limpar registros...');
  const { error } = await supabase
    .from('restaurants')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('❌ Erro ao limpar Supabase:', error.message);
  } else {
    console.log('✅ Sucesso! Todos os registros foram apagados do Supabase.');
  }
}

run();
