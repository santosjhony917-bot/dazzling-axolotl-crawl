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
  
  const { data: categories, error } = await supabase
    .from('menu_categories')
    .select('id, name, menu_items(id, name, price, description)')
    .eq('restaurant_id', targetId);
    
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(`Found ${categories ? categories.length : 0} categories:`);
    console.log(JSON.stringify(categories, null, 2));
  }
}

run();
