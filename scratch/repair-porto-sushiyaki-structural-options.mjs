import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const PORTO_ID = '2ef9ccde-0e20-4108-a8ac-874108b3c16b';
const SUSHIYAKI_ID = '2ed733a0-a4c7-4bb4-b280-21d7752c0409';

const COMPLEMENTOS = [
  'Amendoin',
  'Confete',
  'Farinha Láctea',
  'Granola',
  'Leite Condensado',
  'Leite em Pó',
  'Paçoca',
];
const FRUTAS = ['Banana', 'Kiwi', 'Morango'];

function readEnv() {
  const env = { ...process.env };
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

function inferFruitMax(item) {
  const text = normalize(`${item.name} ${item.description || ''}`);
  if (/\b(acai|gelatto)\s+g\b/.test(text) || /\btres|3\s+op/.test(text)) return 3;
  if (/\b(acai|gelatto)\s+m\b/.test(text) || /\bduas|2\s+op/.test(text)) return 2;
  if (/\b(acai|gelatto)\s+p\b/.test(text) || /\buma|1\s+op/.test(text)) return 1;
  return null;
}

function includedOption(menuItemId, groupId, groupName, name, index, maxQuantity, source) {
  return {
    menu_item_id: menuItemId,
    group_id: groupId,
    external_id: null,
    group_name: groupName,
    name,
    description: null,
    price: null,
    price_delta: null,
    min_quantity: 0,
    max_quantity: maxQuantity,
    is_required: false,
    is_available: true,
    order_index: index,
    semantic_type: 'included_choice',
    price_behavior: 'included',
    search_label: null,
    search_aliases: null,
    is_searchable_variant: false,
    ai_confidence: 0.99,
    ai_reason: 'Valor real listado no modal público do MeuCarrinho; incluso no preço base.',
    raw_data: {
      source,
      extracted_from: 'meucarrinho_product_modal',
      price_behavior: 'included',
    },
  };
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

const { data: categories, error: categoryError } = await supabase
  .from('menu_categories')
  .select('id,restaurant_id,name')
  .in('restaurant_id', [PORTO_ID, SUSHIYAKI_ID]);
if (categoryError) throw categoryError;

const categoryIds = (categories || []).map((category) => category.id);
const { data: items, error: itemError } = await supabase
  .from('menu_items')
  .select('id,category_id,name,description,price,display_price,price_min,price_max,commercial_type,is_configurable,raw_data')
  .in('category_id', categoryIds)
  .order('order_index');
if (itemError) throw itemError;

const categoryById = new Map((categories || []).map((category) => [category.id, category]));
const portoItems = (items || []).filter((item) => {
  const category = categoryById.get(item.category_id);
  if (category?.restaurant_id !== PORTO_ID) return false;
  const categoryName = normalize(category.name);
  const itemName = normalize(item.name);
  return (categoryName.includes('acai') || categoryName.includes('gelatto'))
    && (itemName.startsWith('acai ') || itemName.startsWith('gelatto '));
});

const sushiyakiCandidateNotes = (items || [])
  .filter((item) => categoryById.get(item.category_id)?.restaurant_id === SUSHIYAKI_ID)
  .filter((item) => /observa|frito/i.test(`${item.name} ${item.description || ''}`))
  .map((item) => ({ id: item.id, name: item.name, description: item.description }));

const itemIds = portoItems.map((item) => item.id);
let deletedOptions = 0;
let deletedGroups = 0;
if (itemIds.length) {
  const { data: existingGroups, error: groupFetchError } = await supabase
    .from('menu_option_groups')
    .select('id')
    .in('menu_item_id', itemIds);
  if (groupFetchError) throw groupFetchError;
  const groupIds = (existingGroups || []).map((group) => group.id);
  const { data: existingOptions, error: optionFetchError } = await supabase
    .from('menu_item_options')
    .select('id')
    .in('menu_item_id', itemIds);
  if (optionFetchError) throw optionFetchError;
  deletedOptions = existingOptions?.length || 0;
  deletedGroups = groupIds.length;
  if (existingOptions?.length) {
    const { error } = await supabase.from('menu_item_options').delete().in('menu_item_id', itemIds);
    if (error) throw error;
  }
  if (groupIds.length) {
    const { error } = await supabase.from('menu_option_groups').delete().in('id', groupIds);
    if (error) throw error;
  }
}

let createdGroups = 0;
let createdOptions = 0;
const repairedItems = [];

for (const item of portoItems) {
  const fruitMax = inferFruitMax(item);
  if (!fruitMax) continue;
  const groupPayloads = [
    {
      menu_item_id: item.id,
      external_id: null,
      name: 'Complementos',
      min_quantity: 0,
      max_quantity: 7,
      is_required: false,
      order_index: 0,
      semantic_type: 'included_choice',
      price_behavior: 'included',
      ai_confidence: 0.99,
      ai_reason: 'Grupo real visto no modal do produto; seleção opcional inclusa.',
      raw_data: {
        source: 'meucarrinho_product_modal',
        text: 'Complementos (Selecione até 7 opções) Opcional',
      },
    },
    {
      menu_item_id: item.id,
      external_id: null,
      name: 'Frutas',
      min_quantity: 0,
      max_quantity: fruitMax,
      is_required: false,
      order_index: 1,
      semantic_type: 'included_choice',
      price_behavior: 'included',
      ai_confidence: 0.99,
      ai_reason: 'Grupo real visto no modal do produto; seleção opcional inclusa.',
      raw_data: {
        source: 'meucarrinho_product_modal',
        text: `Frutas (Selecione até ${fruitMax} opções) Opcional`,
      },
    },
  ];

  const { data: insertedGroups, error: insertGroupError } = await supabase
    .from('menu_option_groups')
    .insert(groupPayloads)
    .select('id,name,max_quantity');
  if (insertGroupError) throw insertGroupError;
  createdGroups += insertedGroups.length;
  const groupByName = new Map(insertedGroups.map((group) => [group.name, group]));
  const optionRows = [
    ...COMPLEMENTOS.map((name, index) => includedOption(
      item.id,
      groupByName.get('Complementos')?.id,
      'Complementos',
      name,
      index,
      7,
      'Complementos (Selecione até 7 opções) Opcional',
    )),
    ...FRUTAS.map((name, index) => includedOption(
      item.id,
      groupByName.get('Frutas')?.id,
      'Frutas',
      name,
      index,
      fruitMax,
      `Frutas (Selecione até ${fruitMax} opções) Opcional`,
    )),
  ];
  const { error: insertOptionError } = await supabase
    .from('menu_item_options')
    .insert(optionRows);
  if (insertOptionError) throw insertOptionError;
  createdOptions += optionRows.length;
  repairedItems.push({
    id: item.id,
    name: item.name,
    fruitMax,
    groups: 2,
    options: optionRows.length,
  });

  const maxDelta = 0;
  const basePrice = Number(item.display_price ?? item.price_min ?? item.price ?? 0) || null;
  const { error: updateItemError } = await supabase
    .from('menu_items')
    .update({
      is_configurable: true,
      commercial_type: 'configurable_item',
      price_type: 'fixed',
      price_max: basePrice == null ? item.price_max : Number((basePrice + maxDelta).toFixed(2)),
      price_source: 'meucarrinho.product.price+modal_included_choices',
      needs_review: false,
      import_notes: 'Reparo QA: opções inclusas Complementos/Frutas materializadas a partir do modal público MeuCarrinho.',
    })
    .eq('id', item.id);
  if (updateItemError) throw updateItemError;
}

const output = {
  porto: {
    restaurantId: PORTO_ID,
    candidateItems: portoItems.length,
    repairedItems: repairedItems.length,
    deletedGroups,
    deletedOptions,
    createdGroups,
    createdOptions,
    repairedItemsSample: repairedItems.slice(0, 20),
  },
  sushiyaki: {
    restaurantId: SUSHIYAKI_ID,
    candidateInstructionItems: sushiyakiCandidateNotes.length,
    materializedGroups: 0,
    materializedOptions: 0,
    reason: 'Fonte/modal mostram apenas campo Observações e instrução textual "se desejar frito"; não há opções vendáveis estruturadas para materializar sem inventar.',
    sample: sushiyakiCandidateNotes.slice(0, 10),
  },
};

fs.writeFileSync('scratch/porto-sushiyaki-structural-options-repair.json', JSON.stringify(output, null, 2), 'utf8');
console.log(JSON.stringify(output, null, 2));
