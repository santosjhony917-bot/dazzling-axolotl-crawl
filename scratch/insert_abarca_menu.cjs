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
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = value.trim();
      }
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const menuData = [
  {
    name: "Entrada Ensopado",
    items: [
      { name: "Camarão", price: 25.00 },
      { name: "Caranguejo", price: 25.00 },
      { name: "Peixe", price: 22.00 },
      { name: "Marisco", price: 22.00 }
    ]
  },
  {
    name: "Porções",
    items: [
      { name: "Arrumadinho", price: 60.00 },
      { name: "Agulhinha", description: "6 unidades", price: 26.00 },
      { name: "Bolinho de bacalhau", description: "8 unidades", price: 40.00 },
      { name: "Batata Frita", price: 24.00 },
      { name: "Camarão c/ casca e fritas", description: "400g", price: 37.00 },
      { name: "Calabresa acebolada c/ fritas", price: 42.00 },
      { name: "Carne de sol acebolada c/ fritas", price: 60.00 },
      { name: "Filé mignon c/ fritas", price: 80.00 },
      { name: "Isca de Frango c/ fritas", price: 45.00 },
      { name: "Isca de peixe c/ fritas", price: 58.00 },
      { name: "Macaxeira frita", price: 24.00 },
      { name: "Panceta de porco", price: 40.00 },
      { name: "Patola de caranguejo", price: 47.00 },
      { name: "Queijo coalho assado", price: 16.00 },
      { name: "Salame italiano", price: 25.00 },
      { name: "Lula a romana", price: 60.00 },
      { name: "Pastel", description: "9 unidades", price: 25.00 },
      { name: "Filé de camarão à milanesa", price: 70.00 }
    ]
  },
  {
    name: "Pratos Executivos",
    items: [
      { name: "Carne de sol", description: "feijão, arroz, batata frita e salada", price: 30.00 },
      { name: "Filé a parmegiana", price: 48.00 },
      { name: "Filé mignon ao molho madeira", price: 48.00 },
      { name: "Filé de frango", description: "feijão, arroz, batata frita e salada", price: 26.00 },
      { name: "Strogonoff de frango", description: "arroz e batata frita", price: 28.00 },
      { name: "Filé de frango à parmegiana", description: "arroz e batata frita", price: 36.00 },
      { name: "Strogonoff de camarão", description: "arroz e batata frita", price: 32.00 },
      { name: "Filé de surubim", price: 30.00 },
      { name: "Bobó de camarão", description: "arroz e batata frita", price: 45.00 }
    ]
  },
  {
    name: "Peixe para 2 pessoas",
    items: [
      { name: "Anchova (Simples)", description: "salada e fritas", price: 80.00 },
      { name: "Anchova (Completa)", description: "arroz, pirão, salada e fritas", price: 100.00 },
      { name: "Tilápia (Simples)", description: "salada e fritas", price: 65.00 },
      { name: "Tilápia (Completa)", description: "arroz, pirão, salada e fritas", price: 95.00 },
      { name: "Cioba (Simples)", description: "salada e fritas", price: 100.00 },
      { name: "Cioba (Completa)", description: "arroz, pirão, salada e fritas", price: 115.00 },
      { name: "Meca (Simples)", description: "salada e fritas", price: 100.00 },
      { name: "Meca (Completa)", description: "arroz, pirão, salada e fritas", price: 115.00 }
    ]
  },
  {
    name: "Porções extra",
    items: [
      { name: "Arroz", price: 10.00 },
      { name: "Feijão", price: 10.00 },
      { name: "Pirão", price: 12.00 },
      { name: "Vinagrete", price: 10.00 }
    ]
  },
  {
    name: "Bebidas",
    items: [
      { name: "Água sem gás", price: 4.00 },
      { name: "Água com gás", price: 5.00 },
      { name: "Água sem gás 1 litro", price: 8.00 },
      { name: "Garrafa de água de coco", price: 15.00 },
      { name: "H2OH", price: 8.00 },
      { name: "Refrigerante lata", price: 8.00 },
      { name: "Refrigerante 1 litro", price: 14.00 },
      { name: "Refrigerante 2 litros", price: 20.00 }
    ]
  },
  {
    name: "Sucos",
    items: [
      { name: "Suco laranja/maracujá", price: 12.00 },
      { name: "Suco polpa", price: 10.00 },
      { name: "Jarra laranja/maracujá", price: 24.00 },
      { name: "Jarra polpa", price: 20.00 }
    ]
  },
  {
    name: "Cervejas",
    items: [
      { name: "Stella artois", price: 17.00 },
      { name: "Original", price: 15.00 },
      { name: "Heineken", price: 20.00 },
      { name: "Brahma chopp", price: 14.00 }
    ]
  },
  {
    name: "Drinks & Coquetéis",
    items: [
      { name: "Caipirinha de limão", price: 11.00 },
      { name: "Caipirinha de frutas", price: 14.00 },
      { name: "Caipirosca nacional", price: 20.00 },
      { name: "Caipirosca Absolut", price: 25.00 },
      { name: "Caipirinha de Serra limpa", price: 20.00 },
      { name: "Margarita", price: 25.00 },
      { name: "Pina colada", price: 25.00 },
      { name: "Cabo branco", description: "vodka, curaçau blue, sprite e suco de abacaxi", price: 25.00 },
      { name: "Tambaú", description: "gin, suco de caju e licor de pêssego", price: 25.00 },
      { name: "Alice (Sem álcool)", description: "suco de fruta, leite condensado e xarope de laranja", price: 20.00 }
    ]
  },
  {
    name: "Destilados (Dose)",
    items: [
      { name: "Pitú (Cachaça)", price: 5.00 },
      { name: "Matuta (Cachaça)", price: 6.00 },
      { name: "Serra limpa (Cachaça)", price: 12.00 },
      { name: "Sminorff (Vodka)", price: 10.00 },
      { name: "Absolut (Vodka)", price: 15.00 },
      { name: "Sminorff ice", price: 15.00 },
      { name: "Gin tônica nacional", price: 18.00 },
      { name: "Gin tônica importada", price: 27.00 },
      { name: "Old Parr (Whisky)", price: 17.00 },
      { name: "Black & White (Whisky)", price: 10.00 },
      { name: "Montilla (Rum)", price: 8.00 },
      { name: "Bacardi (Rum)", price: 12.00 },
      { name: "Campari (Bitter)", price: 10.00 }
    ]
  },
  {
    name: "Sobremesa",
    items: [
      { name: "Açaí no copo (300ml)", price: 13.00 },
      { name: "Açaí no copo (500ml)", price: 18.00 }
    ]
  }
];

async function run() {
  console.log("Buscando restaurante 'A Barca Cabo Branco'...");
  const { data: rest, error } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', '%Barca Cabo Branco%')
    .single();

  if (error || !rest) {
    console.error("Restaurante não encontrado:", error);
    return;
  }

  const restaurantId = rest.id;
  console.log(`Encontrado: ${rest.name} (${restaurantId})`);

  console.log("Apagando cardápio anterior se houver...");
  await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId);

  console.log("Inserindo novo cardápio extraído das imagens...");
  for (let i = 0; i < menuData.length; i++) {
    const cat = menuData[i];
    const { data: catData, error: catErr } = await supabase.from('menu_categories').insert({
      restaurant_id: restaurantId,
      name: cat.name,
      order_index: i
    }).select('id').single();

    if (catErr) {
      console.error("Erro ao inserir categoria", cat.name, catErr);
      continue;
    }

    if (cat.items && cat.items.length > 0) {
      const itemsToInsert = cat.items.map((item, j) => ({
        category_id: catData.id,
        name: item.name,
        description: item.description || null,
        price: item.price || 0,
        order_index: j
      }));
      const { error: itemErr } = await supabase.from('menu_items').insert(itemsToInsert);
      if (itemErr) {
        console.error("Erro ao inserir items da categoria", cat.name, itemErr);
      }
    }
  }

  console.log("Atualizando informações de contato detectadas...");
  const { data: current } = await supabase.from('restaurants').select('social_networks').eq('id', restaurantId).single();
  let social = current?.social_networks || [];
  social = social.filter(s => s && s.platform !== 'instagram');
  social.push({ platform: 'instagram', url: 'https://instagram.com/quiosque_abarca_jp' });
  
  await supabase.from('restaurants').update({
    phone: '83998174440',
    social_networks: social
  }).eq('id', restaurantId);

  console.log("Concluído! Cardápio inserido com sucesso.");
}

run();
