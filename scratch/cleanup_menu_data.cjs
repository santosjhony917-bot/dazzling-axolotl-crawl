const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OPENAI_KEY = process.env.VITE_OPENAI_API_KEY;

// Função heurística para transformar textos para Title Case
function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Limpa prefixos como "011: " ou "GrubGo - "
function cleanPrefixes(name) {
  if (!name) return '';
  return name.replace(/^[\d\w\s]+:\s*/i, '').trim();
}

async function callOpenAIForNames(items) {
  if (!OPENAI_KEY) {
    console.warn("OpenAI API key missing in .env. Falling back to heuristic naming.");
    return [];
  }

  try {
    const prompt = `Você receberá uma lista de pratos de restaurantes no formato JSON contendo "id", "name", "category" e "description".
Sua tarefa é analisar o contexto e sugerir um nome de exibição otimizado para a BUSCA GLOBAL (searchDisplayName) para cada um deles.
Regras:
1. Nomes genéricos como "Filé" em uma categoria "Saladas" devem ser transformados em "Salada com Filé".
2. Nomes genéricos como "Frango" em uma categoria "Saladas" devem ser transformados em "Salada de Frango".
3. Se o nome contiver prefixos redundantes como "011: Pizza", remova-os (retornando apenas "Pizza").
4. Apenas corrija se necessário. Se o nome já for descritivo e claro, retorne-o exatamente como está (com Title Case).
5. O nome deve ser curto (máximo 40 caracteres).
6. Retorne APENAS um array JSON válido sem markdown ou blocos de código. Exemplo: [{"id": "...", "searchDisplayName": "..."}].

Lista de pratos:
${JSON.stringify(items, null, 2)}`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content.trim();
    // Limpar possíveis delimitadores de markdown ```json
    const cleanedJson = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error("OpenAI call failed:", error.message);
    return [];
  }
}

async function run() {
  console.log("Iniciando varredura e limpeza do banco de dados...");
  
  // 1. Buscar todos os pratos com categorias
  const { data: items, error } = await supabase
    .from('menu_items')
    .select(`
      id,
      name,
      description,
      price,
      category_id,
      image_url,
      order_index,
      menu_categories (
        name
      )
    `);

  if (error) {
    console.error("Erro ao carregar pratos:", error);
    return;
  }

  console.log(`Total de pratos carregados: ${items.length}`);
  
  let splitCount = 0;
  let sanitizeCount = 0;

  const itemsToSanitize = [];

  for (const item of items) {
    const desc = item.description || '';
    const categoryName = item.menu_categories ? item.menu_categories.name : '';

    // 2. DETECTAR SE O ITEM TEM PREÇOS UNIFICADOS (Frente 1 / 2)
    // Ex: "Individual 36.90 / Dupla 60.90" ou "Individual 44.90 / Dupla 74.90"
    const regexDouble = /individual\s*([\d,.]+)\s*\/\s*dupla\s*([\d,.]+)/i;
    const match = desc.match(regexDouble);

    if (match) {
      console.log(`\nIdentificado preço duplo para: "${item.name}" (${categoryName})`);
      const priceIndividual = parseFloat(match[1].replace(',', '.'));
      const priceDouble = parseFloat(match[2].replace(',', '.'));

      if (!isNaN(priceIndividual) && !isNaN(priceDouble)) {
        console.log(`-> Dividindo: Individual (R$ ${priceIndividual}) e Dupla (R$ ${priceDouble})`);
        
        // Criar o item Individual
        const individualId = uuidv4();
        const { error: insErr } = await supabase
          .from('menu_items')
          .insert({
            id: individualId,
            category_id: item.category_id,
            name: `${item.name} (Individual)`,
            description: desc.replace(regexDouble, '').trim(),
            price: priceIndividual,
            image_url: item.image_url,
            order_index: item.order_index,
            is_active: true,
            search_display_name: toTitleCase(`${item.name} (Individual)`)
          });

        if (insErr) {
          console.error("Erro ao inserir prato individual:", insErr);
        } else {
          console.log(`[OK] Inserido: "${item.name} (Individual)"`);
          splitCount++;
        }

        // Atualizar o item original para Dupla
        const { error: updErr } = await supabase
          .from('menu_items')
          .update({
            name: `${item.name} (Dupla)`,
            description: desc.replace(regexDouble, '').trim(),
            price: priceDouble,
            search_display_name: toTitleCase(`${item.name} (Dupla)`)
          })
          .eq('id', item.id);

        if (updErr) {
          console.error("Erro ao atualizar prato duplo:", updErr);
        } else {
          console.log(`[OK] Atualizado original para: "${item.name} (Dupla)"`);
          splitCount++;
        }

        continue; // Pular análise de nome para o item já processado aqui
      }
    }

    // Guardar para lote de sanitização por IA
    itemsToSanitize.push({
      id: item.id,
      name: item.name,
      category: categoryName,
      description: desc
    });
  }

  // 3. SANITIZAR NOMES E APLICAR IA EM SEGUNDO PLANO
  console.log(`\nPreparando para sanitizar ${itemsToSanitize.length} pratos...`);
  
  // Dividir em lotes de 15 para não estourar tokens ou timeouts
  const batchSize = 15;
  for (let i = 0; i < itemsToSanitize.length; i += batchSize) {
    const batch = itemsToSanitize.slice(i, i + batchSize);
    console.log(`Processando lote de sanitização ${i / batchSize + 1}...`);

    // Obter nomes otimizados da IA
    const aiResults = await callOpenAIForNames(batch);
    const aiResultsMap = new Map(aiResults.map(r => [r.id, r.searchDisplayName]));

    for (const item of batch) {
      // Nome heurístico em Title Case como fallback
      let searchDisplayName = toTitleCase(cleanPrefixes(item.name));
      
      // Sobrescrever se tivermos sugestão da IA
      if (aiResultsMap.has(item.id)) {
        searchDisplayName = aiResultsMap.get(item.id);
      }

      // Atualizar no banco
      const { error: updErr } = await supabase
        .from('menu_items')
        .update({
          search_display_name: searchDisplayName
        })
        .eq('id', item.id);

      if (updErr) {
        console.error(`Erro ao salvar search_display_name para "${item.name}":`, updErr);
      } else {
        sanitizeCount++;
      }
    }
  }

  console.log(`\n=========================================`);
  console.log(`FIM DA LIMPEZA E OTIMIZAÇÃO`);
  console.log(`Pratos divididos/corrigidos (Tamanhos): ${splitCount}`);
  console.log(`Pratos sanitizados na busca: ${sanitizeCount}`);
  console.log(`=========================================`);
}

run();
