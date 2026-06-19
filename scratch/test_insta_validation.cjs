const { validarECompletarDados } = require('./ai_validator.cjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const targetId = '09ccec7e-12fd-40a3-82a6-9bb45e7f6802';
  
  console.log(`📡 Carregando restaurante ID ${targetId} do Supabase...`);
  const { data: rest, error } = await supabase.from('restaurants').select('*').eq('id', targetId).single();
  
  if (error || !rest) {
    console.error(`❌ Restaurante não encontrado no banco:`, error?.message);
    process.exit(1);
  }
  
  console.log(`📍 Restaurante: "${rest.name}" em ${rest.city}/${rest.state}`);
  console.log(`📍 Endereço: ${rest.address}`);
  console.log(`📍 Instagram atual no banco: ${rest.instagram}`);
  
  // Vamos rodar a validação passando o Instagram suspeito: biroska_bar_ (Rio de Janeiro)
  const dadosColetados = {
    instagram: 'https://www.instagram.com/biroska_bar_/',
    phone: rest.phone || null,
    menuSourceUrl: rest.website || null,
    website: rest.website || null,
    pageContent: 'Restaurante A Biroska Lanches de João Pessoa'
  };
  
  console.log('\n--- INICIANDO VALIDAÇÃO DE METADADOS VIA IA ---');
  const result = await validarECompletarDados(rest, dadosColetados);
  
  console.log('\n--- RESULTADO DA VALIDAÇÃO ---');
  console.log(JSON.stringify(result, null, 2));
}

run();
