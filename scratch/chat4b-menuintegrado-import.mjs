import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const TARGET = {
  id: 'f598d9b8-6875-4bca-92c3-a7675f4775ac',
  name: 'Pizzaria ta no ponto',
  sourceUrl: 'https://www.pizzariatanoponto.com.br/',
  expectedPhone: '(83) 99608-4407',
  expectedCity: 'Cabedelo',
  state: 'PB',
};

const APPLY = process.argv.includes('--apply');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'chat4b-cabedelo-site-pdf', RUN_ID, 'pizzaria-ta-no-ponto');
fs.mkdirSync(OUT_DIR, { recursive: true });

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function readEnv() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}

function htmlDecode(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function money(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    return Number(value.toFixed(2));
  }
  let text = String(value).replace(/\s/g, '').replace(/^R\$/i, '');
  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.');
  }
  const number = Number(text);
  if (!Number.isFinite(number) || number < 0) return null;
  return Number(number.toFixed(2));
}

function parseMoneyFromText(value) {
  const match = String(value || '').match(/(\d{1,4}(?:[.,]\d{2}))/);
  return match ? money(match[1]) : null;
}

function isOperational(value) {
  return /\b(ketchup|catchup|talher|talheres|guardanapo|descartavel|descartaveis|embalagem|sacola|cpf|troco|canudo|copos?|pratos?)\b/i.test(clean(value));
}

function isInstructionGroup(value) {
  return /\b(observa[cç][aã]o|clique|turbine|transforme|monte)\b/i.test(clean(value));
}

function semanticFor(groupName, optionName) {
  const text = normalize(`${groupName} ${optionName}`);
  if (/sabor|sabores/.test(text)) return 'flavor';
  if (/borda|adicional|adicionais|extra|recheio|catupiry|cheddar|cream cheese/.test(text)) return 'addon';
  return 'required_choice';
}

function optionDelta(rawPrice, baseFromOptions, optionBase) {
  const price = money(rawPrice) ?? 0;
  const delta = baseFromOptions ? price - optionBase : price;
  return Number(Math.max(0, delta).toFixed(2));
}

function normalizeCategories(rawCategories) {
  const categories = [];
  const deltaAudit = [];

  for (const [categoryIndex, rawCategory] of rawCategories.entries()) {
    const categoryName = clean(rawCategory.name || 'Cardapio');
    if (!categoryName || isOperational(categoryName)) continue;
    const items = [];

    for (const [productIndex, product] of (rawCategory.products || []).entries()) {
      if (product.inStock === false) continue;
      const productName = clean(product.name);
      if (!productName || isOperational(productName)) continue;

      const directPrice = money(product.price);
      const textPrice = parseMoneyFromText(product.textPrice);
      const requiredVariationItems = (product.variations || [])
        .filter((variation) => Number(variation.min || 0) > 0 && !isInstructionGroup(variation.name))
        .flatMap((variation) => (variation.items || []).filter((item) => item.inStock !== false));
      const requiredPrices = requiredVariationItems
        .map((item) => money(item.price))
        .filter((price) => price != null && price > 0);
      const minRequiredPrice = requiredPrices.length ? Math.min(...requiredPrices) : null;
      const baseFromOptions = (directPrice == null || directPrice <= 0) && minRequiredPrice != null;
      const basePrice = baseFromOptions
        ? minRequiredPrice
        : directPrice != null && directPrice > 0
          ? directPrice
          : textPrice;

      const options = [];
      for (const variation of product.variations || []) {
        const groupName = clean(variation.name || 'Opcoes');
        if (!groupName || isOperational(groupName) || isInstructionGroup(groupName)) continue;
        const min = Math.max(0, Number(variation.min || 0));
        const maxRaw = Number(variation.max || 0);
        const max = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : null;
        const isRequired = min > 0;

        for (const [optionIndex, option] of (variation.items || []).entries()) {
          if (option.inStock === false) continue;
          const name = clean(option.name);
          if (!name || isOperational(`${groupName} ${name}`)) continue;
          const semantic = semanticFor(groupName, name);
          const delta = optionDelta(option.price, baseFromOptions && isRequired, basePrice || 0);
          if (!baseFromOptions && (semantic === 'flavor' || semantic === 'addon') && basePrice && delta >= basePrice * 0.8) {
            deltaAudit.push({ product: productName, basePrice, groupName, option: name, rawPrice: money(option.price), delta });
          }
          options.push({
            external_id: String(option.uuid || option.id || ''),
            group_name: groupName,
            name,
            description: clean(option.description) || null,
            image_url: option.coverImageUrl || null,
            price: null,
            price_delta: delta,
            min_quantity: min,
            max_quantity: max,
            is_required: isRequired,
            is_available: true,
            order_index: Number(option.position ?? optionIndex),
            semantic_type: semantic,
            price_behavior: delta > 0 ? 'price_delta' : 'included',
            is_searchable_variant: semantic === 'flavor',
            search_label: semantic === 'flavor' ? `${productName} ${name}` : null,
            raw_data: {
              menuintegrado_item_id: option.id ?? null,
              menuintegrado_variation_id: variation.id ?? null,
              source_price: money(option.price),
              base_from_options: baseFromOptions,
            },
          });
        }
      }

      const groupMaxDeltas = new Map();
      for (const option of options) {
        const current = groupMaxDeltas.get(option.group_name) || [];
        current.push(Number(option.price_delta || 0));
        groupMaxDeltas.set(option.group_name, current);
      }
      let maxDelta = 0;
      for (const [groupName, deltas] of groupMaxDeltas.entries()) {
        const sourceVariation = (product.variations || []).find((variation) => clean(variation.name) === groupName);
        const maxChoices = Math.max(1, Number(sourceVariation?.max || 1));
        maxDelta += deltas.sort((a, b) => b - a).slice(0, maxChoices).reduce((sum, value) => sum + value, 0);
      }

      items.push({
        external_id: String(product.id || ''),
        name: productName,
        description: clean(product.description) || null,
        image_url: product.coverImageUrl || null,
        price: basePrice,
        display_price: basePrice,
        price_min: basePrice,
        price_max: basePrice != null ? Number((basePrice + maxDelta).toFixed(2)) : null,
        price_type: basePrice != null ? (baseFromOptions ? 'starting_at' : 'fixed') : 'unknown',
        price_source: baseFromOptions ? 'menuintegrado.variation_min_price' : 'menuintegrado.product.price',
        commercial_kind: options.length ? 'configurable_item' : 'simple_item',
        options,
        option_groups: [],
        source_url: TARGET.sourceUrl,
        raw_data: product,
        extraction_confidence: 0.98,
        needs_review: basePrice == null,
        order_index: Number(product.position ?? productIndex),
      });
    }

    if (items.length) {
      categories.push({
        external_id: String(rawCategory.uuid || rawCategory.id || ''),
        name: categoryName,
        order_index: Number(rawCategory.position ?? categoryIndex),
        items,
      });
    }
  }

  return { categories, deltaAudit };
}

async function existingMenuCounts(supabase, restaurantId) {
  const categoriesResult = await supabase
    .from('menu_categories')
    .select('id', { count: 'exact' })
    .eq('restaurant_id', restaurantId);
  if (categoriesResult.error) throw categoriesResult.error;
  const categoryIds = (categoriesResult.data || []).map((category) => category.id);
  let itemCount = 0;
  let optionCount = 0;
  if (categoryIds.length) {
    const itemsResult = await supabase
      .from('menu_items')
      .select('id', { count: 'exact' })
      .in('category_id', categoryIds);
    if (itemsResult.error) throw itemsResult.error;
    itemCount = itemsResult.count || 0;
    const itemIds = (itemsResult.data || []).map((item) => item.id);
    if (itemIds.length) {
      const optionsResult = await supabase
        .from('menu_item_options')
        .select('id', { count: 'exact' })
        .in('menu_item_id', itemIds);
      if (optionsResult.error) throw optionsResult.error;
      optionCount = optionsResult.count || 0;
    }
  }
  return { categoryCount: categoriesResult.count || 0, itemCount, optionCount };
}

function runImporter(evidencePath, dryRun) {
  return new Promise((resolve) => {
    const childArgs = ['scratch/hybrid_menu_extractor_v2.cjs', '--id', TARGET.id, '--evidence-file', evidencePath];
    if (dryRun) childArgs.push('--dry-run');
    const child = spawn(process.execPath, childArgs, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      const resultLine = stdout.split(/\r?\n/).find((line) => line.startsWith('RESULT:'));
      let result = null;
      if (resultLine) {
        try {
          result = JSON.parse(resultLine.slice('RESULT:'.length));
        } catch (error) {
          result = { success: false, error: error.message };
        }
      }
      resolve({ code, result, stdoutTail: stdout.slice(-5000), stderrTail: stderr.slice(-5000) });
    });
  });
}

async function main() {
  const env = readEnv();
  const supabase = createClient(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );

  const before = await existingMenuCounts(supabase, TARGET.id);
  if (before.itemCount > 0) {
    const skipped = { success: true, skipped: true, reason: 'existing_menu_present', before, outDir: OUT_DIR };
    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(skipped, null, 2), 'utf8');
    console.log(JSON.stringify(skipped, null, 2));
    return;
  }

  const htmlResponse = await fetch(TARGET.sourceUrl);
  const html = await htmlResponse.text();
  fs.writeFileSync(path.join(OUT_DIR, 'source.html'), html, 'utf8');
  const categoriesUrl = html.match(/data-categories-url="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
  const menuRaw = html.match(/data-menu="([\s\S]*?)"\s+data/)?.[1] || html.match(/data-menu="([\s\S]*?)"/)?.[1] || '';
  if (!categoriesUrl) throw new Error('Menu Integrado sem data-categories-url.');

  const menuIdentity = menuRaw ? JSON.parse(htmlDecode(menuRaw)) : {};
  const identityText = normalize(`${menuIdentity.name} ${menuIdentity.address} ${menuIdentity.phone} ${menuIdentity.city}`);
  const identity = {
    confirmed: normalize(menuIdentity.name).includes('pizzaria ta no ponto')
      && identityText.includes(normalize(TARGET.expectedCity))
      && clean(menuIdentity.phone) === TARGET.expectedPhone,
    sourceName: menuIdentity.name || null,
    sourceAddress: menuIdentity.address || null,
    sourcePhone: menuIdentity.phone || null,
    sourceCity: menuIdentity.city || null,
  };
  if (!identity.confirmed) throw new Error(`Identidade da fonte nao confirmada: ${JSON.stringify(identity)}`);

  const response = await fetch(new URL(categoriesUrl, TARGET.sourceUrl), {
    headers: {
      accept: 'application/json, text/javascript, */*; q=0.01',
      'x-requested-with': 'XMLHttpRequest',
      referer: TARGET.sourceUrl,
    },
  });
  const rawCategories = await response.json();
  fs.writeFileSync(path.join(OUT_DIR, 'raw-menuintegrado-categories.json'), JSON.stringify(rawCategories, null, 2), 'utf8');

  const { categories, deltaAudit } = normalizeCategories(rawCategories);
  const itemCount = categories.flatMap((category) => category.items).length;
  const optionCount = categories.flatMap((category) => category.items).flatMap((item) => item.options || []).length;
  const evidence = {
    success: categories.length > 0,
    sourceUrl: TARGET.sourceUrl,
    finalUrl: TARGET.sourceUrl,
    platform: 'menuintegrado_native_api',
    extractionLevel: 0,
    confidence: 0.98,
    categories,
    visualVerification: {
      status: 'menuintegrado_internal_categories_endpoint',
      endpoint: new URL(categoriesUrl, TARGET.sourceUrl).href,
    },
    structuredProbe: {
      source: 'menuintegrado_internal_categories_endpoint',
      rawSummary: { categoryCount: categories.length, itemCount, optionCount },
      sourceIdentity: identity,
      priceDeltaAudit: {
        fullPriceDeltaAnomalyCount: deltaAudit.length,
        anomalies: deltaAudit.slice(0, 20),
      },
    },
    restaurant: {
      id: TARGET.id,
      name: TARGET.name,
      address: menuIdentity.address || null,
      city: menuIdentity.city || TARGET.expectedCity,
      state: TARGET.state,
      phone: menuIdentity.phone || TARGET.expectedPhone,
      latitude: menuIdentity.latitude ?? null,
      longitude: menuIdentity.longitude ?? null,
      image_url: menuIdentity.logo?.large || menuIdentity.logo?.small || null,
    },
  };

  const evidencePath = path.join(OUT_DIR, 'menu-evidence.json');
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');

  const dryRun = await runImporter(evidencePath, true);
  fs.writeFileSync(path.join(OUT_DIR, 'dry-run.json'), JSON.stringify(dryRun, null, 2), 'utf8');
  const approved = dryRun.result?.success === true
    && dryRun.result?.audit?.approved === true
    && deltaAudit.length === 0;

  let commit = null;
  if (APPLY && approved) {
    commit = await runImporter(evidencePath, false);
    fs.writeFileSync(path.join(OUT_DIR, 'commit.json'), JSON.stringify(commit, null, 2), 'utf8');
  }

  const after = await existingMenuCounts(supabase, TARGET.id);
  const summary = {
    success: true,
    outDir: OUT_DIR,
    apply: APPLY,
    identity,
    rawSummary: { categoryCount: categories.length, itemCount, optionCount },
    priceDeltaAudit: { fullPriceDeltaAnomalyCount: deltaAudit.length, anomalies: deltaAudit.slice(0, 20) },
    dryRun: {
      success: dryRun.result?.success === true,
      approved: dryRun.result?.audit?.approved === true,
      audit: dryRun.result?.audit || null,
    },
    committed: commit?.result?.success === true || false,
    before,
    after,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
