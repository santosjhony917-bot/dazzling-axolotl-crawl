import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateTestCode() {
  const claimCode = 'TEST' + Math.floor(1000 + Math.random() * 9000);
  
  const { data, error } = await supabase
    .from('restaurants')
    .insert([
      {
        name: 'Restaurante Teste Reivindicação',
        claim_code: claimCode,
        is_premium: false,
        city: 'São Paulo',
        state: 'SP'
      }
    ])
    .select();

  if (error) {
    console.error("Erro ao criar restaurante:", error.message);
  } else {
    console.log("Restaurante criado com sucesso!");
    console.log("-----------------------------------------");
    console.log(`CÓDIGO DE REIVINDICAÇÃO: ${claimCode}`);
    console.log("-----------------------------------------");
  }
}

generateTestCode();
