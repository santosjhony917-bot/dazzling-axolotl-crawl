const { isErrorOrDeactivatedPage } = require('./ai_validator.cjs');
const { extractMenuFromPhotosWithAI } = require('./gallery_enricher.cjs');
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

async function runTests() {
  console.log('🧪 INICIANDO TESTES DE PREVENÇÃO DE ALUCINAÇÕES DE CARDÁPIO...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- PARTE 1: Teste de isErrorOrDeactivatedPage (Guardrail de Texto) ---
  console.log('--- TESTANDO VALIDADOR DE TEXTO DE ERRO (Guardrails) ---');
  
  const errorPages = [
    'Form Not Found\nThe form you are looking for has been deactivated or does not exist.',
    'Oops! Página não encontrada (404 Error)',
    'Este cardápio não está mais disponível.',
    'login • instagram',
    'Site em manutenção. Voltamos em breve.',
    'This profile is deleted or removed.',
    'Apenas uma mensagem curta de layout' // Sem preços e sem números relevantes, length < 150
  ];

  const validPages = [
    'Cardápio Especial Biroska:\n1. Hamburguer Clássico - R$ 25,00\n2. Batata Frita Suprema - R$ 18,90\n3. Refrigerante Lata - R$ 6,00',
    'Menu de Bebidas\nCerveja Heineken Long Neck 12\nSuco de Laranja Natural 8\nÁgua sem gás 4',
    'PIZZA CALABRESA - R$45. Pizza artesanal com molho de tomate, queijo muçarela e orégano.',
  ];

  for (const page of errorPages) {
    const isError = isErrorOrDeactivatedPage(page);
    assert(isError === true, `Texto de erro deve ser detectado: "${page.replace(/\n/g, ' ')}"`);
  }

  for (const page of validPages) {
    const isError = isErrorOrDeactivatedPage(page);
    assert(isError === false, `Texto de cardápio válido NÃO deve ser detectado como erro: "${page.replace(/\n/g, ' ')}"`);
  }

  // --- PARTE 2: Teste de extractMenuFromPhotosWithAI (Prevenção de Alucinações de Visão/OCR) ---
  console.log('\n--- TESTANDO OCR/VISÃO COM FOTO DE ERRO OU NÃO-CARDÁPIO ---');
  
  if (!process.env.VITE_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.log('⚠️  VITE_OPENAI_API_KEY / OPENAI_API_KEY não configurada. Pulando teste de API real.');
  } else {
    try {
      // Usaremos uma URL de imagem que é uma foto de ambiente/fachada ou não-cardápio
      // ex: Um marcador genérico de imagem de erro ou uma foto de teste
      const invalidPhotoUrl = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500'; // Foto de restaurante vazio (sem texto/preços)
      
      console.log(`📡 Enviando foto de ambiente/não-cardápio para IA de Visão para garantir que ela não alucine: "${invalidPhotoUrl}"...`);
      
      const categories = await extractMenuFromPhotosWithAI('test-restaurant-id', [invalidPhotoUrl]);
      
      console.log('Categorias extraídas:', JSON.stringify(categories, null, 2));
      
      assert(
        categories !== null && categories.length === 0, 
        'IA de Visão deve retornar categories=[] e NÃO alucinar itens para uma imagem que não é um cardápio.'
      );
    } catch (err) {
      console.error('❌ Falha ao executar o teste da IA de Visão:', err.message);
      failed++;
    }
  }

  console.log(`\n--- RESUMO DOS TESTES ---`);
  console.log(`Passou: ${passed}`);
  console.log(`Falhou: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
