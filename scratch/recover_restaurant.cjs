const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
if (!process.env.VITE_SUPABASE_URL) {
  require('dotenv').config();
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const targetId = '3677494e-6987-41e0-b239-debde2e2c40e';
  console.log(`Recuperando restaurante ${targetId}...`);
  
  const { data, error } = await supabase
    .from('restaurants')
    .update({ ai_validated: false })
    .eq('id', targetId);
    
  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Restaurante recuperado com sucesso. Ele deve voltar a aparecer na lista.');
  }
}

main();
