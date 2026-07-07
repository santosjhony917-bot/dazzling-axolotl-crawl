import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0) || null;
const OFFSET = Number(process.argv.find((arg) => arg.startsWith('--offset='))?.split('=')[1] || 0);
const WAIT_MS = Number(process.argv.find((arg) => arg.startsWith('--wait-ms='))?.split('=')[1] || 9000);
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const REPORT_PATH = 'scratch/campina-visible-google-review.json';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'visible-google-manual-review', RUN_ID);
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

const cleanText = (value) => String(value || '')
  .replace(/[^\p{L}\p{N}\s.,:"'()&+/@-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const cleanAddress = (value) => cleanText(value)
  .replace(/^(Endere[cç]o|Address):\s*/i, '')
  .replace(/\s*,?\s*(?:Brazil|Brasil)\s*[;,.]*\s*$/i, '')
  .trim();

const cleanCategory = (value) => {
  const raw = cleanText(value);
  if (!raw || raw.length > 120 || /^["']/.test(raw)) return '';
  if (/^(Aberto|Fechado|Temporariamente fechado|Permanentemente fechado|Open|Closed)\b/i.test(raw)) return '';
  return raw;
};

const waitForMapsDetails = async (page, maxMs) => {
  try {
    await page.waitForFunction(() => {
      const text = String(document.body?.innerText || '');
      const title = String(document.querySelector('h1')?.innerText || '').trim();
      return title.length >= 2
        && /(Endere[cç]o|Address|Aberto|Fechado|Permanentemente|Temporariamente|reviews|avalia[cç][oõ]es|\(\d+\))/i.test(text);
    }, { polling: 500, timeout: maxMs });
    await sleep(1800);
  } catch {
    await sleep(2500);
  }
};

const parseMapsVisiblePage = async (page) => page.evaluate(() => {
  const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const text = String(document.body?.innerText || '');
  const lines = text.split('\n').map(compact).filter(Boolean);
  const pickAria = (selector, prefix) => {
    const items = Array.from(document.querySelectorAll(selector));
    const found = items.find((el) => compact(el.getAttribute('aria-label')).toLowerCase().startsWith(prefix.toLowerCase()));
    return compact(found?.getAttribute('aria-label') || found?.innerText || found?.textContent || '');
  };
  const name = compact(document.querySelector('h1')?.innerText || document.querySelector('h1')?.textContent || '');
  const addressRaw = pickAria('[data-item-id="address"], [aria-label^="Endereço:"], [aria-label^="Address:"]', 'Endereço:')
    || pickAria('[data-item-id="address"], [aria-label^="Address:"]', 'Address:');
  const phoneRaw = pickAria('[data-item-id*="phone"], [aria-label^="Telefone:"], [aria-label^="Phone:"]', 'Telefone:')
    || pickAria('[data-item-id*="phone"], [aria-label^="Phone:"]', 'Phone:');
  const websiteEl = document.querySelector('[data-item-id="authority"]');
  const ratingAria = Array.from(document.querySelectorAll('[role="img"], span'))
    .map((el) => compact(el.getAttribute('aria-label') || el.textContent || ''))
    .find((value) => /\d+[,.]\d+\s+estrelas|\d+[,.]\d+\s+stars/i.test(value)) || '';
  const reviewsAria = Array.from(document.querySelectorAll('[role="img"], span'))
    .map((el) => compact(el.getAttribute('aria-label') || el.textContent || ''))
    .find((value) => /\d[\d.,]*\s+(avaliações|avaliacoes|reviews)/i.test(value)) || '';
  const ratingText = lines.find((line, index) => /^\d+[,.]\d+$/.test(line) && /^\(?\d+/.test(lines[index + 1] || '')) || '';
  const rating = ratingAria.match(/(\d+[,.]\d+)/)?.[1] || ratingText || '';
  const reviews = reviewsAria.match(/(\d[\d.,]*)/)?.[1]
    || (lines.find((line) => /^\(\d[\d.,]*\)$/.test(line)) || '').replace(/[()]/g, '');
  const category = lines.find((line, index) =>
    index > 0
    && !/^(Visão geral|Cardápio|Avaliações|Sobre|Rotas|Salvar|Compartilhar|Website|Direções)$/i.test(line)
    && !/\d+[,.]\d+|\(\d+\)|R\$/i.test(line)
    && lines[index - 1]?.match(/\(\d+\)|avaliações|avaliacoes|reviews/i)
  ) || '';
  const statusLine = lines.find((line) =>
    /^(Aberto|Fechado|Fecha em breve|Abre em breve|Temporariamente fechado|Permanentemente fechado|Esse lugar pode estar fechado|Aberto 24 horas|Open|Closed)\b/i.test(line)
    || /^(Open|Closed)\s*·/i.test(line)
  ) || '';
  const permanentlyClosed = /permanentemente fechado|fechado permanentemente|permanently closed/i.test(text);
  const temporarilyClosed = /temporariamente fechado|fechado temporariamente|temporarily closed/i.test(text);
  const hourButtons = Array.from(document.querySelectorAll('button[aria-label]'))
    .map((el) => compact(el.getAttribute('aria-label')))
    .filter((value) =>
      /(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)/i.test(value)
      && /(copiar horário|copy hours|fechado|\d{1,2}:\d{2}|24 horas)/i.test(value)
    );
  return {
    url: location.href,
    title: document.title,
    name,
    address: addressRaw.replace(/^Endere[cç]o:\s*/i, '').replace(/^Address:\s*/i, ''),
    phone: phoneRaw.replace(/^Telefone:\s*/i, '').replace(/^Phone:\s*/i, ''),
    website: websiteEl?.href || '',
    rating,
    reviews,
    category,
    statusLine,
    permanentlyClosed,
    temporarilyClosed,
    hourButtons,
    textExcerpt: compact(text).slice(0, 6000),
  };
});

const parseAddress = (fullAddress) => {
  let street = '';
  let number = '';
  let neighborhood = '';
  let city = '';
  let state = '';
  let cep = '';
  let working = cleanAddress(fullAddress);
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
  'restaurante', 'restaurant', 'bistro', 'bistrô', 'lanchonete', 'lanche', 'lanches', 'pizzaria', 'pizza',
  'hamburguer', 'hamburgueria', 'burguer', 'burger', 'sanduiche', 'sandwich', 'sanduicheria',
  'bar', 'boteco', 'pub', 'cervejaria', 'petiscaria', 'pastel', 'pastelaria', 'pastek', 'pasteky',
  'coxinha', 'salgado', 'salgados', 'esfiha', 'sushi', 'temaki', 'yakisoba', 'chinesa', 'japones',
  'marmita', 'marmitaria', 'quentinha', 'refeicao', 'refeicoes', 'almoco', 'jantar', 'comida',
  'cozinha', 'comedoria', 'prato', 'buchada', 'feijao', 'feijoada', 'caldinho', 'caldao',
  'churrasco', 'churrascaria', 'costelaria', 'espetinho', 'espetos', 'galeto', 'frango', 'grill',
  'brasa', 'hot dog', 'cachorro quente', 'acai', 'acaiteria', 'sorvete', 'sorveteria', 'ice cream',
  'cafeteria', 'cafe', 'cafes', 'doceria', 'confeitaria', 'chocolate', 'waffle', 'empada', 'churros',
  'trailer', 'quiosque', 'cucina', 'forno', 'chef', 'rango', 'subway',
];

const foodFragments = [
  'lanches', 'lanche', 'lachonete', 'pizz', 'burguer', 'burger', 'coxinha', 'salgad', 'espet',
  'refeic', 'caldinho', 'caldao', 'acai', 'sorv', 'cafes', 'cafe', 'empad', 'churros',
  'forno', 'chef', 'pizza', 'tkoxinha', 'pastek', 'trailer', 'quiosque', 'barzin',
  'kennybar', 'petisq', 'buchada', 'cucina', 'grill', 'grills', 'brasa', 'qtalspetos',
  'spetos', 'sadywich', 'feiju', 'iburgue', 'dlburguer', 'costelaria',
];

const userExcludedTerms = [
  'padaria', 'panificadora', 'bakery', 'acougue', 'carnes', 'frigotil', 'frigorifico',
  'peixaria', 'loja de frutos do mar', 'mercado de frutos do mar', 'conveniencia',
  'loja de conveniencia', 'buffet', 'catering', 'recepcoes', 'salao de festas',
  'salao de eventos', 'cestas', 'loja de bolos', 'cake shop', 'loja de tortas', 'lovecake',
];

const nonFoodTerms = [
  'advogado', 'juridico', 'beleza', 'beauty', 'estetica', 'barbearia', 'pet shop', 'racoes',
  'copiadora', 'lavanderia', 'ubsf', 'postinho', 'posto de saude', 'unidade basica',
  'posto', 'supermercado', 'atacadao', 'atacadista', 'mercado publico', 'shopping',
  'cinema', 'cineteatro', 'clube', 'piscina', 'resort', 'sitio', 'fazenda', 'area de camping',
  'area de recreacao', 'atracao turistica', 'vila do artesao', 'artesanato',
  'centro comunitario', 'complexo habitacional', 'fornecedor', 'fabricante', 'fabricacao',
  'embalagens', 'descartaveis', 'ervas medicinais', 'mensagens', 'eventos', 'shows',
  'mini box', 'sinagoga', 'igreja', 'salao de festas', 'local para eventos', 'hotel',
  'pousada', 'unidade de saude',
];

const obviousNonAppNameFragments = [
  'fazendasantana', 'viladoartesao', 'casadecumpade', 'vanessaferreirabeauty',
  'rscopiadoracg', 'ubsfdoaraxa', 'idealsupermercados', 'spazzio', 'quinta',
  'seuevento', 'casaodefestas', 'casadefestas',
];

const exactLocationNames = ['bela vista', 'itapemirim', 'cruzeiro', 'sao jose', 'ramadinha', 'nova brasilia', 'centro', 'malvinas', 'catole', 'prata', 'jeremias', 'campina grande'];
const hasFoodSignal = (text) => hasTerm(normalize(text), foodTerms) || hasLooseFragment(text, foodFragments);
const hasExcludedSignal = (text) => hasTerm(normalize(text), userExcludedTerms) || hasLooseFragment(text, ['lovecake', 'frigotil']);
const hasNonFoodSignal = (text) => hasTerm(normalize(text), nonFoodTerms) || hasLooseFragment(text, ['copiadora', 'vanessaferreirabeauty', 'viladoartesao']);
const hasObviousNonAppName = (text) => hasTerm(normalize(text), ['fazenda', 'sitio', 'hotel', 'pousada', 'supermercado', 'copiadora', 'beauty', 'ubsf', 'postinho', 'vila do artesao'])
  || hasLooseFragment(text, obviousNonAppNameFragments);
const hasStrongEateryCategory = (category) => hasTerm(normalize(category), [
  'restaurante', 'lanchonete', 'pizzaria', 'hamburgueria', 'pastelaria', 'churrascaria',
  'sorveteria', 'doceria', 'confeitaria', 'petiscaria', 'sushi', 'japanese', 'chinese',
  'delivery de comida', 'delivery de pizza', 'bistro', 'bistrô',
]);

const classify = (row, scraped) => {
  const googleName = cleanText(scraped.name || scraped.title || '');
  const category = cleanCategory(scraped.category || '');
  const address = cleanAddress(scraped.address || '');
  const statusText = cleanText(`${scraped.statusLine || ''}`);
  const context = `${row.name || ''} ${row.google_maps_name || ''} ${row.category || ''} ${googleName} ${category}`;
  const normalizedRowName = normalize(row.name || row.google_maps_name || '');
  const nameContext = `${row.name || ''} ${row.google_maps_name || ''} ${googleName}`;
  const addressInCampina = /Campina Grande\s*(?:-\s*PB|,\s*PB|\/PB)?\b/i.test(address) && !/Campina Grande do Sul/i.test(address);
  const addressHasOutsideState = Boolean(address && !addressInCampina && /(?:-\s*[A-Z]{2}\b|,\s*[A-Z]{2}\b|\/[A-Z]{2}\b)/.test(address));
  const addressLooksOutsideCampina = /(?:Cuité|Lagoa Seca|Massaranduba|Fagundes|Queimadas|Patos|João Pessoa|Catolé do Rocha)\s*-\s*PB/i.test(address)
    && !/Campina Grande\s*-\s*PB/i.test(address);
  const closed = scraped.permanentlyClosed || scraped.temporarilyClosed
    || /permanentemente fechado|fechado permanentemente|permanently closed|temporariamente fechado|fechado temporariamente|temporarily closed/i
      .test(`${statusText} ${category} ${googleName}`);
  const food = hasFoodSignal(context);
  const excluded = hasExcludedSignal(context);
  const nonFood = hasNonFoodSignal(context);
  const obviousNonAppName = hasObviousNonAppName(nameContext);
  const strongEateryCategory = hasStrongEateryCategory(`${row.category || ''} ${category}`);
  const pureLocation = exactLocationNames.includes(normalizedRowName)
    || /^(?:r\.|rua|av\.|avenida|travessa|tv\.|rod\.|rodovia|praca|praça|bairro)\b/.test(normalizedRowName);

  if (closed) return { action: 'remove', confidence: 0.99, reason: 'Google indica fechado temporaria/permanentemente.', category, googleName, address };
  if (addressHasOutsideState || addressLooksOutsideCampina) return { action: 'remove', confidence: 0.98, reason: `Google aponta fora de Campina Grande/PB (${address}).`, category, googleName, address };
  if (excluded) return { action: 'remove', confidence: 0.98, reason: 'Categoria/nome vetado para o app antes do Instagram.', category, googleName, address };
  if ((pureLocation || obviousNonAppName) && !strongEateryCategory) return { action: 'remove', confidence: 0.96, reason: 'Nome indica local/servico/evento, nao estabelecimento de comida vendavel.', category, googleName, address };
  if (nonFood && !food) return { action: 'remove', confidence: 0.95, reason: 'Google/nome indica lead fora de restaurantes/comida.', category, googleName, address };
  if (food) return { action: 'keep', confidence: category ? 0.9 : 0.78, reason: 'Google ou nome confirma estabelecimento de comida.', category, googleName, address };
  return { action: 'remove', confidence: 0.72, reason: 'Depois de checar no Google, seguiu sem sinal suficiente de comida/cardapio.', category, googleName, address };
};

const parseHoursSlot = (value) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (/fechado|closed/i.test(text)) return { isOpen: false, slots: [] };
  if (/24\s*h|24 horas|open 24/i.test(text)) return { isOpen: true, slots: [{ start: '00:00', end: '23:59' }] };
  const slots = [];
  const pattern = /(\d{1,2}:\d{2})\s*(?:a|às|as|-|–)\s*(\d{1,2}:\d{2})/gi;
  let match;
  while ((match = pattern.exec(text))) slots.push({ start: match[1].padStart(5, '0'), end: match[2].padStart(5, '0') });
  return { isOpen: slots.length > 0, slots };
};

const dayMap = new Map([
  ['segunda-feira', 'monday'], ['segunda', 'monday'], ['terça-feira', 'tuesday'], ['terca-feira', 'tuesday'],
  ['terça', 'tuesday'], ['terca', 'tuesday'], ['quarta-feira', 'wednesday'], ['quarta', 'wednesday'],
  ['quinta-feira', 'thursday'], ['quinta', 'thursday'], ['sexta-feira', 'friday'], ['sexta', 'friday'],
  ['sábado', 'saturday'], ['sabado', 'saturday'], ['domingo', 'sunday'],
]);

const buildOpeningHours = (hourButtons) => {
  const openingHours = {};
  for (const raw of hourButtons || []) {
    const normalized = normalize(raw);
    const dayKey = [...dayMap.entries()].find(([pt]) => normalized.includes(normalize(pt)))?.[1];
    if (!dayKey) continue;
    const timePart = raw.replace(/copiar horário de funcionamento|copy hours/ig, '').replace(/^[^,]+,\s*/i, '').trim();
    openingHours[dayKey] = parseHoursSlot(timePart);
  }
  return Object.keys(openingHours).length === 7 ? openingHours : null;
};

const buildUpdate = (row, scraped, decision) => {
  const previousLogs = parseJson(row.coleta_logs);
  const parsed = parseAddress(decision.address);
  const rating = scraped.rating ? Number(String(scraped.rating).replace(',', '.')) : null;
  const reviewsCount = scraped.reviews ? Number(String(scraped.reviews).replace(/[^\d]/g, '')) : null;
  const openingHours = buildOpeningHours(scraped.hourButtons);
  const update = {
    coleta_logs: {
      ...previousLogs,
      google_manual_review: {
        reviewedAt: new Date().toISOString(),
        source: 'visible_chrome_google_maps_panel',
        action: decision.action,
        confidence: decision.confidence,
        reason: decision.reason,
        name: decision.googleName || null,
        category: decision.category || null,
        address: decision.address || null,
        rating,
        reviews_count: Number.isFinite(reviewsCount) ? reviewsCount : null,
        finalUrl: scraped.url || null,
        statusText: scraped.statusLine || null,
      },
    },
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
    if (scraped.phone) update.phone = scraped.phone;
    if (rating != null && Number.isFinite(rating)) update.rating = rating;
    if (Number.isFinite(reviewsCount)) update.reviews_count = reviewsCount;
    if (openingHours) update.opening_hours = openingHours;
  }
  return update;
};

const sourceReport = JSON.parse(fs.readFileSync('scratch/campina-ambiguous-review.json', 'utf8'));
const manualIds = sourceReport.rows.filter((row) => row.action === 'manual_hold').map((row) => row.id);
const targetIds = manualIds.slice(OFFSET, LIMIT ? OFFSET + LIMIT : undefined);
const targets = await fetchRowsByIds(targetIds);
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });

const rows = [];
const counts = {};
try {
  for (let index = 0; index < targets.length; index += 1) {
    const row = targets[index];
    if (row.is_deleted === true) continue;
    const url = row.google_maps_url || `https://www.google.com/maps/search/${encodeURIComponent(`${row.google_maps_name || row.name} Campina Grande PB`)}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForMapsDetails(page, WAIT_MS);
      const scraped = await parseMapsVisiblePage(page);
      const decision = classify(row, scraped);
      const update = buildUpdate(row, scraped, decision);
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
        rating: scraped.rating || null,
        reviews_count: scraped.reviews || null,
        phone: scraped.phone || null,
        finalUrl: scraped.url || null,
      };
      rows.push(record);
      counts[decision.action] = (counts[decision.action] || 0) + 1;
      fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(record)}\n`);
      console.log(JSON.stringify(record));
    } catch (error) {
      const record = { index: index + 1, total: targets.length, id: row.id, name: row.name, action: 'error', reason: error.message };
      rows.push(record);
      counts.error = (counts.error || 0) + 1;
      fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(record)}\n`);
      console.error(JSON.stringify(record));
    }
  }
} finally {
  await page.close().catch(() => {});
  await browser.disconnect();
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
