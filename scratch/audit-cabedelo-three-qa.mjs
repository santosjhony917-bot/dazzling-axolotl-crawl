import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const IDS = [
  '8322d0f6-8e08-4de7-a73f-d71c57f0291d',
  '8bae41e4-1365-4def-9857-34e4abdbf329',
  'ecac91e3-52c0-4780-9867-6b3b1d096089',
];
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'cabedelo-three-qa', RUN_ID);
fs.mkdirSync(OUT_DIR, { recursive: true });

function readEnv() {
  const env = { ...process.env };
  if (!fs.existsSync('.env')) return env;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
function hasCanonicalOpeningHours(value) {
  const parsed = parseJson(value, value);
  return parsed
    && typeof parsed === 'object'
    && DAY_ORDER.every((key) => typeof parsed[key]?.isOpen === 'boolean' && Array.isArray(parsed[key]?.slots));
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const OPERATIONAL_RE = /\b(ketchup|catchup|talher|talheres|guardanapo|descartavel|descartaveis|sacola|embalagem|cpf|troco|canudo|colher|garfo|faca|palito|copo descartavel|prato descartavel)\b/i;
const PLACEHOLDER_ITEM_RE = /\b(click|clique|escolha|selecione|monte|montar)\b.{0,80}\b(sabor|sabores|opcao|opcoes)\b/i;
const PLACEHOLDER_OPTION_RE = /\b(sabor|opcao|item|produto)\s+(nao|não)\s+especificad[oa]|\bnao\s+especificad[oa]\b|\bnão\s+especificad[oa]\b/i;

function groupLooksLikeFlavor(name) {
  return /\b(sabor|sabores|escolha.*sabor|pizza)\b/i.test(normalize(name));
}

function optionPriceDelta(option) {
  const delta = money(option.price_delta);
  if (delta !== null) return delta;
  return money(option.price);
}

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const { data: restaurants, error: restaurantError } = await supabase
  .from('restaurants')
  .select('id,name,address,number,neighborhood,city,state,cep,phone,instagram,followers_override,opening_hours,image_url,cover_image_url,menu_status,menu_status_reason,ai_validated,other_url,coleta_logs')
  .in('id', IDS)
  .order('name');
if (restaurantError) throw restaurantError;

const { data: categories, error: categoriesError } = await supabase
  .from('menu_categories')
  .select('*')
  .in('restaurant_id', IDS)
  .order('order_index');
if (categoriesError) throw categoriesError;
const categoryIds = (categories || []).map((category) => category.id);

const { data: items, error: itemsError } = categoryIds.length
  ? await supabase.from('menu_items').select('*').in('category_id', categoryIds).order('order_index')
  : { data: [], error: null };
if (itemsError) throw itemsError;
const itemIds = (items || []).map((item) => item.id);

const { data: options, error: optionsError } = itemIds.length
  ? await supabase.from('menu_item_options').select('*').in('menu_item_id', itemIds).order('order_index')
  : { data: [], error: null };
if (optionsError) throw optionsError;

const { data: gallery, error: galleryError } = await supabase
  .from('restaurant_gallery')
  .select('id,restaurant_id,image_url,caption,order_index')
  .in('restaurant_id', IDS)
  .order('order_index');
if (galleryError) throw galleryError;

const categoriesByRestaurant = new Map();
for (const category of categories || []) {
  if (!categoriesByRestaurant.has(category.restaurant_id)) categoriesByRestaurant.set(category.restaurant_id, []);
  categoriesByRestaurant.get(category.restaurant_id).push(category);
}
const itemsByCategory = new Map();
for (const item of items || []) {
  if (!itemsByCategory.has(item.category_id)) itemsByCategory.set(item.category_id, []);
  itemsByCategory.get(item.category_id).push(item);
}
const optionsByItem = new Map();
for (const option of options || []) {
  if (!optionsByItem.has(option.menu_item_id)) optionsByItem.set(option.menu_item_id, []);
  optionsByItem.get(option.menu_item_id).push(option);
}
const galleryByRestaurant = new Map();
for (const image of gallery || []) {
  if (!galleryByRestaurant.has(image.restaurant_id)) galleryByRestaurant.set(image.restaurant_id, []);
  galleryByRestaurant.get(image.restaurant_id).push(image);
}

const audits = [];
for (const restaurant of restaurants || []) {
  const issues = [];
  const rowCategories = categoriesByRestaurant.get(restaurant.id) || [];
  const rowGallery = galleryByRestaurant.get(restaurant.id) || [];
  const logs = parseJson(restaurant.coleta_logs);

  if (restaurant.city !== 'Cabedelo') issues.push({ severity: 'red', code: 'cidade_incorreta', value: restaurant.city });
  if (restaurant.state !== 'PB') issues.push({ severity: 'red', code: 'estado_incorreto', value: restaurant.state });
  if (/\s-\s/.test(clean(restaurant.address))) issues.push({ severity: 'red', code: 'logradouro_com_bairro_embutido', value: restaurant.address });
  if (!clean(restaurant.neighborhood)) issues.push({ severity: 'yellow', code: 'bairro_vazio' });
  if (!hasCanonicalOpeningHours(restaurant.opening_hours)) issues.push({ severity: 'red', code: 'horario_nao_canonico' });
  if (!clean(restaurant.image_url)) issues.push({ severity: 'red', code: 'sem_logo' });
  if (!clean(restaurant.cover_image_url)) issues.push({ severity: 'red', code: 'sem_capa' });
  if (rowGallery.length < 3) issues.push({ severity: 'red', code: 'galeria_menor_que_3', count: rowGallery.length });

  let itemCount = 0;
  let optionCount = 0;
  for (const category of rowCategories) {
    for (const item of itemsByCategory.get(category.id) || []) {
      itemCount += 1;
      const itemName = clean(item.name);
      const itemPrice = money(item.price ?? item.display_price ?? item.price_min);
      if (PLACEHOLDER_ITEM_RE.test(itemName)) issues.push({ severity: 'red', code: 'item_placeholder_interface', item: itemName });
      if (OPERATIONAL_RE.test(itemName)) issues.push({ severity: 'red', code: 'item_operacional', item: itemName });
      const rowOptions = optionsByItem.get(item.id) || [];
      optionCount += rowOptions.length;
      for (const option of rowOptions) {
        const optionName = clean(option.name);
        const groupName = clean(option.group_name);
        const delta = optionPriceDelta(option);
        if (OPERATIONAL_RE.test(optionName) || OPERATIONAL_RE.test(groupName)) {
          issues.push({ severity: 'red', code: 'opcao_operacional', item: itemName, group: groupName, option: optionName });
        }
        if (PLACEHOLDER_OPTION_RE.test(optionName) || PLACEHOLDER_OPTION_RE.test(groupName)) {
          issues.push({ severity: 'red', code: 'opcao_placeholder', item: itemName, group: groupName, option: optionName });
        }
        if (itemPrice !== null && itemPrice >= 20 && delta !== null && delta > 0 && groupLooksLikeFlavor(groupName) && delta >= itemPrice * 0.45) {
          issues.push({
            severity: 'red',
            code: 'delta_sabor_parece_preco_cheio',
            item: itemName,
            itemPrice,
            group: groupName,
            option: optionName,
            delta,
          });
        }
      }
    }
  }

  if (!itemCount) issues.push({ severity: 'red', code: 'sem_itens_cardapio' });
  const redCount = issues.filter((issue) => issue.severity === 'red').length;
  audits.push({
    id: restaurant.id,
    name: restaurant.name,
    status: redCount ? 'fail' : 'pass',
    redCount,
    issueCount: issues.length,
    itemCount,
    optionCount,
    galleryCount: rowGallery.length,
    aiValidated: restaurant.ai_validated,
    menuStatus: restaurant.menu_status,
    source: {
      menu: restaurant.other_url,
      instagram: restaurant.instagram,
      googleRepair: logs.canonical_address_hours_repair_v1 || null,
      bioHours: logs.instagram_bio_hours_v1 || null,
      media: logs.apify_instagram_media_enrichment || null,
    },
    fields: {
      address: restaurant.address,
      number: restaurant.number,
      neighborhood: restaurant.neighborhood,
      city: restaurant.city,
      state: restaurant.state,
      phone: restaurant.phone,
      followers: restaurant.followers_override,
    },
    issues,
  });
}

const summary = {
  runId: RUN_ID,
  outDir: OUT_DIR,
  restaurants: audits.length,
  passed: audits.filter((audit) => audit.status === 'pass').length,
  failed: audits.filter((audit) => audit.status !== 'pass').length,
  audits,
};

fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
