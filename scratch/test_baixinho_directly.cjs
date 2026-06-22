require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
  console.log("🔍 Buscando 'baixinho lanches' no banco de dados...");
  
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', '%baixinho%')
    .limit(1);

  if (error) {
    console.error("Erro ao buscar no Supabase:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("❌ Restaurante não encontrado no banco de dados.");
    return;
  }

  const restaurant = data[0];
  console.log(`✅ Restaurante encontrado: ${restaurant.name} (ID: ${restaurant.id})`);
  console.log(`🚀 Iniciando o script de validação de IA simulando o clique no botão...`);

  const proc = spawn('node', ['scratch/phase5_ai_validation.cjs', '--single', '--id', restaurant.id]);

  proc.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  proc.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  proc.on('close', (code) => {
    console.log(`\n🏁 Teste concluído com código ${code}`);
  });
}

runTest();
