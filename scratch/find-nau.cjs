const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Buscando categorias e itens de menu para NAU...');
  const { data: categories, error: catError } = await supabase
    .from('menu_categories')
    .select('id, name')
    .eq('restaurant_id', '3b9fce9a-7385-4a04-a63f-59cb83a3071d');

  if (catError) {
    console.error('Erro ao buscar categorias:', catError);
    return;
  }

  console.log('Categorias encontradas:', categories);

  if (categories && categories.length > 0) {
    const categoryIds = categories.map(c => c.id);
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('name, price, description, category_id')
      .in('category_id', categoryIds);

    if (itemsError) {
      console.error('Erro ao buscar itens:', itemsError);
    } else {
      console.log(`Itens de menu encontrados: ${items.length}`);
      console.log('Todos os itens:', items);
    }
  }
}

run();
