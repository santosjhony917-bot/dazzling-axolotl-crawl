import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const index = trimmed.indexOf('=');
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
);

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const parseLogs = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
};

const cleanCategoryLabel = (value) => {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '(sem categoria)';
  const cleaned = raw
    .replace(/[^\p{L}\p{N}\s.,:"'()&+/-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || '(categoria ilegível)';
};

const fetchAll = async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,city,state,address,neighborhood,phone,rating,reviews_count,menu_status,is_deleted,ai_validated,coleta_logs')
      .eq('city', 'Campina Grande')
      .eq('state', 'PB')
      .or('is_deleted.eq.false,is_deleted.is.null')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
};

const foodCategory = [
  'restaurant',
  'restaurante',
  'pizzaria',
  'pizza',
  'hamburg',
  'burger',
  'snack bar',
  'lanchonete',
  'fast food',
  'pastelaria',
  'esfiha',
  'sushi',
  'japanese',
  'chinese',
  'brazilian',
  'self service',
  'meal delivery',
  'delivery restaurant',
  'takeout',
  'bar',
  'pub',
  'petiscaria',
  'grill',
  'barbecue',
  'churrasc',
  'steak',
  'cafeteria',
  'coffee',
  'cafe',
  'bakery',
  'padaria',
  'panificadora',
  'confectionery',
  'doceria',
  'cake',
  'candy',
  'dessert',
  'ice cream',
  'sorveteria',
  'açaí',
  'acai',
  'juice',
  'food court',
  'buffet',
  'buffet restaurant',
  'hot dog',
  'tapioca',
  'crepe',
  'marmit',
  'salgado',
];

const foodName = [
  'restaurante',
  'pizzaria',
  'pizza',
  'hamburg',
  'burger',
  'lanche',
  'lanchonete',
  'pastel',
  'salgado',
  'coxinha',
  'esfiha',
  'esfiharia',
  'sushi',
  'temaki',
  'yakisoba',
  'marmit',
  'quentinha',
  'bar ',
  'bar do',
  'bar da',
  'espet',
  'churrasc',
  'galeto',
  'frango',
  'grill',
  'cafeteria',
  'cafe',
  'café',
  'padaria',
  'panificadora',
  'bolo',
  'bolos',
  'doces',
  'doceria',
  'confeitaria',
  'sorvete',
  'sorveteria',
  'açai',
  'açaí',
  'acai',
  'tapioca',
  'crepe',
  'hot dog',
  'hotdog',
  'caldo',
  'comida',
  'cozinha',
  'buffet',
  'delicias',
  'delícias',
  'gourmet',
];

const hardRemoveCategory = [
  'gas station',
  'posto',
  'hotel',
  'inn',
  'motel',
  'apartment',
  'condominium',
  'housing',
  'real estate',
  'school',
  'college',
  'university',
  'church',
  'religious',
  'pharmacy',
  'hospital',
  'clinic',
  'medical',
  'dentist',
  'gym',
  'beauty',
  'hair',
  'barber',
  'salon',
  'clothing',
  'shoe',
  'cell phone',
  'electronics',
  'auto',
  'mechanic',
  'tire',
  'car wash',
  'hardware',
  'building materials',
  'furniture',
  'supermarket',
  'market',
  'grocery',
  'convenience store',
  'wholesale',
  'distribution',
  'manufacturer',
  'warehouse',
  'shopping mall',
  'shopping center',
  'business center',
  'tourist attraction',
  'park',
  'plaza',
  'square',
  'event venue',
  'wedding venue',
  'party equipment',
  'banquet hall',
  'community center',
  'club',
  'public',
  'government',
];

const hardRemoveName = [
  'posto',
  'hotel',
  'pousada',
  'condominio',
  'condomínio',
  'edificio',
  'edifício',
  'residencial',
  'apartamento',
  'shopping',
  'mall',
  'centro de distribuicao',
  'centro de distribuição',
  'distribuidora',
  'atacadao',
  'atacadão',
  'supermercado',
  'mercado publico',
  'mercado público',
  'farmacia',
  'farmácia',
  'igreja',
  'escola',
  'colegio',
  'colégio',
  'universidade',
  'academia',
  'salao',
  'salão',
  'barbearia',
  'oficina',
  'lava jato',
  'posto de gasolina',
  'parque',
  'praca',
  'praça',
  'terminal',
  'rodoviaria',
  'rodoviária',
];

const reviewCategory = [
  'event planner',
  'caterer',
  'catering',
  'buffet',
  'food products',
  'food manufacturer',
  'food producer',
  'dairy',
  'butcher',
  'meat',
  'fish store',
  'beverage',
  'liquor',
  'water',
  'store',
  'loja',
  'kiosk',
  'kiosque',
];

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const includesAny = (text, terms) => terms.some((term) => {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`).test(text);
});
const includesPrefix = (text, prefixes) => prefixes.some((prefix) =>
  new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalize(prefix))}[a-z0-9]*`).test(text)
);

const foodPrefixes = [
  'hamburg',
  'churrasc',
  'cafeter',
  'panific',
  'confeit',
  'sorvet',
  'marmit',
  'salgad',
  'espet',
  'docer',
  'tapioc',
  'crep',
  'boler',
  'bolo',
  'cake',
  'pamonh',
  'delicatess',
];

const hardCategoryPrefixes = [
  'barbear',
  'apartament',
  'condomini',
  'residencial',
  'farmaci',
  'borrachar',
];

const streetLikeName = (name) =>
  /^(?:r\.\s|rua\b|av\.\s|avenida\b|travessa\b|tv\.\s|rod\.\s|rodovia\b|praca\b|praça\b|bairro\b)/.test(name);

const classify = (row) => {
  const category = normalize(row.category);
  const name = normalize(`${row.name || ''} ${row.google_maps_name || ''}`);
  const hasFood = includesAny(category, foodCategory)
    || includesPrefix(category, foodPrefixes)
    || includesAny(name, foodName)
    || includesPrefix(name, foodPrefixes);
  const isPermanentlyClosed = /permanentemente fechado|permanently closed/.test(`${category} ${name}`);
  const isTemporarilyClosed = /temporariamente fechado|temporarily closed/.test(`${category} ${name}`);
  const hardCategory = includesAny(category, hardRemoveCategory) || includesPrefix(category, hardCategoryPrefixes);
  const hardName = includesAny(name, hardRemoveName) || streetLikeName(name);
  const review = includesAny(category, reviewCategory);

  if (isPermanentlyClosed) return { action: 'remover', reason: 'fechado permanentemente no Google' };
  if (isTemporarilyClosed) return { action: 'revisar', reason: 'temporariamente fechado no Google' };
  if (hardCategory && !hasFood) return { action: 'remover', reason: 'categoria claramente nao alimenticia' };
  if (hardName && !hasFood) return { action: 'remover', reason: 'nome claramente nao alimenticio/mapa/publico' };
  if (!row.category && !hasFood) return { action: 'revisar', reason: 'sem categoria e sem sinal claro de comida no nome' };
  if (!hasFood && review) return { action: 'revisar', reason: 'categoria de produto/loja/evento pode ou nao ter cardapio' };
  if (!hasFood) return { action: 'revisar', reason: 'sem sinal forte de comida' };
  if (hardCategory || hardName || review) return { action: 'revisar', reason: 'tem sinal de comida, mas categoria/nome e misto' };
  return { action: 'manter', reason: 'sinal de estabelecimento de comida' };
};

const rows = await fetchAll();

const categoryCounts = new Map();
const actionCounts = new Map();
const reasonCounts = new Map();
const samplesByReason = new Map();

for (const row of rows) {
  const googleBase = parseLogs(row.coleta_logs).google_maps_base || {};
  const category = cleanCategoryLabel(row.category || googleBase.category);
  row.category = category.startsWith('(') ? null : category;
  categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

  const classification = classify(row);
  actionCounts.set(classification.action, (actionCounts.get(classification.action) || 0) + 1);
  reasonCounts.set(classification.reason, (reasonCounts.get(classification.reason) || 0) + 1);
  if (!samplesByReason.has(classification.reason)) samplesByReason.set(classification.reason, []);
  const samples = samplesByReason.get(classification.reason);
  if (samples.length < 20) {
    samples.push({
      id: row.id,
      name: row.name,
      category,
      rating: row.rating,
      reviews_count: row.reviews_count,
      action: classification.action,
    });
  }
}

const sortEntries = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

console.log(JSON.stringify({
  totalActiveCampinaLeads: rows.length,
  actionCounts: Object.fromEntries(sortEntries(actionCounts)),
  reasonCounts: Object.fromEntries(sortEntries(reasonCounts)),
  categories: sortEntries(categoryCounts).map(([category, count]) => ({ category, count })),
  suspiciousSamples: Object.fromEntries(
    [...samplesByReason.entries()]
      .filter(([reason]) => !reason.includes('sinal de estabelecimento de comida'))
      .map(([reason, samples]) => [reason, samples]),
  ),
}, null, 2));
