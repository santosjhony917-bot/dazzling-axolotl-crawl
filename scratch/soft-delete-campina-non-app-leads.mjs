import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

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

const cleanCategoryLabel = (value) => {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (/^["']/.test(raw) || raw.length > 90) return '';
  return raw
    .replace(/[^\p{L}\p{N}\s.,:"'()&+/-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseJson = (value) => {
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

const hasTerm = (text, terms) => terms.some((term) => {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;
  return new RegExp(`(^|[^a-z0-9])${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text);
});

const hasPrefix = (text, prefixes) => prefixes.some((prefix) =>
  new RegExp(`(^|[^a-z0-9])${normalize(prefix).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z0-9]*`).test(text)
);

const fetchAll = async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,city,state,address,rating,reviews_count,menu_status,is_deleted,is_published,ai_validated,location_issue_reason,menu_status_reason,coleta_logs,ai_log')
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

const hardNonFoodCategories = [
  'posto de combustivel',
  'gas station',
  'hotel',
  'pousada',
  'inn',
  'motel',
  'apartamentos',
  'apartment',
  'complexo de apartamentos',
  'complexo residencial',
  'complexo de condominio',
  'residencial',
  'shopping center',
  'centro comercial',
  'business center',
  'supermercado',
  'atacadista',
  'mercado',
  'loja de cosmetico',
  'loja de eletronicos',
  'loja de materiais de construcao',
  'barbearia',
  'salao de beleza',
  'salao de sobrancelhas',
  'borracharia',
  'oficina',
  'farmacia',
  'clinica',
  'hospital',
  'igreja',
  'instituicao educacional',
  'escola',
  'universidade',
  'parque',
  'parque estadual',
  'praca',
  'ponto de onibus',
  'quadra',
  'campo de futebol',
  'clube esportivo',
  'piscina',
  'deposito',
  'fabrica',
  'escritorio da empresa',
  'distribuicao',
  'desenvolvimento de moradias',
];

const hardNonFoodNames = [
  'posto',
  'hotel',
  'pousada',
  'atacadao',
  'supermercado',
  'mercado publico',
  'shopping',
  'mall',
  'parque',
  'praca',
  'rodoviaria',
  'bairro',
  'residencial',
  'condominio',
  'edificio',
  'centro de distribuicao',
  'distribuidora',
  'terminal',
  'barbearia',
  'barbershop',
  'salao',
  'farmacia',
  'igreja',
  'oficina',
  'lava jato',
];

const userExcludedCategoryTerms = [
  'padaria',
  'panificadora',
  'bakery',
  'acougue',
  'acougue gourmet',
  'atacadista de carnes',
  'butcher',
  'peixaria',
  'mercado de peixes',
  'mercado de frutos do mar',
  'loja de frutos do mar',
  'atacadista de frutos do mar',
  'loja de conveniencia',
  'convenience store',
  'servico de catering',
  'fornecedor de alimentos e bebidas para catering',
  'catering',
  'buffet',
  'buffet infantil',
  'buffet de casamento',
  'buffet de doces e sobremesas',
  'local para eventos',
  'local para casamentos',
  'salao de festas',
  'salao de eventos',
  'salao de baile',
  'empresa de organizacao de eventos',
  'organizacao de eventos',
  'servicos para festas infantis',
  'banquet hall',
  'event venue',
  'wedding venue',
  'loja de bolos',
  'cake shop',
];

const userExcludedNameTerms = [
  'padaria',
  'panificadora',
  'acougue',
  'peixaria',
  'loja de conveniencia',
  'conveniencia',
  'buffet',
  'catering',
  'loja de bolos',
  'boleria',
];

const categoryIndicatesCakeShop = (category, name) =>
  hasTerm(category, ['loja', 'store'])
  && (hasTerm(category, ['bolo', 'bolos', 'cake', 'cakes']) || hasTerm(name, ['cake', 'cakes', 'bolos']));

const foodCategoryTerms = [
  'restaurante',
  'lanchonete',
  'pizzaria',
  'pizza',
  'hamburgueria',
  'hamburguer',
  'hamburguer',
  'bar',
  'petiscaria',
  'churrascaria',
  'cafe',
  'cafeteria',
  'doceria',
  'confeitaria',
  'sorveteria',
  'loja de acai',
  'pastelaria',
  'sushi',
  'japones',
  'asiatico',
  'self-service',
  'marmitaria',
  'quentinha',
  'cachorro-quente',
  'creperia',
  'tapioca',
  'delivery de pizza',
  'restaurante fast-food',
  'restaurante de comida para viagem',
  'diner',
  'sandwich',
  'sanduicheria',
];

const foodNameTerms = [
  'restaurante',
  'lanches',
  'lanche',
  'pizzaria',
  'pizza',
  'hamburguer',
  'burger',
  'sanduiche',
  'sandwich',
  'sushi',
  'acai',
  'doceria',
  'confeitaria',
  'sorveteria',
  'churrasco',
  'churrascaria',
  'petiscaria',
  'marmitaria',
  'coxinha',
  'pastel',
  'temakeria',
  'frango',
  'cafe',
  'cafeteria',
];

const hasFoodSignal = (category, name) =>
  hasTerm(category, foodCategoryTerms)
  || hasPrefix(category, ['hamburg', 'churrasc', 'cafeter', 'confeit', 'sorvet', 'marmit', 'salgad', 'espet', 'docer', 'tapioc', 'crep'])
  || hasTerm(name, foodNameTerms)
  || hasPrefix(name, ['hamburg', 'churrasc', 'cafeter', 'confeit', 'sorvet', 'marmit', 'salgad', 'espet', 'docer', 'tapioc', 'crep']);

const streetLikeName = (name) =>
  /^(?:r\.\s|rua\b|av\.\s|avenida\b|travessa\b|tv\.\s|rod\.\s|rodovia\b|praca\b|praça\b|bairro\b)/.test(name);

const classifyForRemoval = (row) => {
  const googleBase = parseJson(row.coleta_logs).google_maps_base || {};
  const rawCategory = cleanCategoryLabel(row.category || googleBase.category || '');
  const category = normalize(rawCategory);
  const name = normalize(`${row.name || ''} ${row.google_maps_name || ''}`);
  const foodSignal = hasFoodSignal(category, name);

  if (/permanentemente fechado|permanently closed/.test(`${category} ${name}`)) {
    return { remove: true, reason: 'Removido antes do Instagram: Google indica permanentemente fechado.', rawCategory };
  }

  if (hasTerm(category, userExcludedCategoryTerms) || hasPrefix(category, ['panific', 'barbear'])) {
    return { remove: true, reason: `Removido antes do Instagram: categoria vetada para o app (${rawCategory || 'sem categoria'}).`, rawCategory };
  }

  if (categoryIndicatesCakeShop(category, name)) {
    return { remove: true, reason: `Removido antes do Instagram: loja de bolos/cakes vetada para o app (${rawCategory}).`, rawCategory };
  }

  if (!rawCategory && hasTerm(name, userExcludedNameTerms)) {
    return { remove: true, reason: 'Removido antes do Instagram: nome indica categoria vetada para o app.', rawCategory };
  }

  if (!foodSignal && (hasTerm(category, hardNonFoodCategories) || hasPrefix(category, ['barbear', 'apartament', 'condomini', 'residencial', 'farmaci', 'borrachar']))) {
    return { remove: true, reason: `Removido antes do Instagram: categoria nao compativel com estabelecimento de comida (${rawCategory || 'sem categoria'}).`, rawCategory };
  }

  if (!foodSignal && (hasTerm(name, hardNonFoodNames) || streetLikeName(name))) {
    return { remove: true, reason: 'Removido antes do Instagram: nome indica lead fora do escopo do app.', rawCategory };
  }

  return { remove: false, rawCategory };
};

const rows = await fetchAll();
const removals = rows
  .map((row) => ({ row, decision: classifyForRemoval(row) }))
  .filter(({ decision }) => decision.remove);

const reasonCounts = new Map();
const categoryCounts = new Map();
const samples = [];
for (const { row, decision } of removals) {
  reasonCounts.set(decision.reason, (reasonCounts.get(decision.reason) || 0) + 1);
  const category = decision.rawCategory || '(sem categoria)';
  categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  if (samples.length < 50) {
    samples.push({
      id: row.id,
      name: row.name,
      category,
      rating: row.rating,
      reviews_count: row.reviews_count,
      reason: decision.reason,
    });
  }
}

const summary = {
  mode: APPLY ? 'apply' : 'dry-run',
  scannedActiveCampina: rows.length,
  toSoftDelete: removals.length,
  reasonCounts: Object.fromEntries([...reasonCounts.entries()].sort((a, b) => b[1] - a[1])),
  categoryCounts: Object.fromEntries([...categoryCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  samples,
};

if (!APPLY) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const now = new Date().toISOString();
for (const { row, decision } of removals) {
  const previousAiLog = parseJson(row.ai_log);
  const nextAiLog = {
    ...previousAiLog,
    pipeline: 'campina-pre-instagram-lead-hygiene',
    status: 'removed_before_instagram',
    phase: 'lead_category_cleanup',
    decision: {
      status: 'ineligible',
      confidence: 0.98,
      reason: decision.reason,
      category: decision.rawCategory || null,
    },
    removedAt: now,
  };
  const { error } = await supabase
    .from('restaurants')
    .update({
      is_deleted: true,
      is_published: false,
      ai_validated: false,
      menu_status: 'unavailable',
      menu_status_reason: decision.reason,
      location_issue_reason: decision.reason,
      ai_log: JSON.stringify(nextAiLog),
    })
    .eq('id', row.id);
  if (error) throw error;
}

console.log(JSON.stringify({
  ...summary,
  appliedSoftDeletes: removals.length,
}, null, 2));
