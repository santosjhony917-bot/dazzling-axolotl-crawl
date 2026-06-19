/**
 * Teste isolado: Simula a extração de cardápio do dump bruto livemenu_dump2.txt
 * para verificar se a arquitetura de 2 passos funciona corretamente.
 */
const fs = require('fs');
const path = require('path');

// Carrega env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?$/);
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

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY });

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
                  description: { type: ["string", "null"] },
                  image_url: { type: ["string", "null"] }
                },
                required: ["name", "price", "description", "image_url"],
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

function cleanAndSplitRawDump(rawText) {
  if (!rawText) return [];
  const screens = rawText.split('--- TELA EXTRAÍDA ---').filter(s => s.trim().length > 100);
  
  const cleanedScreens = screens.map(screen => {
    return screen
      .replace(/Seu pedido foi atualizado!.*?Copiar/gs, '')
      .replace(/Falha ao carregar o menu\..*?OK/gs, '')
      .replace(/Mesa fechada com sucesso!.*?Fechar/gs, '')
      .replace(/O pedido não pôde ser aceito\..*?Voltar/gs, '')
      .replace(/Desculpe, o pedido não foi processado.*?compreensão\./gs, '')
      .replace(/Deseja fechar sua parte da conta\?.*?Voltar/gs, '')
      .replace(/OK Nome alterado com sucesso OK/g, '')
      .replace(/Facebook Twitter Whatsapp Copiar/g, '')
      .replace(/\[IMAGEM: https:\/\/livemenu\.app\/assets\/images\/(powered-by-live-menu\.svg|status\/ilustra-erro\.svg|pt-br\.svg|preload\.svg)\]/g, '')
      .replace(/\d+ \d+ \d+ \d+ \d+/g, '')
      .replace(/Confirmar Voltar OK/g, '')
      .trim();
  });
  
  return cleanedScreens.filter(s => s.length > 50);
}

async function testMenuExtraction() {
  console.log('=== TESTE DE EXTRAÇÃO DE CARDÁPIO EM LOTES ===\n');
  
  const rawDump = fs.readFileSync('scratch/livemenu_dump2.txt', 'utf-8');
  console.log(`Dump bruto: ${rawDump.length} caracteres`);
  
  const cleanedScreens = cleanAndSplitRawDump(rawDump);
  console.log(`Telas limpas: ${cleanedScreens.length}`);
  
  // Mostra tamanho de cada tela
  cleanedScreens.forEach((s, i) => {
    console.log(`  Tela ${i+1}: ${s.length} chars, prévia: "${s.substring(0, 80).replace(/\n/g, ' ')}..."`);
  });
  
  // Agrupa em lotes
  const CHUNK_SIZE = 15000;
  const chunks = [];
  let currentChunk = '';
  
  for (const screen of cleanedScreens) {
    if (currentChunk.length + screen.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = screen;
    } else {
      currentChunk += '\n\n=== PRÓXIMA SEÇÃO DO MENU ===\n\n' + screen;
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  
  console.log(`\nLotes criados: ${chunks.length}`);
  chunks.forEach((c, i) => console.log(`  Lote ${i+1}: ${c.length} chars`));
  
  // Processa cada lote
  console.log('\nProcessando lotes em paralelo...\n');
  
  const chunkPromises = chunks.map(async (chunk, idx) => {
    const chunkPrompt = `Extraia TODOS os itens de cardápio/menu do texto abaixo em formato JSON estruturado.
    
REGRAS OBRIGATÓRIAS:
1. Extraia CADA prato/item individualmente com: name, price (número ou null), description (ou null), image_url (ou null).
2. Agrupe por categorias (Entradas, Camarões, Peixes, Massas, Sobremesas, Drinks, Bebidas, Carnes, Kids, etc.).
3. Para image_url: use APENAS URLs que aparecem como [IMAGEM: url] DIRETAMENTE ANTES ou DEPOIS do nome do prato. NUNCA invente URLs.
4. Ignore imagens do cabeçalho/logo/capa do site (URLs com /admin/theme/ ou /Menu/ sem /MenuItem/ ou /Product/).
5. NÃO PULE NENHUM ITEM. Se houver 20 pratos de camarão, TODOS os 20 devem estar no JSON.
6. Preço "Sob consulta" ou ausente = null.

[TEXTO DO CARDÁPIO - LOTE ${idx + 1}/${chunks.length}]
${chunk}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um extrator de dados de cardápio de restaurante. Sua única tarefa é converter texto bruto em JSON estruturado. Extraia TODOS os itens, sem exceção." },
          { role: "user", content: chunkPrompt }
        ],
        response_format: { type: "json_schema", json_schema: menuChunkSchema },
        temperature: 0.05,
        max_tokens: 16384
      });
      const result = JSON.parse(completion.choices[0].message.content);
      const totalItems = result.categories.reduce((acc, c) => acc + c.items.length, 0);
      console.log(`✅ Lote ${idx + 1}: ${result.categories.length} categorias, ${totalItems} itens`);
      result.categories.forEach(cat => {
        console.log(`    📂 ${cat.category_name}: ${cat.items.length} itens`);
      });
      return result.categories;
    } catch (err) {
      console.error(`❌ Erro no lote ${idx + 1}: ${err.message}`);
      return [];
    }
  });

  const allChunkResults = await Promise.all(chunkPromises);
  
  // Mescla
  const categoryMap = new Map();
  for (const chunkCategories of allChunkResults) {
    for (const cat of chunkCategories) {
      const key = cat.category_name.toLowerCase().trim();
      if (categoryMap.has(key)) {
        const existing = categoryMap.get(key);
        const existingNames = new Set(existing.items.map(i => i.name.toLowerCase().trim()));
        for (const item of cat.items) {
          if (!existingNames.has(item.name.toLowerCase().trim())) {
            existing.items.push(item);
            existingNames.add(item.name.toLowerCase().trim());
          }
        }
      } else {
        categoryMap.set(key, { category_name: cat.category_name, items: [...cat.items] });
      }
    }
  }

  const merged = Array.from(categoryMap.values());
  const totalItems = merged.reduce((acc, c) => acc + c.items.length, 0);
  
  console.log(`\n🎯 RESULTADO FINAL MESCLADO:`);
  console.log(`   ${merged.length} categorias, ${totalItems} itens TOTAIS\n`);
  merged.forEach(cat => {
    console.log(`   📂 ${cat.category_name} (${cat.items.length} itens):`);
    cat.items.forEach(item => {
      const priceStr = item.price ? `R$ ${item.price.toFixed(2)}` : 'Sob consulta';
      const imgStr = item.image_url ? '📸' : '';
      console.log(`      • ${item.name} — ${priceStr} ${imgStr}`);
    });
  });
  
  // Salva resultado
  fs.writeFileSync('scratch/test_chunked_result.json', JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`\nResultado salvo em scratch/test_chunked_result.json`);
}

testMenuExtraction().catch(console.error);
