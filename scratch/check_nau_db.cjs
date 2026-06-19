const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?$/);
      if (match) {
        process.env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
      }
    });
  }
}
loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const id = '3b9fce9a-7385-4a04-a63f-59cb83a3071d';
  console.log(`Buscando restaurante ID: ${id}...`);
  
  const { data: rest, error: restErr } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();
    
  if (restErr) {
    console.error('Erro ao buscar restaurante:', restErr.message);
    return;
  }
  
  console.log('Restaurante:', {
    name: rest.name,
    instagram: rest.instagram_url,
    website: rest.site_oficial,
    confianca: rest.confianca_confirmada,
    working_hours: rest.working_hours
  });

  const { data: categories, error: catErr } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', id);

  if (catErr) {
    console.error('Erro ao buscar categorias:', catErr.message);
    return;
  }

  console.log(`\nEncontradas ${categories.length} categorias:`);
  for (const cat of categories) {
    const { data: items, error: itemErr } = await supabase
      .from('menu_items')
      .select('id')
      .eq('category_id', cat.id);
      
    console.log(`- Categoria: "${cat.name}" | ID: ${cat.id} | Itens: ${items ? items.length : 0}`);
  }
}

main();
