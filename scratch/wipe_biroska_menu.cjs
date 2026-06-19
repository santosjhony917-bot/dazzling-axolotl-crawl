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
  
  console.log(`📡 Removendo cardápio de "A Biroska Lanches" no Supabase...`);
  
  // 1. Deleta categorias (e por cascata/limpeza manual, os itens de menu vinculados)
  const { error: delError } = await supabase.from('menu_categories').delete().eq('restaurant_id', targetId);
  if (delError) {
    console.error('❌ Erro ao deletar categorias de cardápio:', delError.message);
  } else {
    console.log('✅ Categorias de cardápio deletadas.');
  }
  
  // 2. Limpa os links de site/WhatsForm quebrados no banco
  const { error: restError } = await supabase
    .from('restaurants')
    .update({
      other_url: null,
      external_url: null,
      ifood_url: null
    })
    .eq('id', targetId);
    
  if (restError) {
    console.error('❌ Erro ao limpar website no restaurante:', restError.message);
  } else {
    console.log('✅ Link do site/WhatsForm limpo (definido como null).');
  }
  
  console.log('🎉 Limpeza concluída com sucesso!');
}

run();
