import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0) || null;
const OFFSET = Number(process.argv.find((arg) => arg.startsWith('--offset='))?.split('=')[1] || 0);
const COMMAND_BASE = 'http://127.0.0.1:8080/api/local-collector';
const EXTENSION_ID = process.env.FF_EXTENSION_ID || 'kehbedmdplkodjgfiohgnebicblmhghe';
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const REPORT_PATH = 'scratch/campina-google-manual-review.json';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'google-manual-review', RUN_ID);
const CHECKPOINT_FILE = path.join(OUT_DIR, 'results.jsonl');

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const normalizeCompact = (value) => normalize(value).replace(/[^a-z0-9]+/g, '');

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

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasTerm = (text, terms) => terms.some((term) => {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`).test(text);
});

const hasLooseFragment = (text, fragments) => {
  const compact = normalizeCompact(text);
  return fragments.some((fragment) => compact.includes(normalizeCompact(fragment)));
};

const cleanText = (value) => String(value || '')
  .replace(/[^\p{L}\p{N}\s.,:"'()&+/@-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const cleanAddress = (value) => cleanText(value).replace(/^(Endere[cç]o|Address):\s*/i, '').trim();

const cleanCategory = (value) => {
  const raw = cleanText(value);
  if (!raw || raw.length > 110 || /^["']/.test(raw)) return '';
  return raw;
};

const parseAddress = (fullAddress) => {
  let street = '';
  let number = '';
  let neighborhood = '';
  let city = '';
  let state = '';
  let cep = '';
  let working = cleanAddress(fullAddress)
    .replace(/\s*,?\s*(?:Brazil|Brasil)\s*[;,.]*\s*$/i, '')
    .replace(/^[^\p{L}\d]*(?=(?:R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|Pra[cç]a|Alameda|Estrada|\d))/iu, '')
    .trim();
  if (!working) return { street, number, neighborhood, city, state, cep };
  const cepMatch = working.match(/\b(\d{5}-\d{3})\b/) || working.match(/\b(\d{8})\b/);
  if (cepMatch) {
    cep = cepMatch[1];
    working = working.replace(cepMatch[0], '').trim();
  }
  const stateMatch = working.match(/[\s,-]\s*([A-Z]{2})\s*$/);
  if (stateMatch) {
    state = stateMatch[1];
    working = working.substring(0, working.lastIndexOf(stateMatch[0])).trim();
  }
  const parts = working.replace(/^[\s,-]+|[\s,-]+$/g, '').split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    street = parts[0];
    const second = parts[1];
    const hyphen = second.indexOf(' - ');
    if (hyphen !== -1) {
      const before = second.slice(0, hyphen).trim();
      const after = second.slice(hyphen + 3).trim();
      if (/\d/.test(before) || normalize(before) === 's/n') {
        number = before;
        neighborhood = after;
      }
    } else if (/^\d+/.test(second) || normalize(second) === 's/n') {
      number = second;
    } else {
      neighborhood = second;
    }
    const rest = parts.slice(2).join(', ');
    const restHyphen = rest.indexOf(' - ');
    if (restHyphen !== -1 && !neighborhood) {
      neighborhood = rest.slice(0, restHyphen).trim();
      city = rest.slice(restHyphen + 3).trim();
    } else {
      city = rest;
    }
  } else if (parts.length === 2) {
    street = parts[0];
    const hyphen = parts[1].indexOf(' - ');
    if (hyphen !== -1) {
      neighborhood = parts[1].slice(0, hyphen).trim();
      city = parts[1].slice(hyphen + 3).trim();
    } else {
      city = parts[1];
    }
  } else {
    street = working;
  }
  return { street, number, neighborhood, city, state, cep };
};

const commandFetch = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${url}: HTTP ${response.status}`);
  return response.json();
};

const wakeExtension = async () => {
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  try {
    const page = await browser.newPage();
    await page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('extensions-manager', { timeout: 10000 });
    const clicked = await page.evaluate(async (extensionId) => {
      const manager = document.querySelector('extensions-manager');
      const root = manager?.shadowRoot;
      const list = root?.querySelector('extensions-item-list')?.shadowRoot;
      const items = Array.from(list?.querySelectorAll('extensions-item') || []);
      const item = items.find((candidate) => candidate.id === extensionId);
      if (!item) return false;
      const itemRoot = item.shadowRoot;
      const reload = itemRoot?.querySelector('#dev-reload-button')
        || itemRoot?.querySelector('[id*="reload"]')
        || itemRoot?.querySelector('cr-icon-button[iron-icon="extensions:reload"]');
      if (!reload) return false;
      reload.click();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return true;
    }, EXTENSION_ID);
    await page.close().catch(() => {});
    if (!clicked) throw new Error(`Nao consegui acordar/recarregar a extensao ${EXTENSION_ID}`);
  } finally {
    await browser.disconnect();
  }
};

const runExtensionCommand = async (row) => {
  await commandFetch(`${COMMAND_BASE}/extension-command-result`, { method: 'DELETE' }).catch(() => null);
  const query = `${row.google_maps_name || row.name || ''} Campina Grande PB`.replace(/\s+/g, ' ').trim();
  const payload = {
    type: 'google_maps_place_info',
    label: `campina-google-review-${row.id}`,
    name: query,
    query,
    mapUrl: row.google_maps_url || '',
    googleMapsUrl: row.google_maps_url || '',
    active: true,
    closeTabAfter: true,
    visibleDelayMs: 900,
  };
  const posted = await commandFetch(`${COMMAND_BASE}/extension-command`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const commandId = posted.command?.id;
  if (!commandId) throw new Error('Extensao nao retornou command id.');
  await wakeExtension();
  const deadline = Date.now() + 95000;
  while (Date.now() < deadline) {
    const state = await commandFetch(`${COMMAND_BASE}/extension-command-result`);
    const hit = (state.results || []).find((entry) => String(entry.commandId) === String(commandId));
    if (hit) {
      if (hit.success === false) return { success: false, error: hit.error || 'extension_failed' };
      return hit.result || hit;
    }
    await sleep(1000);
  }
  throw new Error(`Timeout aguardando extensao para ${row.name}`);
};

const fetchRowsByIds = async (ids) => {
  const rows = [];
  for (let index = 0; index < ids.length; index += 100) {
    const slice = ids.slice(index, index + 100);
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,google_maps_url,address,number,neighborhood,city,state,cep,phone,category,rating,reviews_count,opening_hours,location_issue_reason,menu_status_reason,coleta_logs,ai_log,is_deleted,is_published,ai_validated')
      .in('id', slice);
    if (error) throw error;
    rows.push(...(data || []));
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};

const foodTerms = [
  'restaurante',
  'restaurant',
  'lanchonete',
  'lanche',
  'lanches',
  'pizzaria',
  'pizza',
  'hamburguer',
  'hamburgueria',
  'burguer',
  'burger',
  'sanduiche',
  'sandwich',
  'sanduicheria',
  'bar',
  'boteco',
  'pub',
  'cervejaria',
  'petiscaria',
  'pastel',
  'pastelaria',
  'pastek',
  'pasteky',
  'coxinha',
  'salgado',
  'salgados',
  'esfiha',
  'sushi',
  'temaki',
  'yakisoba',
  'chinesa',
  'japones',
  'marmita',
  'marmitaria',
  'quentinha',
  'refeicao',
  'refeicoes',
  'almoco',
  'jantar',
  'comida',
  'cozinha',
  'comedoria',
  'prato',
  'buchada',
  'feijao',
  'feijoada',
  'caldinho',
  'caldao',
  'churrasco',
  'churrascaria',
  'costelaria',
  'espetinho',
  'espetos',
  'galeto',
  'frango',
  'grill',
  'brasa',
  'hot dog',
  'cachorro quente',
  'acai',
  'acaiteria',
  'sorvete',
  'sorveteria',
  'ice cream',
  'cafeteria',
  'cafe',
  'doceria',
  'confeitaria',
  'chocolate',
  'waffle',
  'empada',
  'churros',
  'trailer',
  'quiosque',
  'cucina',
  'forno',
  'chef',
  'rango',
  'subway',
];

const foodFragments = [
  'lanches',
  'lanche',
  'lachonete',
  'pizz',
  'burguer',
  'burger',
  'coxinha',
  'salgad',
  'espet',
  'refeic',
  'caldinho',
  'caldao',
  'acai',
  'sorv',
  'cafes',
  'cafe',
  'empad',
  'churros',
  'forno',
  'chef',
  'pizza',
  'tkoxinha',
  'pastek',
  'trailer',
  'quiosque',
  'barzin',
  'kennybar',
  'petisq',
  'buchada',
  'cucina',
  'grill',
  'grills',
  'brasa',
  'cafes',
];

const userExcludedTerms = [
  'padaria',
  'panificadora',
  'bakery',
  'acougue',
  'carnes',
  'frigotil',
  'frigorifico',
  'peixaria',
  'loja de frutos do mar',
  'mercado de frutos do mar',
  'conveniencia',
  'loja de conveniencia',
  'buffet',
  'catering',
  'recepcoes',
  'salao de festas',
  'salao de eventos',
  'cestas',
  'loja de bolos',
  'cake shop',
  'loja de tortas',
  'lovecake',
];

const nonFoodTerms = [
  'advogado',
  'juridico',
  'beleza',
  'beauty',
  'estetica',
  'barbearia',
  'pet shop',
  'racoes',
  'copiadora',
  'lavanderia',
  'ubsf',
  'postinho',
  'posto de saude',
  'unidade basica',
  'posto',
  'supermercado',
  'atacadao',
  'atacadista',
  'mercado publico',
  'shopping',
  'cinema',
  'cineteatro',
  'clube',
  'piscina',
  'resort',
  'sitio',
  'fazenda',
  'area de camping',
  'area de recreacao',
  'atracao turistica',
  'vila do artesao',
  'artesanato',
  'centro comunitario',
  'complexo habitacional',
  'fornecedor',
  'fabricante',
  'fabricacao',
  'embalagens',
  'descartaveis',
  'ervas medicinais',
  'mensagens',
  'eventos',
  'shows',
  'mini box',
  'sinagoga',
  'igreja',
  'rua',
  'avenida',
  'bairro',
];

const exactLocationNames = [
  'bela vista',
  'itapemirim',
  'cruzeiro',
  'sao jose',
  'ramadinha',
  'nova brasilia',
  'centro',
  'malvinas',
  'catole',
  'prata',
];

const hasFoodSignal = (text) => hasTerm(normalize(text), foodTerms) || hasLooseFragment(text, foodFragments);
const hasExcludedSignal = (text) => hasTerm(normalize(text), userExcludedTerms) || hasLooseFragment(text, ['lovecake', 'frigotil']);
const hasNonFoodSignal = (text) => hasTerm(normalize(text), nonFoodTerms) || hasLooseFragment(text, ['copiadora', 'vanessaferreirabeauty', 'viladoartesao']);

const classify = (row, rawResult) => {
  const result = rawResult || {};
  const googleName = cleanText(result.name || result.title || '');
  const category = cleanCategory(result.category || '');
  const address = cleanAddress(result.address || '');
  const statusText = cleanText(`${result.businessStatus || ''} ${result.statusText || ''} ${result.status || ''}`);
  const context = `${row.name || ''} ${row.google_maps_name || ''} ${googleName} ${category}`;
  const rowName = `${row.name || ''} ${row.google_maps_name || ''}`;
  const normalizedRowName = normalize(row.name || row.google_maps_name || '');
  const addressInCampina = /Campina Grande\s*(?:-\s*PB|,\s*PB|\/PB)?\b/i.test(address) && !/Campina Grande do Sul/i.test(address);
  const addressHasOutsideState = Boolean(address && !addressInCampina && /(?:-\s*[A-Z]{2}\b|,\s*[A-Z]{2}\b|\/[A-Z]{2}\b)/.test(address));
  const closed = /permanentemente fechado|fechado permanentemente|permanently closed|temporariamente fechado|fechado temporariamente|temporarily closed/i
    .test(`${statusText} ${category} ${googleName}`);
  const food = hasFoodSignal(context);
  const excluded = hasExcludedSignal(context);
  const nonFood = hasNonFoodSignal(context);
  const pureLocation = exactLocationNames.includes(normalizedRowName)
    || /^(?:r\.|rua|av\.|avenida|travessa|tv\.|rod\.|rodovia|praca|praça|bairro)\b/.test(normalizedRowName);

  if (closed) return { action: 'remove', confidence: 0.99, reason: 'Google indica fechado temporaria/permanentemente.', category, googleName, address };
  if (addressHasOutsideState) return { action: 'remove', confidence: 0.98, reason: `Google aponta fora de Campina Grande/PB (${address}).`, category, googleName, address };
  if (excluded) return { action: 'remove', confidence: 0.98, reason: 'Categoria/nome vetado para o app antes do Instagram.', category, googleName, address };
  if (pureLocation && !food) return { action: 'remove', confidence: 0.96, reason: 'Nome e localizacao/bairro/logradouro, nao estabelecimento.', category, googleName, address };
  if (nonFood && !food) return { action: 'remove', confidence: 0.95, reason: 'Google/nome indica lead fora de restaurantes/comida.', category, googleName, address };
  if (food) return { action: 'keep', confidence: category ? 0.9 : 0.78, reason: 'Google ou nome confirma estabelecimento de comida.', category, googleName, address };
  if (category && nonFood) return { action: 'remove', confidence: 0.9, reason: `Categoria Google nao compativel com o app (${category}).`, category, googleName, address };
  return { action: 'remove', confidence: 0.72, reason: 'Depois de checar no Google, seguiu sem sinal suficiente de comida/cardapio.', category, googleName, address };
};

const buildUpdate = (row, result, decision) => {
  const previousLogs = parseJson(row.coleta_logs);
  const parsed = parseAddress(decision.address);
  const rating = result?.rating ?? result?.google_rating ?? null;
  const reviews = result?.reviewsCount ?? result?.reviews_count ?? result?.google_reviews_count ?? null;
  const reviewsCount = reviews == null ? null : Number(String(reviews).replace(/[^\d]/g, ''));
  const nextLogs = {
    ...previousLogs,
    google_manual_review: {
      reviewedAt: new Date().toISOString(),
      source: 'chrome_extension_google_maps_place_info',
      action: decision.action,
      confidence: decision.confidence,
      reason: decision.reason,
      name: decision.googleName || null,
      category: decision.category || null,
      address: decision.address || null,
      rating: rating == null ? null : Number(rating),
      reviews_count: Number.isFinite(reviewsCount) ? reviewsCount : null,
      finalUrl: result?.finalUrl || result?.currentUrl || null,
      success: result?.success !== false,
      error: result?.error || null,
    },
  };
  const update = {
    coleta_logs: nextLogs,
    location_issue_reason: decision.action === 'remove' ? `Revisao Google Codex antes do Instagram: ${decision.reason}` : null,
    menu_status_reason: decision.action === 'remove' ? `Revisao Google Codex antes do Instagram: ${decision.reason}` : row.menu_status_reason,
  };
  if (decision.action === 'remove') {
    update.is_deleted = true;
    update.is_published = false;
    update.ai_validated = false;
    update.menu_status = 'unavailable';
  } else {
    if (decision.googleName) {
      update.name = decision.googleName;
      update.google_maps_name = decision.googleName;
    }
    if (decision.category) update.category = decision.category;
    if (decision.address && /Campina Grande/i.test(decision.address)) {
      update.address = parsed.street || decision.address;
      update.number = parsed.number || null;
      update.neighborhood = parsed.neighborhood || null;
      update.city = 'Campina Grande';
      update.state = 'PB';
      if (parsed.cep) update.cep = parsed.cep;
    }
    if (result?.phone) update.phone = result.phone;
    if (rating != null && Number.isFinite(Number(rating))) update.rating = Number(rating);
    if (Number.isFinite(reviewsCount)) update.reviews_count = reviewsCount;
    if (result?.scheduleIsWeekly && result?.schedule) update.opening_hours = result.schedule;
  }
  return update;
};

const report = JSON.parse(fs.readFileSync('scratch/campina-ambiguous-review.json', 'utf8'));
const manualIds = report.rows
  .filter((row) => row.action === 'manual_hold')
  .map((row) => row.id);
const targetIds = manualIds.slice(OFFSET, LIMIT ? OFFSET + LIMIT : undefined);
const targets = await fetchRowsByIds(targetIds);
fs.mkdirSync(OUT_DIR, { recursive: true });
await commandFetch(`${COMMAND_BASE}/extension-command`, { method: 'DELETE' }).catch(() => null);
await commandFetch(`${COMMAND_BASE}/extension-command-result`, { method: 'DELETE' }).catch(() => null);

const rows = [];
const counts = {};
for (let index = 0; index < targets.length; index += 1) {
  const row = targets[index];
  if (row.is_deleted === true) continue;
  try {
    const result = await runExtensionCommand(row);
    const decision = classify(row, result);
    const update = buildUpdate(row, result, decision);
    if (APPLY) {
      const { error } = await supabase.from('restaurants').update(update).eq('id', row.id);
      if (error) throw error;
    }
    const record = {
      index: index + 1,
      total: targets.length,
      id: row.id,
      name: row.name,
      googleName: decision.googleName,
      category: decision.category,
      address: decision.address,
      action: decision.action,
      confidence: decision.confidence,
      reason: decision.reason,
      rating: result?.rating ?? result?.google_rating ?? null,
      reviews_count: result?.reviewsCount ?? result?.reviews_count ?? result?.google_reviews_count ?? null,
      phone: result?.phone || null,
      finalUrl: result?.finalUrl || result?.currentUrl || null,
    };
    rows.push(record);
    counts[decision.action] = (counts[decision.action] || 0) + 1;
    fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(record)}\n`);
    console.log(JSON.stringify(record));
  } catch (error) {
    const record = {
      index: index + 1,
      total: targets.length,
      id: row.id,
      name: row.name,
      action: 'error',
      reason: error.message,
    };
    rows.push(record);
    counts.error = (counts.error || 0) + 1;
    fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(record)}\n`);
    console.error(JSON.stringify(record));
  }
}

const summary = {
  mode: APPLY ? 'apply' : 'dry-run',
  generatedAt: new Date().toISOString(),
  sourceManualIds: manualIds.length,
  offset: OFFSET,
  limit: LIMIT,
  processed: rows.length,
  counts,
  outputDir: OUT_DIR,
  rows,
};
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  mode: summary.mode,
  sourceManualIds: summary.sourceManualIds,
  processed: summary.processed,
  counts,
  reportPath: REPORT_PATH,
  outputDir: OUT_DIR,
}, null, 2));
