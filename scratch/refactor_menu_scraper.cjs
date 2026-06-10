const fs = require('fs');
const path = require('path');

const scraperPath = path.join(__dirname, '..', 'scratch', 'menu_scraper.cjs');
let content = fs.readFileSync(scraperPath, 'utf8');

console.log('Starting menu_scraper.cjs refactoring...');

// 1. Replace the beginning of run()
const oldRunStart = `async function run() {
  console.log(\`\\n=============================================================\`);
  console.log(\`📋 MENU SCRAPER: EXTRAÇÃO DE CARDÁPIOS\`);
  console.log(\`=============================================================\\n\`);

  console.log('📡 Buscando estabelecimentos no Supabase...');
  const { data, error: fetchError } = await supabase
    .from('restaurants')
    .select('*');

  if (fetchError) {
    console.error('❌ Erro ao buscar do Supabase:', fetchError.message);
    process.exit(1);
  }

  console.log(\`📂 Carregados \${data.length} estabelecimentos do Supabase.\`);

  // Filtra restaurantes que têm link de cardápio (other_url ou external_url)
  const withMenu = data.filter(r => {
    const menuUrl = r.other_url || r.external_url;
    return menuUrl && menuUrl.startsWith('http');
  }).map(r => ({
    id: r.id, // Já é UUID
    name: r.name,
    category: r.category,
    menuSourceUrl: r.other_url || r.external_url,
    city: r.city || 'João Pessoa',
    address: r.address || ''
  }));

  console.log(\`🔗 \${withMenu.length} estabelecimentos possuem link de cardápio no Supabase.\`);

  if (withMenu.length === 0) {
    console.log(\`❌ Nenhum restaurante com link de cardápio disponível.\`);
    return;
  }

  // Carrega resultados existentes localmente (como backup/status)
  let results = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      results = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      console.log(\`📂 Carregados \${results.length} resultados anteriores.\`);
    } catch (e) {
      results = [];
    }
  }

  // Carrega estado para resumo
  let startIndex = 0;
  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      startIndex = state.lastProcessedIndex + 1;
      console.log(\`🔄 Retomando do índice \${startIndex}...\`);
    } catch (e) {}
  }

  // Mapa de IDs já processados
  const processedIds = new Set(results.map(r => r.restaurantId));

  // Filtra apenas os não processados ainda
  const pending = withMenu.filter(r => !processedIds.has(r.id)).slice(startIndex);

  if (pending.length === 0 && processedIds.size > 0) {
    console.log(\`✨ Todos os cardápios já foram processados!\`);
    return;
  }

  console.log(\`🔄 \${pending.length} cardápios pendentes para processar.\\n\`);`;

const newRunStart = `async function run() {
  console.log(\`\\n=============================================================\`);
  console.log(\`📋 MENU SCRAPER: EXTRAÇÃO DE CARDÁPIOS\`);
  console.log(\`=============================================================\\n\`);

  // Parse command line arguments
  let targetId = null;
  const singleIdx = process.argv.indexOf('--single');
  const idIdx = process.argv.indexOf('--id');
  if (singleIdx !== -1 && idIdx !== -1 && idIdx + 1 < process.argv.length) {
    targetId = process.argv[idIdx + 1];
    console.log(\`🎯 Modo Single ativado para o restaurante ID: \${targetId}\`);
  }

  console.log('📡 Buscando estabelecimentos no Supabase...');
  const { data, error: fetchError } = await supabase
    .from('restaurants')
    .select('*');

  if (fetchError) {
    console.error('❌ Erro ao buscar do Supabase:', fetchError.message);
    process.exit(1);
  }

  console.log(\`📂 Carregados \${data.length} estabelecimentos do Supabase.\`);

  // Filtra restaurantes que têm link de cardápio (other_url ou external_url)
  let withMenu = data.filter(r => {
    const menuUrl = r.other_url || r.external_url;
    return menuUrl && menuUrl.startsWith('http');
  }).map(r => ({
    id: r.id, // Já é UUID
    name: r.name,
    category: r.category,
    menuSourceUrl: r.other_url || r.external_url,
    city: r.city || 'João Pessoa',
    address: r.address || ''
  }));

  if (targetId) {
    withMenu = withMenu.filter(r => r.id === targetId);
    if (withMenu.length === 0) {
      console.log(\`❌ O restaurante com ID "\${targetId}" não possui link de cardápio válido cadastrado.\`);
      console.log(\`RESULT:{"success":false,"error":"O restaurante não possui link de cardápio cadastrado no Supabase."}\`);
      return;
    }
  }

  console.log(\`🔗 \${withMenu.length} estabelecimentos possuem link de cardápio no Supabase.\`);

  if (withMenu.length === 0) {
    console.log(\`❌ Nenhum restaurante com link de cardápio disponível.\`);
    return;
  }

  // Carrega resultados existentes localmente (como backup/status)
  let results = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      results = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      console.log(\`📂 Carregados \${results.length} resultados anteriores.\`);
    } catch (e) {
      results = [];
    }
  }

  // Carrega estado para resumo
  let startIndex = 0;
  if (!targetId && fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      startIndex = state.lastProcessedIndex + 1;
      console.log(\`🔄 Retomando do índice \${startIndex}...\`);
    } catch (e) {}
  }

  // Mapa de IDs já processados
  const processedIds = new Set(results.map(r => r.restaurantId));

  // Filtra apenas os não processados ainda
  let pending = withMenu;
  if (!targetId) {
    pending = withMenu.filter(r => !processedIds.has(r.id)).slice(startIndex);
  }

  if (!targetId && pending.length === 0 && processedIds.size > 0) {
    console.log(\`✨ Todos os cardápios já foram processados!\`);
    return;
  }

  console.log(\`🔄 \${pending.length} cardápios pendentes para processar.\\n\`);`;

content = content.replace(oldRunStart, newRunStart);

// 2. Track single result inside loop and edit the end of loop
// Let's modify the end of loop, let's find:
// '    // Salva estado' down to '  await browser.close();'
const loopEndStart = content.indexOf('    // Salva estado\n    const state = { lastProcessedIndex: startIndex + idx };');
const loopEndEnd = content.indexOf('  await browser.close();', loopEndStart);

if (loopEndStart !== -1 && loopEndEnd !== -1) {
  const oldLoopEndBlock = content.substring(loopEndStart, loopEndEnd);
  
  const newLoopEndBlock = `    // Salva estado
    if (!targetId) {
      const state = { lastProcessedIndex: startIndex + idx };
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    }

    // Aguarda para evitar bloqueio
    if (!targetId && idx < pending.length - 1) {
      const waitTime = 1500 + Math.random() * 2000;
      console.log(\`   ⏱️ Aguardando \${Math.round(waitTime)}ms...\`);
      await delay(waitTime);
    }
  }

  let singleResultObj = { success: false, error: "Nenhum prato/categoria estruturado foi identificado na página." };
  if (targetId && updatedCount > 0) {
    singleResultObj = { success: true };
  } else if (targetId && failedCount > 0) {
    singleResultObj = { success: false, error: "O robô encontrou um erro de navegação ou extração." };
  }

  if (targetId) {
    console.log(\`RESULT:\${JSON.stringify(singleResultObj)}\`);
  }
\n`;
  content = content.replace(oldLoopEndBlock, newLoopEndBlock);
  console.log('Replaced loop end block successfully.');
} else {
  console.error('COULD NOT find loop end block in menu_scraper.cjs!');
}

// 3. Wrap state file unlink at the very end
const oldUnlinkBlock = `  // Remove estado se tudo concluído
  if (fs.existsSync(STATE_FILE)) {
    const remaining = withMenu.length - results.length;
    if (remaining <= 0) {
      fs.unlinkSync(STATE_FILE);
    }
  }`;

const newUnlinkBlock = `  // Remove estado se tudo concluído
  if (!targetId && fs.existsSync(STATE_FILE)) {
    const remaining = withMenu.length - results.length;
    if (remaining <= 0) {
      fs.unlinkSync(STATE_FILE);
    }
  }`;

content = content.replace(oldUnlinkBlock, newUnlinkBlock);

fs.writeFileSync(scraperPath, content, 'utf8');
console.log('menu_scraper.cjs refactored successfully.');
