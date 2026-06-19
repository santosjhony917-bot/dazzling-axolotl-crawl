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
  
  console.log(`📡 Carregando restaurante ID ${targetId} para correção...`);
  const { data: rest, error } = await supabase.from('restaurants').select('*').eq('id', targetId).single();
  if (error || !rest) {
    console.error('❌ Erro ao buscar restaurante:', error?.message);
    return;
  }
  
  // 1. Limpa o cardápio e os links de cardápio
  console.log('🧹 Deletando cardápio no Supabase...');
  await supabase.from('menu_categories').delete().eq('restaurant_id', targetId);
  
  // 2. Atualiza as Redes Sociais no formato correto
  let socialNetworks = rest.social_networks || [];
  socialNetworks = socialNetworks.filter(s => s && s.platform !== 'instagram');
  socialNetworks.push({ platform: 'instagram', url: 'https://www.instagram.com/a_biroska/' });
  
  const workingHours = {
    "monday": { "isOpen": true, "slots": [{ "start": "18:00", "end": "23:59" }] },
    "tuesday": { "isOpen": true, "slots": [{ "start": "18:00", "end": "23:59" }] },
    "wednesday": { "isOpen": true, "slots": [{ "start": "18:00", "end": "23:59" }] },
    "thursday": { "isOpen": true, "slots": [{ "start": "18:00", "end": "23:59" }] },
    "friday": { "isOpen": true, "slots": [{ "start": "18:00", "end": "23:59" }] },
    "saturday": { "isOpen": true, "slots": [{ "start": "18:00", "end": "23:59" }] },
    "sunday": { "isOpen": true, "slots": [{ "start": "18:00", "end": "23:59" }] }
  };
  
  console.log('📡 Atualizando metadados do restaurante...');
  const { error: updateError } = await supabase
    .from('restaurants')
    .update({
      social_networks: socialNetworks,
      phone: '83991442273',
      other_url: null,
      external_url: null,
      ifood_url: null,
      category: 'Lanchonete',
      description: 'Lanches saborosos em João Pessoa.',
      opening_hours: workingHours,
      ai_validated: true
    })
    .eq('id', targetId);
    
  if (updateError) {
    console.error('❌ Erro ao atualizar metadados:', updateError.message);
  } else {
    console.log('✅ Restaurante corrigido com sucesso no Supabase!');
  }
}

run();
