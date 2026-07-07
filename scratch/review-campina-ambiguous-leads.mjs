import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const REPORT_PATH = 'scratch/campina-ambiguous-review.json';

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

const cleanCategoryLabel = (value) => {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (/^["']/.test(raw) || raw.length > 90) return '';
  return raw
    .replace(/[^\p{L}\p{N}\s.,:"'()&+/-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasTerm = (text, terms) => terms.some((term) => {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`).test(text);
});

const hasPrefix = (text, prefixes) => prefixes.some((prefix) =>
  new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalize(prefix))}[a-z0-9]*`).test(text)
);

const fetchAll = async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,google_maps_url,category,city,state,address,neighborhood,phone,rating,reviews_count,menu_status,is_deleted,is_published,ai_validated,location_issue_reason,menu_status_reason,coleta_logs,ai_log')
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

const baselineFoodCategoryTerms = [
  'restaurant',
  'restaurante',
  'pizzaria',
  'pizza',
  'hamburg',
  'burger',
  'burguer',
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
  'confectionery',
  'doceria',
  'candy',
  'dessert',
  'ice cream',
  'sorveteria',
  'acai',
  'juice',
  'food court',
  'hot dog',
  'cachorro-quente',
  'cachorro quente',
  'tapioca',
  'crepe',
  'marmit',
  'salgado',
  'sanduicheria',
  'bares',
  'bar e restaurante',
  'cervejaria',
  'loja de chocolates',
  'chocolate',
  'chocolates',
];

const baselineFoodNameTerms = [
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
  'padaria',
  'panificadora',
  'bolo',
  'bolos',
  'doces',
  'doceria',
  'confeitaria',
  'sorvete',
  'sorveteria',
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
  'gourmet',
];

const baselineFoodPrefixes = [
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

const strongFoodNameTerms = [
  'restaurante',
  'resto',
  'rooftop',
  'bistro',
  'pizzaria',
  'pizzeria',
  'pizza',
  'massas',
  'massa',
  'italia',
  'italia',
  'ristoranti',
  'rodizio',
  'hamburguer',
  'hamburgueria',
  'burguer',
  'burger',
  'lanches',
  'lanche',
  'lanchonete',
  'sanduiche',
  'sanduicheria',
  'sandwich',
  'pastel',
  'coxinha',
  'salgado',
  'salgados',
  'esfiha',
  'esfiharia',
  'sushi',
  'temaki',
  'temakeria',
  'yakisoba',
  'japones',
  'oriental',
  'marmit',
  'quentinha',
  'almoco',
  'jantar',
  'prato',
  'prato feito',
  'prato executivo',
  'cozinha',
  'fogao',
  'forno',
  'panela',
  'tempero',
  'sapore',
  'sabor',
  'sabores',
  'delicia',
  'delicias',
  'gourmet',
  'caldo',
  'caldinho',
  'caldao',
  'cuscuz',
  'panquecaria',
  'tapioca',
  'crepe',
  'churrasco',
  'churrascaria',
  'espetinho',
  'espetaria',
  'galeto',
  'frango',
  'grill',
  'bbq',
  'bar ',
  'bar do',
  'bar da',
  'barzim',
  'barteco',
  'buteco',
  'butecu',
  'petiscaria',
  'hot dog',
  'hotdog',
  'cachorro-quente',
  'cachorro quente',
  'dogao',
  'dog',
  'acai',
  'acaiteria',
  'acaíteria',
  'sorvete',
  'sorveteria',
  'gelato',
  'shake',
  'cafeteria',
  'cafe',
  'doceria',
  'doce',
  'doces',
  'confeitaria',
  'chocolate',
  'chocolates',
  'trufa',
  'brownie',
  'brigadeiro',
  'ice cream',
  'ice creamy',
  'creamy',
  'rango',
  'gastro',
  'gastronomia',
  'gastronomico',
  'gastronomica',
  'comedoria',
  'refeicao',
  'refeicoes',
  'empada',
  'empadas',
  'churros',
  'dulce',
  'dulces',
  'pub',
  'boteco',
  'cervejaria',
  'cerveja',
  'batata',
  'toca',
  'pimenta',
  'adocei',
  'delivery de pizza',
  'food truck',
  'qtalspetos',
  'spetos',
  'sadywich',
  'feiju',
  'tkoxinha',
  'dlburguer',
  'iburgue',
  'costelaria',
];

const foodCategoryPrefixes = [
  'hamburg',
  'burguer',
  'churrasc',
  'cafeter',
  'confeit',
  'sorvet',
  'marmit',
  'salgad',
  'espet',
  'docer',
  'tapioc',
  'crep',
  'pizz',
  'restaur',
  'lanch',
  'pastel',
  'sanduich',
  'acai',
  'delici',
  'refeic',
  'petisc',
];

const userExcludedTerms = [
  'padaria',
  'panificadora',
  'bakery',
  'acougue',
  'carnes',
  'frigotil',
  'peixaria',
  'fish store',
  'seafood market',
  'mercado de peixes',
  'mercado de frutos do mar',
  'loja de frutos do mar',
  'loja de conveniencia',
  'convenience store',
  'conveniencia',
  'buffet',
  'catering',
  'local para eventos',
  'local para casamentos',
  'salao de festas',
  'salao de eventos',
  'banquet hall',
  'event venue',
  'wedding venue',
  'loja de bolos',
  'cake shop',
  'loja de tortas',
  'atacadista de confeitaria',
];

const userExcludedNameTerms = [
  'padaria',
  'panificadora',
  'acougue',
  'carnes',
  'peixaria',
  'conveniencia',
  'loja de conveniencia',
  'buffet',
  'catering',
  'recepcoes',
  'salao de festas',
  'salao de eventos',
  'cestas',
  'loja de bolos',
  'boleria',
  'cake',
  'cakes',
  'lovecake',
  'tortas',
];

const nonAppCategoryTerms = [
  'advogado',
  'area de camping',
  'area de recreacao',
  'artesanato',
  'atracao turistica',
  'banco de alimentos',
  'bar de apostas',
  'cama e cafe',
  'casa de campo',
  'centro comunitario',
  'cinema',
  'clube',
  'complexo habitacional',
  'estudio de televisao',
  'fabrica',
  'fabricante',
  'fabricacao de alimentos',
  'feira livre',
  'fornecedor de produtos alimenticios',
  'fornecedor de produtos descartaveis',
  'fornecedor de alimentos',
  'loja de artigos para festas',
  'loja de bebidas',
  'loja de cervejas',
  'loja de cestas de presente',
  'loja de ervas',
  'loja de produtos naturais',
  'pet shop',
  'piscina',
  'praca de alimentacao',
  'supermercado',
  'atacadista',
  'escritorio da empresa',
  'shopping center',
  'centro comercial',
  'hotel',
  'pousada',
  'posto de combustivel',
  'gas station',
  'embalagens',
  'salao',
  'servico de lavanderia',
  'sinagoga',
];

const nonAppNameTerms = [
  'assai atacadista',
  'atacadao',
  'supermercado',
  'mercado publico',
  'lojas ',
  'posto',
  'hotel',
  'pousada',
  'shopping',
  'cineteatro',
  'cinema',
  'pet shop',
  'racoes',
  'barbearia',
  'lavanderia',
  'sinagoga',
  'igreja',
  'condominio',
  'residencial',
  'distribuidora',
  'centro de distribuicao',
  'terminal',
  'rodoviaria',
  'juridico',
  'beauty',
  'mensagens',
  'shows',
  'eventos',
  'mini box',
  'sitio',
  'fazenda',
  'resort',
  'embalagens',
  'vila do artesao',
  'casa de cumpade',
  'spazzio',
  'copiadora',
  'ubsf',
  'postinho',
];

const exactLocationNames = [
  'bela vista',
  'itapemirim',
  'jeremias',
  'campina grande',
  'malvinas',
  'catole',
  'prata',
  'centro',
  'bodocongo',
  'liberdade',
  'palmeira',
  'santa rosa',
  'velame',
  'galante',
  'sao jose da mata',
  'sao jose',
  'ramadinha',
  'nova brasilia',
  'cruzeiro',
  'itarare',
];

const lowValueStoreCategories = [
  'loja',
  'store',
  'loja de produtos naturais',
  'loja de alimentos congelados',
  'loja de cestas de presente',
  'loja de bebidas',
  'loja de ervas',
  'loja de artigos para festas',
];

const temporarilyClosed = (category, name) =>
  /temporariamente fechado|temporarily closed/.test(`${category} ${name}`);

const permanentlyClosed = (category, name) =>
  /permanentemente fechado|permanently closed/.test(`${category} ${name}`);

const streetLikeName = (name) =>
  /^(?:r\.\s|rua\b|av\.\s|avenida\b|travessa\b|tv\.\s|rod\.\s|rodovia\b|praca\b|praça\b|bairro\b)/.test(name);

const hasStrongFoodSignal = (category, name) =>
  hasTerm(category, baselineFoodCategoryTerms)
  || hasPrefix(category, foodCategoryPrefixes)
  || hasTerm(name, strongFoodNameTerms)
  || hasPrefix(name, foodCategoryPrefixes);

const hasBaselineFoodSignal = (category, name) =>
  hasTerm(category, baselineFoodCategoryTerms)
  || hasPrefix(category, baselineFoodPrefixes)
  || hasTerm(name, baselineFoodNameTerms)
  || hasPrefix(name, baselineFoodPrefixes);

const looksLikePureLocation = (name) =>
  exactLocationNames.includes(name)
  || /^(?:\d+\s*-\s*)?(?:centro|catole|malvinas|prata|bodocongo|liberdade|santa rosa|palmeira|velame|galante)(?:,\s*campina grande)?$/.test(name);

const hasObviousNonAppName = (name) =>
  hasTerm(name, [
    'fazenda',
    'sitio',
    'hotel',
    'pousada',
    'supermercado',
    'copiadora',
    'beauty',
    'ubsf',
    'postinho',
    'vila do artesao',
    'casa de cumpade',
    'spazzio',
    'seu evento',
    'quinta da colina',
  ]);

const strongCategoryCanOverrideGenericName = (category) =>
  hasTerm(category, [
    'restaurante',
    'lanchonete',
    'pizzaria',
    'hamburgueria',
    'pastelaria',
    'churrascaria',
    'sorveteria',
    'doceria',
    'confeitaria',
    'petiscaria',
    'delivery de comida',
    'delivery de pizza',
  ]);

const directEateryCategorySignal = (category) =>
  hasTerm(category, [
    'restaurante',
    'lanchonete',
    'pizzaria',
    'hamburgueria',
    'bar',
    'bares',
    'petiscaria',
    'sanduicheria',
    'pastelaria',
    'churrascaria',
    'cafeteria',
    'doceria',
    'confeitaria',
    'sorveteria',
    'loja de acai',
    'delivery de pizza',
    'restaurante fast-food',
  ]);

const directEateryNameSignal = (name) =>
  hasTerm(name, [
    'restaurante',
    'lanchonete',
    'lanches',
    'pizzaria',
    'hamburgueria',
    'burguer',
    'burger',
    'bar',
    'boteco',
    'petiscaria',
    'sanduicheria',
    'pastelaria',
    'churrascaria',
    'cafeteria',
    'doceria',
    'confeitaria',
    'sorveteria',
    'acaiteria',
    'marmitaria',
    'refeicoes',
    'comedoria',
  ]) || hasPrefix(name, ['lanch', 'pizz', 'hamburg', 'burguer', 'pastel', 'petisc', 'sorvet', 'acai']);

const baselineReviewReason = (row, category, name) => {
  const foodSignal = hasBaselineFoodSignal(category, name);
  if (permanentlyClosed(category, name)) return 'fechado permanentemente no Google';
  if (temporarilyClosed(category, name)) return 'temporariamente fechado no Google';
  if (!row.category && !foodSignal) return 'sem categoria e sem sinal claro de comida no nome';
  if (!foodSignal && hasTerm(category, lowValueStoreCategories)) return 'categoria de produto/loja/evento pode ou nao ter cardapio';
  if (!foodSignal) return 'sem sinal forte de comida';
  if (hasTerm(category, lowValueStoreCategories) || hasTerm(category, nonAppCategoryTerms) || hasTerm(name, nonAppNameTerms)) {
    return 'tem sinal de comida, mas categoria/nome e misto';
  }
  return 'sinal de estabelecimento de comida';
};

const decide = (row) => {
  const googleBase = parseJson(row.coleta_logs).google_maps_base || {};
  const rawCategory = cleanCategoryLabel(row.category || googleBase.category || '');
  const category = normalize(rawCategory);
  const primaryName = normalize(row.name || row.google_maps_name || '');
  const mapsName = normalize(row.google_maps_name || '');
  const name = normalize(`${row.name || ''} ${row.google_maps_name || ''}`);
  const displayName = row.name || row.google_maps_name || '';
  const foodSignal = hasStrongFoodSignal(category, name);
  const directEatery = directEateryCategorySignal(category) || directEateryNameSignal(name);

  if (permanentlyClosed(category, name)) {
    return {
      action: 'remove',
      confidence: 0.99,
      reason: 'Fechado permanentemente no Google.',
      rawCategory,
    };
  }

  if (temporarilyClosed(category, name)) {
    return {
      action: 'remove',
      confidence: 0.98,
      reason: 'Temporariamente fechado no Google; removido da fila/app antes do Instagram.',
      rawCategory,
    };
  }

  if (hasTerm(category, userExcludedTerms) || hasTerm(primaryName, userExcludedNameTerms) || hasTerm(mapsName, userExcludedNameTerms)) {
    return {
      action: 'remove',
      confidence: 0.98,
      reason: `Categoria/nome vetado para o app antes do Instagram (${rawCategory || displayName}).`,
      rawCategory,
    };
  }

  if (streetLikeName(primaryName) || streetLikeName(mapsName) || looksLikePureLocation(primaryName) || looksLikePureLocation(mapsName)) {
    return {
      action: 'remove',
      confidence: 0.97,
      reason: 'Nome e um logradouro/bairro/localizacao, nao um estabelecimento.',
      rawCategory,
    };
  }

  if ((hasObviousNonAppName(primaryName) || hasObviousNonAppName(mapsName)) && !strongCategoryCanOverrideGenericName(category) && !directEateryNameSignal(name)) {
    return {
      action: 'remove',
      confidence: 0.97,
      reason: 'Nome indica local/servico/evento, nao estabelecimento de comida vendavel.',
      rawCategory,
    };
  }

  if ((hasTerm(primaryName, ['posto', 'distribuidora']) || hasTerm(mapsName, ['posto', 'distribuidora'])) && !directEatery) {
    return {
      action: 'remove',
      confidence: 0.96,
      reason: `Nome indica ${hasTerm(primaryName, ['posto']) || hasTerm(mapsName, ['posto']) ? 'posto' : 'distribuidora'}, nao restaurante/cardapio.`,
      rawCategory,
    };
  }

  if (hasTerm(category, ['fornecedor de produtos descartaveis', 'embalagens']) || hasTerm(name, ['embalagens'])) {
    return {
      action: 'remove',
      confidence: 0.96,
      reason: 'Fornecedor/loja de embalagens e descartaveis, fora do escopo do app.',
      rawCategory,
    };
  }

  if (!foodSignal && (hasTerm(category, nonAppCategoryTerms) || hasTerm(name, nonAppNameTerms))) {
    return {
      action: 'remove',
      confidence: 0.96,
      reason: `Lead fora do escopo de restaurantes/comida (${rawCategory || displayName}).`,
      rawCategory,
    };
  }

  if (hasTerm(category, ['centro de comida de rua', 'praca de alimentacao']) && !hasTerm(name, strongFoodNameTerms)) {
    return {
      action: 'remove',
      confidence: 0.9,
      reason: 'Local coletivo de alimentacao, nao restaurante individual para cadastrar.',
      rawCategory,
    };
  }

  if (foodSignal) {
    const lowPriority = hasTerm(category, lowValueStoreCategories)
      || hasTerm(category, nonAppCategoryTerms)
      || hasTerm(category, ['loja de chocolates', 'loja de cafe'])
      || hasTerm(name, ['shopping', 'atacadao']);
    return {
      action: lowPriority ? 'keep_low_priority' : 'keep',
      confidence: lowPriority ? 0.78 : 0.9,
      reason: lowPriority
        ? 'Tem sinal de comida, mas vale validar depois dos restaurantes mais fortes.'
        : 'Tem sinal suficiente de estabelecimento de comida para ir para Instagram/cardapio.',
      rawCategory,
    };
  }

  if (hasTerm(category, ['delivery', 'pendente validacao']) || !rawCategory) {
    return {
      action: 'manual_hold',
      confidence: 0.55,
      reason: 'Sem sinal forte de comida apos revisao local; precisa de checagem Google antes de gastar Instagram.',
      rawCategory,
    };
  }

  return {
    action: 'manual_hold',
    confidence: 0.6,
    reason: 'Ambiguo: nao removi sem evidencia melhor.',
    rawCategory,
  };
};

const countBy = (rows, keyFn) => {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row) || '(vazio)';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))));
};

const rows = await fetchAll();
const reviewed = rows.map((row) => {
  const decision = decide(row);
  const googleBase = parseJson(row.coleta_logs).google_maps_base || {};
  const rawCategory = decision.rawCategory || cleanCategoryLabel(row.category || googleBase.category || '');
  const category = normalize(rawCategory);
  const name = normalize(`${row.name || ''} ${row.google_maps_name || ''}`);
  return {
    id: row.id,
    name: row.name,
    google_maps_name: row.google_maps_name,
    category: rawCategory || '(sem categoria)',
    rating: row.rating,
    reviews_count: row.reviews_count,
    phone: row.phone,
    google_maps_url: row.google_maps_url,
    previous_reason: baselineReviewReason(row, category, name),
    action: decision.action,
    confidence: decision.confidence,
    reason: decision.reason,
  };
});

const ambiguousBefore = reviewed.filter((row) => row.previous_reason !== 'sinal de estabelecimento de comida');
const removals = ambiguousBefore.filter((row) => row.action === 'remove');
const keep = ambiguousBefore.filter((row) => row.action === 'keep');
const keepLowPriority = ambiguousBefore.filter((row) => row.action === 'keep_low_priority');
const manualHold = ambiguousBefore.filter((row) => row.action === 'manual_hold');

const report = {
  mode: APPLY ? 'apply' : 'dry-run',
  generatedAt: new Date().toISOString(),
  scannedActiveCampina: rows.length,
  ambiguousBefore: ambiguousBefore.length,
  decisions: {
    remove: removals.length,
    keep: keep.length,
    keep_low_priority: keepLowPriority.length,
    manual_hold: manualHold.length,
  },
  actionReasons: countBy(ambiguousBefore, (row) => `${row.action}: ${row.reason}`),
  categoriesByAction: {
    remove: countBy(removals, (row) => row.category),
    keep: countBy(keep, (row) => row.category),
    keep_low_priority: countBy(keepLowPriority, (row) => row.category),
    manual_hold: countBy(manualHold, (row) => row.category),
  },
  samples: {
    remove: removals.slice(0, 80),
    keep: keep.slice(0, 40),
    keep_low_priority: keepLowPriority.slice(0, 40),
    manual_hold: manualHold.slice(0, 80),
  },
  rows: ambiguousBefore,
};

if (APPLY) {
  const now = new Date().toISOString();
  for (const row of removals) {
    const previous = rows.find((candidate) => candidate.id === row.id);
    const previousAiLog = parseJson(previous?.ai_log);
    const nextAiLog = {
      ...previousAiLog,
      pipeline: 'campina-ambiguous-lead-review',
      status: 'removed_before_instagram',
      phase: 'cheap_ambiguous_review',
      decision: {
        status: 'ineligible',
        confidence: row.confidence,
        reason: row.reason,
        previousReason: row.previous_reason,
        category: row.category === '(sem categoria)' ? null : row.category,
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
        menu_status_reason: `Revisao Codex antes do Instagram: ${row.reason}`,
        location_issue_reason: `Revisao Codex antes do Instagram: ${row.reason}`,
        ai_log: JSON.stringify(nextAiLog),
      })
      .eq('id', row.id);
    if (error) throw error;
  }
  report.appliedSoftDeletes = removals.length;
}

fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  mode: report.mode,
  reportPath: REPORT_PATH,
  scannedActiveCampina: report.scannedActiveCampina,
  ambiguousBefore: report.ambiguousBefore,
  decisions: report.decisions,
  appliedSoftDeletes: report.appliedSoftDeletes || 0,
  topActionReasons: Object.fromEntries(Object.entries(report.actionReasons).slice(0, 10)),
}, null, 2));
