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

async function saveMenuToSupabase(restaurantId, menuCategories) {
  if (!menuCategories || menuCategories.length === 0) return;
  console.log(`   📡 Salvando cardápio correto no Supabase (${menuCategories.length} categorias)...`);
  
  // 1. Limpa o cardápio antigo
  const { error: delError } = await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId);
  if (delError) throw delError;
  
  // 2. Insere as novas categorias e pratos
  let orderIdx = 0;
  for (const cat of menuCategories) {
    if (!cat.items || cat.items.length === 0) continue;
    
    const { data: catData, error: catError } = await supabase
      .from('menu_categories')
      .insert([{ restaurant_id: restaurantId, name: cat.category_name, order_index: orderIdx++ }])
      .select()
      .single();
      
    if (catError) {
      console.error(`      ⚠️ Erro ao inserir categoria "${cat.category_name}":`, catError.message);
      continue;
    }
    
    const itemsToInsert = cat.items.map(item => ({
      category_id: catData.id,
      name: item.name,
      price: item.price || 0,
      description: item.description || '',
      image_url: null
    }));
    
    const { error: itemsError } = await supabase.from('menu_items').insert(itemsToInsert);
    if (itemsError) {
      console.error(`      ⚠️ Erro ao inserir itens na categoria "${cat.category_name}":`, itemsError.message);
    }
  }
  console.log(`   ✅ Cardápio correto salvo com sucesso no Supabase!`);
}

const menuChunkSchema = {
  name: "extrator_cardapio_lote",
  strict: true,
  schema: {
    type: "object",
    properties: {
      categories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category_name: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: ["number", "null"] },
                  description: { type: ["string", "null"] }
                },
                required: ["name", "price", "description"],
                additionalProperties: false
              }
            }
          },
          required: ["category_name", "items"],
          additionalProperties: false
        }
      }
    },
    required: ["categories"],
    additionalProperties: false
  }
};

async function run() {
  const targetId = '09ccec7e-12fd-40a3-82a6-9bb45e7f6802';
  
  console.log(`📡 Carregando restaurante ID ${targetId} do Supabase...`);
  const { data: rest, error } = await supabase.from('restaurants').select('*').eq('id', targetId).single();
  
  if (error || !rest) {
    console.error(`❌ Restaurante não encontrado no banco:`, error?.message);
    process.exit(1);
  }
  
  console.log(`📍 Restaurante: "${rest.name}" em ${rest.city}/${rest.state}`);
  
  const correctInstagram = 'https://www.instagram.com/a_biroska/';
  const correctMenuUrl = 'https://whatsform.com/HqP3k4';
  
  const dadosColetados = {
    instagram: correctInstagram,
    phone: rest.phone || '83991442273',
    menuSourceUrl: correctMenuUrl,
    website: correctMenuUrl,
    pageContent: 'Restaurante A Biroska Lanches de João Pessoa'
  };
  
  console.log('\n--- INICIANDO VALIDAÇÃO DE METADADOS VIA IA ---');
  const result = await validarECompletarDados(rest, dadosColetados);
  
  console.log('\n--- RESULTADO DA VALIDAÇÃO ---');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.confianca_confirmada) {
    // 1. Atualizar metadados no Supabase
    console.log('\n📡 Atualizando metadados do restaurante no Supabase...');
    
    // Atualizar redes sociais
    let socialNetworks = [
      { platform: 'instagram', url: correctInstagram }
    ];
    
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        instagram: correctInstagram,
        website: correctMenuUrl,
        social_networks: socialNetworks,
        phone: result.telefone,
        description: result.about,
        working_hours: result.working_hours,
        category: result.categoria_correta
      })
      .eq('id', targetId);
      
    if (updateError) {
      console.error('❌ Erro ao atualizar metadados:', updateError.message);
    } else {
      console.log('✅ Metadados atualizados com sucesso!');
    }
    
    // 2. Extrair cardápio do rawMenuDump usando a IA de extração de lote se houver
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY });
    const MODEL_NAME = process.env.VITE_AI_MODEL || "gpt-4o-mini";
    
    // Ler os dados crus que a IA de Validação coletou da WhatsForm
    // Como a função principal não expõe rawMenuDump diretamente, vamos usar a própria WhatsForm que salvamos no contexto ou buscar o texto da página whatsform.com/HqP3k4 usando Puppeteer
    console.log('\n🧭 Raspando WhatsForm diretamente para extrair o cardápio...');
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(correctMenuUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const pageText = await page.evaluate(() => document.body.textContent || '');
    await browser.close();
    
    console.log(`✅ Texto do WhatsForm obtido (${pageText.length} caracteres). Enviando para a IA de extração...`);
    
    const prompt = `Você é um extrator de cardápios especializado de alta precisão. 
Sua tarefa é analisar o texto do WhatsForm fornecido e extrair todos os pratos/bebidas com preços e categorias em formato JSON.

Texto bruto:
${pageText}

REGRAS OBRIGATÓRIAS:
1. Agrupe os itens em categorias claras (ex: Hambúrgueres, Pizzas, Sanduíches, Bebidas).
2. Para cada item individual, forneça:
   - "name": o nome exato.
   - "price": o preço em formato de número decimal (ex: 29.90). Se não houver preço, use null.
   - "description": ingredientes descritos, ou null.
`;
    
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "Você é um extrator de dados de cardápio de restaurante. Converta o texto bruto em JSON estruturado." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_schema", json_schema: menuChunkSchema },
      temperature: 0.1
    });
    
    const menuResult = JSON.parse(completion.choices[0].message.content);
    console.log('Cardápio Extraído pela IA:');
    console.log(JSON.stringify(menuResult, null, 2));
    
    if (menuResult && menuResult.categories && menuResult.categories.length > 0) {
      await saveMenuToSupabase(targetId, menuResult.categories);
      console.log('\n🎉 SUCESSO: O restaurante A Biroska Lanches agora possui os metadados corretos, o Instagram correto de João Pessoa e o cardápio real extraído do WhatsForm!');
    } else {
      console.error('❌ Falha ao extrair categorias de cardápio.');
    }
  }
}

run().catch(console.error);
