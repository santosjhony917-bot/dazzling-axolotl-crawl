'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const {
  auditCategories,
  extractItemsFromText,
  mergeCategories,
  runLocalOcr
} = require('./hybrid_menu_pipeline.cjs');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2] || '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}
loadEnv();

function getArg(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function hasArg(flag) {
  return process.argv.slice(2).includes(flag);
}

function normalizeAiCategories(categories) {
  return (categories || []).map(category => ({
    nome: category.category_name || category.nome || 'Cardápio',
    itens: (category.items || category.itens || []).map(item => ({
      nome: item.name || item.nome,
      descricao: item.description || item.descricao || null,
      preco: item.price ?? item.preco ?? null,
      foto_url: item.photo_url || item.foto_url || null
    }))
  }));
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

async function formatWithCheapModel(text, restaurantName) {
  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey || !text || text.trim().length < 50) return [];
  const openai = new OpenAI({ apiKey });
  const schema = {
    name: 'menu_hibrido',
    strict: true,
    schema: {
      type: 'object', additionalProperties: false, required: ['categories'],
      properties: {
        categories: {
          type: 'array', items: {
            type: 'object', additionalProperties: false, required: ['category_name', 'items'],
            properties: {
              category_name: { type: 'string' },
              items: {
                type: 'array', items: {
                  type: 'object', additionalProperties: false,
                  required: ['name', 'description', 'price', 'photo_url'],
                  properties: {
                    name: { type: 'string' }, description: { type: ['string', 'null'] },
                    price: { type: ['number', 'null'] }, photo_url: { type: ['string', 'null'] }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const response = await openai.chat.completions.create({
    model: process.env.MENU_FORMATTER_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Converta texto bruto de cardápio em JSON. Preserve todos os itens e preços; não invente dados. Este prefixo é estável para favorecer cache de prompt.'
      },
      {
        role: 'user',
        content: `Restaurante: ${restaurantName}\nExtraia nome, descrição e preço de todos os itens. Ignore navegação e popups.\n\n${text.slice(0, 18000)}`
      }
    ],
    response_format: { type: 'json_schema', json_schema: schema },
    temperature: 0,
    max_tokens: 8192
  });
  return normalizeAiCategories(JSON.parse(response.choices[0].message.content || '{}').categories);
}

async function persistMenu(supabase, restaurantId, categories, source, audit) {
  const { error: deleteError } = await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId);
  if (deleteError) throw deleteError;

  let categoryOrder = 0;
  for (const category of categories) {
    const { data: insertedCategory, error: categoryError } = await supabase
      .from('menu_categories')
      .insert({ restaurant_id: restaurantId, name: category.nome, order_index: categoryOrder++ })
      .select()
      .single();
    if (categoryError) throw categoryError;

    const items = (category.itens || []).map((item, index) => ({
      category_id: insertedCategory.id,
      name: item.nome,
      description: item.descricao || null,
      price: Number.isFinite(Number(item.preco)) ? Number(item.preco) : 0,
      image_url: item.foto_url || null,
      order_index: index
    }));
    if (items.length) {
      const { error: itemError } = await supabase.from('menu_items').insert(items);
      if (itemError) throw itemError;
    }
  }

  await supabase.from('restaurants').update({
    menu_source: source,
    ai_validated: audit.confidence !== 'low',
    ai_log: JSON.stringify({ pipeline: 'hybrid-v1', audit, source, validatedAt: new Date().toISOString() })
  }).eq('id', restaurantId);
}

function runLegacyFallback(args) {
  if (args.includes('--extension-only')) {
    console.log(`RESULT:${JSON.stringify({ success: false, requiresHuman: true, message: 'A evidência coletada pela extensão não atingiu confiança suficiente. Revise a aba visível; nenhum navegador oculto foi iniciado.' })}`);
    return Promise.resolve(0);
  }
  return new Promise(resolve => {
    console.log('[Hybrid Menu] Confiança insuficiente; acionando pipeline legado/visual.');
    const child = spawn(process.execPath, [path.join(__dirname, 'menu_extractor.cjs'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', chunk => process.stdout.write(chunk));
    child.stderr.on('data', chunk => process.stderr.write(chunk));
    child.on('close', code => resolve(code || 0));
  });
}

async function main() {
  const restaurantId = getArg('--id');
  const evidenceFile = getArg('--evidence-file');
  const dryRun = hasArg('--dry-run');
  if (!restaurantId) throw new Error('O argumento --id é obrigatório.');

  let evidence = {};
  if (evidenceFile && fs.existsSync(evidenceFile)) evidence = readJsonFile(evidenceFile);
  const rawText = [evidence.rawText, ...(evidence.textBlocks || [])].filter(Boolean).join('\n');
  const screenshots = (evidence.screenshots || []).filter(Boolean).slice(0, 6);

  if (rawText.trim().length < 50 && screenshots.length === 0) {
    process.exitCode = await runLegacyFallback(process.argv.slice(2));
    return;
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co',
    process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3'
  );
  const { data: restaurant, error } = await supabase.from('restaurants').select('name').eq('id', restaurantId).single();
  if (error) throw error;

  const domCategories = mergeCategories([
    extractItemsFromText(rawText),
    normalizeAiCategories([{ nome: 'Cardápio', itens: evidence.items || [] }])
  ]);
  let combinedText = rawText;
  let categories = domCategories;
  let audit = auditCategories(categories, combinedText);
  console.log(`[Hybrid Menu] Auditoria DOM: ${audit.score}, ${audit.itemCount} itens.`);

  if (!audit.approved && screenshots.length) {
    const ocr = await runLocalOcr(screenshots, { logger: () => {} });
    combinedText += `\n${ocr.text || ''}`;
    categories = mergeCategories([categories, extractItemsFromText(ocr.text)]);
    audit = auditCategories(categories, combinedText);
    console.log(`[Hybrid Menu] Auditoria após OCR local: ${audit.score}, ${audit.itemCount} itens.`);
  }

  if (!audit.approved) {
    try {
      const formatted = await formatWithCheapModel(combinedText, restaurant.name);
      categories = mergeCategories([categories, formatted]);
      audit = auditCategories(categories, combinedText);
      console.log(`[Hybrid Menu] Auditoria após formatter econômico: ${audit.score}, ${audit.itemCount} itens.`);
    } catch (formatterError) {
      console.warn(`[Hybrid Menu] Formatter econômico falhou: ${formatterError.message}`);
    }
  }

  if (audit.confidence !== 'low' && audit.itemCount >= 5) {
    if (dryRun) {
      console.log(`RESULT:${JSON.stringify({ success: true, dryRun: true, message: `Cardápio híbrido estruturável com ${audit.itemCount} itens.`, audit, preview: categories.slice(0, 6) })}`);
      return;
    }
    await persistMenu(supabase, restaurantId, categories, 'extension_hybrid_ocr', audit);
    console.log(`RESULT:${JSON.stringify({ success: true, message: `Cardápio híbrido salvo com ${audit.itemCount} itens.`, audit, fallbackUsed: false })}`);
    return;
  }

  process.exitCode = await runLegacyFallback(process.argv.slice(2));
}

main().catch(error => {
  console.error(`[Hybrid Menu] Erro fatal: ${error.stack || error.message}`);
  console.log(`RESULT:${JSON.stringify({ success: false, error: error.message })}`);
  process.exitCode = 1;
});
