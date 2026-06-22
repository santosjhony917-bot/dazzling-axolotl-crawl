require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanData() {
  console.log("🧹 Injetando dados sujos de teste no 'baixinho lanches'...");
  
  const { data, error } = await supabase
    .from('restaurants')
    .update({ 
      instagram_url: 'https://www.instagram.com/baixinholanchesemarmitaria/', // O falso de SP
      menu_url: 'https://7b569a52-1b41-4d92-8066-e564c9cd5552.ola.click/', // O cardapio falso
      validation_status: 'pending' 
    })
    .ilike('name', '%baixinho%')
    .select('id, name');

  if (error) {
    console.error("Erro ao limpar:", error);
    return;
  }
  
  console.log("✅ Dados sujos redefinidos para testarmos a proteção:", data);
}

cleanData();
