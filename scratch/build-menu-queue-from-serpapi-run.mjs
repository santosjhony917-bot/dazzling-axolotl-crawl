import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalize = (value) => clean(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'menu-collection-queue', RUN_ID);
const INPUT_DIR = argValue('--input-dir', '');
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const CITY = clean(argValue('--city', 'Cabedelo'));
const STATE = clean(argValue('--state', 'PB'));
const ALLOW_BRAND_FLAG = hasFlag('--allow-brand-flag');

const SOCIAL_OR_INDEX_PLATFORMS = new Set([
  'instagram',
  'facebook',
  'whatsapp',
  'linktree',
  'beacons',
  'maps',
  'map',
  'tripadvisor',
  'youtube',
]);

const DIRECT_MENU_PLATFORMS = new Set([
  'anota_ai',
  'cardapioweb',
  'whatsmenu',
  'goomer',
  'saipos',
  'deliverydireto',
  'deliverymuch',
  'menudino',
  'instadelivery',
  'brendi',
  'olaclick',
  'cardapiodigital',
  'livemenu',
  'menupick',
  'fastydiggy',
  'diggy',
  'meucarrinho',
  'yooga',
  'pedir',
]);

function latestDiscoveryRun() {
  const root = path.join('scratch', `${SEARCH_PROVIDER}-menu-discovery`);
  if (!fs.existsSync(root)) throw new Error(`Pasta nao encontrada: ${root}`);
  const runs = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'results.jsonl')))
    .sort();
  if (!runs.length) throw new Error(`Nenhum results.jsonl encontrado em ${root}.`);
  return runs.at(-1);
}

function parseJsonl(file) {
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function pathOf(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

function isGenericPlatformListing(candidate) {
  const link = candidate?.link || '';
  const platform = candidate?.platform || '';
  const pathname = pathOf(link);
  const host = hostOf(link);
  if (!link) return true;
  if (platform === 'instadelivery' && /^\/(cabedelo|joao-pessoa|campina-grande)?\/?$/.test(pathname)) return true;
  if (platform === 'menudino' && /\/delivery\/[^/]+-[a-z]{2}(?:\/[^/]+)?\/?$/.test(pathname)) return true;
  if (platform === 'deliverydireto' && pathname.split('/').filter(Boolean).length < 2) return true;
  if (platform === 'whatsmenu' && pathname.split('/').filter(Boolean).length < 1) return true;
  if (platform === 'cardapioweb' && !pathname.split('/').filter(Boolean).length && !host.includes('app.')) return true;
  return false;
}

function significantNameTokens(value) {
  const stopwords = new Set([
    'bar', 'restaurante', 'rest', 'pizzaria', 'pizza', 'lanchonete', 'lanches', 'delivery',
    'hamburgueria', 'burger', 'burguer', 'sushi', 'temakeria', 'sorveteria', 'acai', 'acai',
    'doceria', 'cafeteria', 'pastelaria', 'churrascaria',
    'comida', 'caseira', 'refeicoes', 'refeicao', 'cozinha', 'food', 'service', 'self',
    'marmita', 'marmitas', 'marmitaria', 'pf', 'quentinha', 'quentinhas',
    'cabedelo', 'pb', 'joao', 'pessoa', 'sao',
    'intermares', 'camboinha', 'ponta', 'campina', 'centro', 'do', 'da', 'de', 'dos', 'das',
    'e', 'em', 'com', 'na', 'no', 'a', 'o', 'the',
  ]);
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !stopwords.has(token));
}

function sourceBrandText(best) {
  const title = clean(best.title || '')
    .split(/\s+\|\s+|\s+-\s+|\s+·\s+/)[0]
    .replace(/\s+delivery\s+em\s+.+$/i, '')
    .replace(/\s+pedido\s+online\s*$/i, '');
  return clean([title, best.link, best.displayedLink].filter(Boolean).join(' '));
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D+/g, '');
}

function phoneFromQuery(query) {
  const match = clean(query || '').match(/(?:\+?55\s*)?(?:\(?83\)?[\s-]*)?\d{4,5}[\s-]?\d{4}/);
  return match ? digitsOnly(match[0]).replace(/^55/, '') : '';
}

function sourcePhones(best) {
  const text = [best.title, best.snippet, best.link].filter(Boolean).join(' ');
  return [...text.matchAll(/(?:\+?55\s*)?(?:\(?83\)?[\s-]*)?\d{4,5}[\s-]?\d{4}/g)]
    .map((match) => digitsOnly(match[0]).replace(/^55/, ''))
    .filter(Boolean);
}

function phoneMatches(entry) {
  const queryPhone = phoneFromQuery(entry.query || '');
  if (!queryPhone) return false;
  const last8 = queryPhone.slice(-8);
  const last9 = queryPhone.slice(-9);
  return sourcePhones(entry.best || {}).some((phone) => phone.endsWith(last8) || phone.endsWith(last9));
}

function candidateHasBrandEvidence(entry) {
  const restaurant = entry.restaurant || {};
  const best = entry.best || {};
  const tokens = significantNameTokens(restaurant.name || '');
  const brandText = sourceBrandText(best);
  const haystack = normalize(brandText);
  if (!tokens.length) return false;
  const hits = tokens.filter((token) => haystack.includes(token));
  if (hits.length < Math.min(2, tokens.length)) return false;

  const titleOnly = clean(best.title || '').split(/\s+\|\s+|\s+-\s+|\s+·\s+/)[0];
  const sourceTitleTokens = significantNameTokens(titleOnly);
  const extraTitleTokens = sourceTitleTokens.filter((token) => !tokens.includes(token));
  if (extraTitleTokens.length && hits.length < 2 && !phoneMatches(entry)) return false;

  return true;
}

function sourceDecision(entry) {
  const best = entry.best || {};
  const platform = best.platform || 'unknown';
  const flags = Array.isArray(best.flags) ? best.flags : [];
  if (best.tier !== 'green') return { direct: false, reason: `tier_${best.tier || 'unknown'}` };
  if (SOCIAL_OR_INDEX_PLATFORMS.has(platform)) return { direct: false, reason: 'social_or_index_source' };
  if (!DIRECT_MENU_PLATFORMS.has(platform)) return { direct: false, reason: 'unknown_platform' };
  if (isGenericPlatformListing(best)) return { direct: false, reason: 'generic_platform_listing' };
  if (!candidateHasBrandEvidence(entry)) return { direct: false, reason: 'brand_text_not_supported' };

  const blockingFlags = flags.filter((flag) => {
    if (ALLOW_BRAND_FLAG && flag === 'brand_not_confirmed') return false;
    return true;
  });
  if (blockingFlags.length) return { direct: false, reason: `flags:${blockingFlags.join(',')}` };
  return { direct: true, reason: 'strict_direct_menu_source' };
}

function toQueueEntry(entry, decision) {
  const restaurant = entry.restaurant || {};
  const best = entry.best || {};
  const phoneMatch = clean(entry.query || '').match(/(?:\+?55\s*)?(?:\(?83\)?[\s-]*)?\d{4,5}[\s-]?\d{4}/);
  return {
    restaurant_id: restaurant.id,
    name: restaurant.name,
    category: restaurant.category || null,
    address: restaurant.address || null,
    neighborhood: restaurant.neighborhood || null,
    city: CITY,
    state: STATE,
    phone: phoneMatch ? phoneMatch[0] : null,
    rating: restaurant.rating ?? null,
    reviews_count: restaurant.reviews_count ?? null,
    platform: best.platform,
    tier: best.tier,
    source_url: best.link,
    source_title: best.title || null,
    source_snippet: best.snippet || null,
    source_score: best.score ?? null,
    source_flags: best.flags || [],
    queue_reason: decision.reason,
    discovery_status: entry.status,
  };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const inputDir = INPUT_DIR || latestDiscoveryRun();
const resultsFile = path.join(inputDir, 'results.jsonl');
const rows = parseJsonl(resultsFile);

const queue = [];
const reviewQueue = [];
const byReason = {};
const byPlatform = {};

for (const row of rows) {
  const decision = sourceDecision(row);
  const queueEntry = toQueueEntry(row, decision);
  byReason[decision.reason] = (byReason[decision.reason] || 0) + 1;
  byPlatform[queueEntry.platform || 'unknown'] = (byPlatform[queueEntry.platform || 'unknown'] || 0) + 1;
  if (decision.direct) queue.push(queueEntry);
  else reviewQueue.push({ ...queueEntry, best: row.best || null, candidates: (row.candidates || []).slice(0, 8) });
}

queue.sort((left, right) => Number(right.reviews_count || 0) - Number(left.reviews_count || 0));
reviewQueue.sort((left, right) => Number(right.reviews_count || 0) - Number(left.reviews_count || 0));

const summary = {
  generated_at: new Date().toISOString(),
  input_dir: path.resolve(inputDir),
  city: CITY,
  state: STATE,
  total_results: rows.length,
  strict_direct_queue: queue.length,
  review_queue: reviewQueue.length,
  by_reason: byReason,
  by_platform: byPlatform,
};

fs.writeFileSync(path.join(OUT_DIR, 'queue.json'), JSON.stringify(queue, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'review_queue.json'), JSON.stringify(reviewQueue, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

console.log(JSON.stringify(summary, null, 2));
console.log(`Queue: ${path.join(OUT_DIR, 'queue.json')}`);
console.log(`Review: ${path.join(OUT_DIR, 'review_queue.json')}`);
