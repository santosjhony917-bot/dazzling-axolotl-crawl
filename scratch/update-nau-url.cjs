const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Atualizando URL de cardápio do NAU...');
  const { data, error } = await supabase
    .from('restaurants')
    .update({ 
      name: 'NAU Frutos do Mar',
      other_url: 'https://livemenu.app/menu/620a771b6e7bfc0012a16264',
      ai_validated: false
    })
    .eq('id', '3b9fce9a-7385-4a04-a63f-59cb83a3071d')
    .select();

  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Atualizado com sucesso:', data);
  }
}

run();
