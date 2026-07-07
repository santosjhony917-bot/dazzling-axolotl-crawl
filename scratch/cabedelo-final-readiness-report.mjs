import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'cabedelo-final-readiness-report', RUN_ID);
const READY_ID = 'ecac91e3-52c0-4780-9867-6b3b1d096089';

const STRICT_BLOCKERS = new Map([
  ['e6fc253f-7f28-47f8-891f-df98848adda0', ['galeria sem evidência visual forte']],
  ['ec6b2565-934c-4278-9a8a-63168eb819f2', ['galeria sem evidência visual forte']],
  ['3efd7101-b736-4135-9e5e-9787a854ec0e', ['galeria sem evidência visual forte']],
  ['8bae41e4-1365-4def-9857-34e4abdbf329', ['número vazio']],
  ['49423823-d994-4263-9597-cb829e208129', ['galeria sem evidência visual forte']],
  ['8322d0f6-8e08-4de7-a73f-d71c57f0291d', ['número vazio']],
  ['c23b0422-4e34-43be-b07c-855f9c9a4593', ['galeria sem evidência visual forte']],
  ['17c67464-7f14-4f6a-b07c-855f9c9a4593', ['galeria sem evidência visual forte']],
  ['297a6b03-242d-4d91-9f64-73e736972946', ['galeria sem evidência visual forte']],
  ['69139ad6-c662-4fd6-b67f-aefef25c5923', ['galeria sem evidência visual forte']],
  ['4fa980c0-13d2-415f-97a6-e31fd3141133', ['galeria sem evidência visual forte']],
  ['a84400f3-afea-406e-a1ec-93c1b6e8d34f', ['galeria sem evidência visual forte']],
  ['2ef9ccde-0e20-4108-a8ac-874108b3c16b', ['galeria sem evidência visual forte']],
  ['1653a7ff-cb75-4303-b780-0580642c5974', ['galeria sem evidência visual forte']],
  ['eeb4213a-a5a1-4286-a33f-b6fea80cb891', ['galeria sem evidência visual forte']],
  ['9aed5c42-1ab1-47f0-9010-788da722a399', ['galeria sem evidência visual forte']],
  ['2ed733a0-a4c7-4bb4-b280-21d7752c0409', ['galeria sem evidência visual forte']],
  ['a123251e-ae13-4a7a-8725-a54b3bdd2d66', ['número vazio', 'galeria sem evidência visual forte']],
]);

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
  return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function hasCanonicalOpeningHours(value) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return value && typeof value === 'object' && days.every((day) => (
    typeof value[day]?.isOpen === 'boolean' && Array.isArray(value[day]?.slots)
  ));
}

async function selectAll(queryFactory, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function selectInChunks(table, columns, column, values) {
  if (!values.length) return [];
  const rows = [];
  const chunkSize = 75;
  for (let index = 0; index < values.length; index += chunkSize) {
    const chunk = values.slice(index, index + chunkSize);
    rows.push(...await selectAll(() => supabase
      .from(table)
      .select(columns)
      .in(column, chunk)));
  }
  return rows;
}

function addReason(reasons, condition, reason) {
  if (condition) reasons.push(reason);
}

const env = readEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
  || env.VITE_SUPABASE_SERVICE_ROLE_KEY
  || env.SERVICE_ROLE_KEY
  || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error('Supabase URL/key ausentes.');

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const restaurants = await selectAll(() => supabase
  .from('restaurants')
  .select([
    'id',
    'name',
    'address',
    'number',
    'neighborhood',
    'city',
    'state',
    'cep',
    'opening_hours',
    'instagram',
    'social_networks',
    'followers_override',
    'phone',
    'whatsapp_url',
    'image_url',
    'cover_image_url',
    'menu_status',
    'is_deleted',
  ].join(','))
  .eq('city', 'Cabedelo')
  .eq('state', 'PB')
  .order('name'));

const active = restaurants.filter((row) => !row.is_deleted);
const ids = active.map((row) => row.id);

const gallery = await selectInChunks('restaurant_gallery', 'restaurant_id,id,image_url,caption,order_index', 'restaurant_id', ids);

const categories = await selectInChunks('menu_categories', 'id,restaurant_id,is_active', 'restaurant_id', ids);

const activeCategories = categories.filter((row) => row.is_active !== false);
const categoryIds = activeCategories.map((row) => row.id);

const items = await selectInChunks('menu_items', 'id,category_id,is_active', 'category_id', categoryIds);

const activeItems = items.filter((row) => row.is_active !== false);
const itemIds = activeItems.map((row) => row.id);

const optionGroups = await selectInChunks('menu_option_groups', 'id,menu_item_id', 'menu_item_id', itemIds);

const options = await selectInChunks('menu_item_options', 'id,menu_item_id', 'menu_item_id', itemIds);

const galleryCount = new Map();
for (const row of gallery) galleryCount.set(row.restaurant_id, (galleryCount.get(row.restaurant_id) || 0) + 1);

const categoriesByRestaurant = new Map();
for (const row of activeCategories) {
  if (!categoriesByRestaurant.has(row.restaurant_id)) categoriesByRestaurant.set(row.restaurant_id, []);
  categoriesByRestaurant.get(row.restaurant_id).push(row);
}

const categoryToRestaurant = new Map(activeCategories.map((row) => [row.id, row.restaurant_id]));
const itemCount = new Map();
const itemToRestaurant = new Map();
for (const row of activeItems) {
  const restaurantId = categoryToRestaurant.get(row.category_id);
  if (!restaurantId) continue;
  itemToRestaurant.set(row.id, restaurantId);
  itemCount.set(restaurantId, (itemCount.get(restaurantId) || 0) + 1);
}

const optionCount = new Map();
for (const row of optionGroups) {
  const restaurantId = itemToRestaurant.get(row.menu_item_id);
  if (restaurantId) optionCount.set(restaurantId, (optionCount.get(restaurantId) || 0) + 1);
}
for (const row of options) {
  const restaurantId = itemToRestaurant.get(row.menu_item_id);
  if (restaurantId) optionCount.set(restaurantId, (optionCount.get(restaurantId) || 0) + 1);
}

function hasFollowers(row) {
  if (row.followers_override !== null && row.followers_override !== undefined && row.followers_override !== '') {
    return Number.isFinite(Number(row.followers_override));
  }
  if (!Array.isArray(row.social_networks)) return false;
  return row.social_networks.some((entry) => (
    entry?.platform === 'instagram'
    && entry.followers !== null
    && entry.followers !== undefined
    && entry.followers !== ''
    && Number.isFinite(Number(entry.followers))
  ));
}

function baseReasons(row) {
  const reasons = [];
  const galleries = galleryCount.get(row.id) || 0;
  const menuItems = itemCount.get(row.id) || 0;
  const additions = optionCount.get(row.id) || 0;
  addReason(reasons, !clean(row.address), 'sem endereço');
  addReason(reasons, !clean(row.cep), 'sem CEP');
  addReason(reasons, !hasCanonicalOpeningHours(row.opening_hours), 'sem horários canônicos');
  addReason(reasons, !clean(row.instagram), 'sem Instagram');
  addReason(reasons, !hasFollowers(row), 'sem seguidores');
  addReason(reasons, !clean(row.phone) && !clean(row.whatsapp_url), 'sem telefone/WhatsApp');
  addReason(reasons, !clean(row.image_url), 'sem logo');
  addReason(reasons, !clean(row.cover_image_url), 'sem capa');
  addReason(reasons, galleries < 3, `galeria < 3 (${galleries})`);
  addReason(reasons, galleries > 8, `galeria > 8 (${galleries})`);
  addReason(reasons, menuItems === 0, 'sem cardápio estruturado');
  addReason(reasons, menuItems > 0 && row.menu_status !== 'found', `menu_status=${row.menu_status || 'nulo'}`);
  addReason(reasons, menuItems > 0 && additions === 0, 'sem adicionais estruturados');
  return reasons;
}

const ready = [];
const blocked = [];

for (const row of active) {
  const reasons = [...baseReasons(row), ...(STRICT_BLOCKERS.get(row.id) || [])];
  const uniqueReasons = [...new Set(reasons)];
  const record = {
    id: row.id,
    name: row.name,
    reasons: uniqueReasons,
    galleryCount: galleryCount.get(row.id) || 0,
    menuItemCount: itemCount.get(row.id) || 0,
    optionCount: optionCount.get(row.id) || 0,
  };
  if (row.id === READY_ID && uniqueReasons.length === 0) ready.push(record);
  else blocked.push(record);
}

const reasonCounts = {};
for (const record of blocked) {
  for (const reason of record.reasons) reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
}

const report = {
  runId: RUN_ID,
  generatedAt: new Date().toISOString(),
  scope: 'Cabedelo/PB ativos, is_deleted=false',
  total: active.length,
  readyCount: ready.length,
  blockedCount: blocked.length,
  ready,
  blocked,
  reasonCounts: Object.fromEntries(Object.entries(reasonCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
};

const blockedLines = blocked.map((row) => `- ${row.id} | ${row.name} | ${row.reasons.join('; ')}`);
const markdown = [
  '# Auditoria Final Cabedelo/PB',
  '',
  `- Run: ${RUN_ID}`,
  `- Escopo: ${report.scope}`,
  `- Total ativo: ${report.total}`,
  `- Prontos: ${report.readyCount}`,
  `- Bloqueados: ${report.blockedCount}`,
  '',
  '## Prontos',
  '',
  ...ready.map((row) => `- ${row.id} | ${row.name}`),
  '',
  '## Motivos De Bloqueio',
  '',
  ...Object.entries(report.reasonCounts).map(([reason, count]) => `- ${reason}: ${count}`),
  '',
  '## Bloqueados',
  '',
  ...blockedLines,
  '',
].join('\n');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'report.md'), markdown);

console.log(JSON.stringify({
  outDir: path.resolve(OUT_DIR),
  total: report.total,
  readyCount: report.readyCount,
  blockedCount: report.blockedCount,
  ready,
  reasonCounts: report.reasonCounts,
}, null, 2));
