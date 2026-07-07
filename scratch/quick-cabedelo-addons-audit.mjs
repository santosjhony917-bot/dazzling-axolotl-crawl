import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function money(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function chunk(values, size = 100) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

function push(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

const operationalRe = /\b(ketchup|catchup|cat ?chup|talher(?:es)?|guardanapo(?:s)?|embalagem|sacola|descart[aá]vel(?:is|eis)?|cpf|troco|canudo|copo(?:s)? descart[aá]vel(?:is|eis)?|prato(?:s)? descart[aá]vel(?:is|eis)?|colher(?:es)?|garfo(?:s)?|faca(?:s)?|palito(?:s)?|hashi|adaptador|porta\s*shoyu|shoyu|nosoki)\b/i;
const instructionRe = /\b(escolha|selecione|selecionar|clique|click|turbine|turbinar|transforme|transformar|monte|montar|observa[cç][aã]o|observacoes|observações)\b/i;
const instructionOptionNameRe = /^(?:\s|\W)*(?:escolha|selecione|selecionar|clique|click|turbine|turbinar|transforme|transformar|monte|montar|observa[cç][aã]o|observacoes|observações)\b/i;
const realOptionNameRe = /[a-zA-ZÀ-ÿ0-9]{2,}/;
const optionArrayKeyRe = /^(options?|opcoes|opções|choices?|sabores?|flavors?|variations?|variacoes|variações|add_?ons?|adicionais|extras|complementos?|items?)$/i;
const noisyArrayKeyRe = /^(images?|fotos?|photos?|gallery|galeria|tags?|categories?|categorias?)$/i;

function rawDataHasRealChoices(rawData) {
  const root = parseJson(rawData);
  if (!root || typeof root !== 'object') return false;
  const seen = new Set();
  const stack = [{ value: root, key: '' }];

  while (stack.length) {
    const { value, key } = stack.pop();
    if (!value || typeof value !== 'object') continue;
    if (seen.has(value)) continue;
    seen.add(value);

    if (Array.isArray(value)) {
      if (value.length && optionArrayKeyRe.test(key) && !noisyArrayKeyRe.test(key)) {
        const realEntries = value.filter((entry) => {
          if (entry === null || entry === undefined) return false;
          if (typeof entry === 'string') return realOptionNameRe.test(entry) && !instructionRe.test(entry) && !operationalRe.test(entry);
          if (typeof entry !== 'object') return false;
          const name = entry.name ?? entry.title ?? entry.label ?? entry.description ?? entry.text ?? entry.nome;
          if (!realOptionNameRe.test(String(name ?? ''))) return false;
          if (instructionRe.test(String(name ?? '')) || operationalRe.test(String(name ?? ''))) return false;
          return true;
        });
        if (realEntries.length > 0) return true;
      }
      for (const entry of value) stack.push({ value: entry, key });
      continue;
    }

    for (const [childKey, childValue] of Object.entries(value)) {
      stack.push({ value: childValue, key: childKey });
    }
  }

  return false;
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
  .select('id,name,google_maps_name,city,state,menu_status,menu_status_reason')
  .eq('city', 'Cabedelo')
  .eq('state', 'PB')
  .order('name');
if (restaurantError) throw restaurantError;

const restaurantIds = (restaurants || []).map((restaurant) => restaurant.id);
const categories = [];
for (const ids of chunk(restaurantIds, 100)) {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('id,restaurant_id,name')
    .in('restaurant_id', ids);
  if (error) throw error;
  categories.push(...(data || []));
}

const categoryIds = categories.map((category) => category.id);
const items = [];
for (const ids of chunk(categoryIds, 100)) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id,category_id,name,description,price,display_price,price_min,price_max,is_configurable,commercial_type,raw_data')
    .in('category_id', ids);
  if (error) throw error;
  items.push(...(data || []));
}

const itemIds = items.map((item) => item.id);
const groups = [];
const options = [];
for (const ids of chunk(itemIds, 100)) {
  const { data: groupData, error: groupError } = await supabase
    .from('menu_option_groups')
    .select('id,menu_item_id,name,min_quantity,max_quantity,is_required,price_behavior,semantic_type')
    .in('menu_item_id', ids);
  if (groupError) throw groupError;
  groups.push(...(groupData || []));

  const { data: optionData, error: optionError } = await supabase
    .from('menu_item_options')
    .select('id,menu_item_id,group_id,group_name,name,description,price,price_delta,price_behavior,semantic_type')
    .in('menu_item_id', ids);
  if (optionError) throw optionError;
  options.push(...(optionData || []));
}

const categoriesByRestaurant = new Map();
for (const category of categories) push(categoriesByRestaurant, category.restaurant_id, category);

const restaurantIdByCategory = new Map(categories.map((category) => [category.id, category.restaurant_id]));
const itemsByRestaurant = new Map();
for (const item of items) push(itemsByRestaurant, restaurantIdByCategory.get(item.category_id), item);

const itemById = new Map(items.map((item) => [item.id, item]));
const optionsByItem = new Map();
for (const option of options) push(optionsByItem, option.menu_item_id, option);

const groupsByItem = new Map();
for (const group of groups) push(groupsByItem, group.menu_item_id, group);

const imported = restaurants
  .map((restaurant) => {
    const ownItems = itemsByRestaurant.get(restaurant.id) || [];
    const ownOptions = ownItems.flatMap((item) => optionsByItem.get(item.id) || []);
    const ownGroups = ownItems.flatMap((item) => groupsByItem.get(item.id) || []);
    return { restaurant, items: ownItems, options: ownOptions, groups: ownGroups };
  })
  .filter((entry) => entry.items.length > 0);

const issueRows = [];
const cleanIds = [];

for (const entry of imported) {
  const issues = [];

  const badDeltaOptions = entry.options.filter((option) => {
    const item = itemById.get(option.menu_item_id);
    const base = money(item?.display_price ?? item?.price_min ?? item?.price);
    const delta = money(option.price_delta);
    const absolute = money(option.price);
    if ((option.price_behavior === 'price_delta' || option.price_behavior === 'addon') && absolute !== null) return true;
    if (delta !== null && base !== null && Math.abs(delta - base) <= 0.01) return true;
    if (delta !== null && base !== null && base >= 20 && delta >= base * 1.8) return true;
    return false;
  });
  if (badDeltaOptions.length) {
    issues.push({
      code: 'price_delta_suspeito_preco_cheio',
      count: badDeltaOptions.length,
      samples: badDeltaOptions.slice(0, 5).map((option) => {
        const item = itemById.get(option.menu_item_id);
        return `${item?.name || '?'} > ${option.group_name || ''} > ${option.name || ''} (base=${money(item?.display_price ?? item?.price_min ?? item?.price)}, delta=${option.price_delta}, price=${option.price})`;
      }),
    });
  }

  const operationalOptions = entry.options.filter((option) =>
    operationalRe.test(`${option.group_name || ''} ${option.name || ''} ${option.description || ''}`),
  );
  if (operationalOptions.length) {
    issues.push({
      code: 'opcao_operacional',
      count: operationalOptions.length,
      samples: operationalOptions.slice(0, 5).map((option) => `${option.group_name || ''} > ${option.name || ''}`),
    });
  }

  const instructionOptions = entry.options.filter((option) =>
    instructionOptionNameRe.test(`${option.name || ''}`),
  );
  if (instructionOptions.length) {
    issues.push({
      code: 'titulo_instrucao_como_opcao',
      count: instructionOptions.length,
      samples: instructionOptions.slice(0, 5).map((option) => `${option.group_name || ''} > ${option.name || ''}`),
    });
  }

  const configurableWithoutOptions = entry.items.filter((item) => {
    const optionCount = (optionsByItem.get(item.id) || []).length;
    if (optionCount > 0) return false;
    const markedConfigurable = item.is_configurable === true || ['configurable_item', 'simple_with_addons', 'combo'].includes(String(item.commercial_type || ''));
    return markedConfigurable && rawDataHasRealChoices(item.raw_data);
  });
  if (configurableWithoutOptions.length) {
    issues.push({
      code: 'configuravel_sem_opcoes_com_raw_data',
      count: configurableWithoutOptions.length,
      samples: configurableWithoutOptions.slice(0, 5).map((item) => item.name),
    });
  }

  if (issues.length) {
    issueRows.push({
      id: entry.restaurant.id,
      name: entry.restaurant.google_maps_name || entry.restaurant.name,
      items: entry.items.length,
      groups: entry.groups.length,
      options: entry.options.length,
      issues,
    });
  } else {
    cleanIds.push({
      id: entry.restaurant.id,
      name: entry.restaurant.google_maps_name || entry.restaurant.name,
      items: entry.items.length,
      groups: entry.groups.length,
      options: entry.options.length,
    });
  }
}

console.log(JSON.stringify({
  auditedAt: new Date().toISOString(),
  scope: 'Cabedelo/PB restaurantes com menu_items > 0',
  counts: {
    cabedeloRestaurants: restaurants.length,
    importedMenusAudited: imported.length,
    categories: categories.length,
    items: items.length,
    groups: groups.length,
    options: options.length,
    withProblems: issueRows.length,
    clean: cleanIds.length,
  },
  problems: issueRows,
  cleanIds,
}, null, 2));
