import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const APPLY = hasFlag('--apply');
const OVERWRITE = hasFlag('--overwrite');
const SAFE_ONLY = hasFlag('--safe') || hasFlag('--safe-only');
const SKIP_EXISTING = hasFlag('--skip-existing');
const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
const RUN_ARG = argValue('--run', '');
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const MIN_SCORE = Number(argValue('--min-score', SAFE_ONLY ? '100' : '70')) || (SAFE_ONLY ? 100 : 70);
const ROOT = path.join('scratch', `${SEARCH_PROVIDER}-menu-discovery`);
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join(ROOT, `instagram-apply-${RUN_ID}`);

const STOP_TOKENS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em',
  'cabedelo', 'pb', 'paraiba', 'brasil', 'intermares', 'ponta', 'campina',
  'centro', 'poco', 'poço', 'camboinha', 'jacare', 'jacaré', 'renascer',
  'formosa', 'vila', 'sao', 'são', 'joao', 'joão', 'areia', 'dourada',
  'praia', 'beach',
  'por', 'sol',
  'restaurante', 'restaurant', 'bar', 'lanchonete', 'pizzaria', 'pizza',
  'hamburgueria', 'burger', 'cafeteria', 'bistro', 'delivery', 'pedido',
  'cardapio', 'cardápio', 'menu', 'oficial', 'online', 'loja', 'unidade',
  'sushi', 'temaki', 'temakeria', 'acai', 'açai', 'acaiteria', 'sorveteria',
  'churrascaria', 'galeteria', 'tapiocaria', 'pastel', 'pastelaria',
  'espetinho', 'lanches', 'lanche', 'massas', 'pizzas', 'caldinho',
  'comida', 'rua', 'lote', 'express', 'premium', 'gourmet',
]);

const WEAK_SINGLE_TOKENS = new Set([
  'casa',
  'sabor',
  'cantinho',
  'bom',
  'melhor',
  'popular',
  'prime',
  'familia',
  'family',
  'brasil',
  'br',
  'food',
]);

const CONFLICT_PATTERNS = [
  'sao paulo, sp', 'rio de janeiro, rj', 'recife, pe', 'natal, rn',
  'fortaleza, ce', 'maceio, al', 'salvador, ba', 'brasilia, df',
  'curitiba, pr', 'caico, rn', 'manaus, am', 'viamao, rs',
  'viamão, rs', 'blumenau, sc', 'florianopolis, sc', 'florianópolis, sc',
  'campinas, sp',
  'ico-ce', 'ico ce', 'icÃ³-ce', 'icÃ³ ce',
  'marica, rj', 'maricÃ¡, rj', 'marica rj', 'maricÃ¡ rj',
  'guarus', 'barcelos', 'tambaÃº', 'tambau', 'ruy carneiro',
];

const EXPECTED_DDD_BY_STATE = {
  PB: '83',
};

const OUT_OF_SCOPE_NAME_PATTERNS = [
  /\bobra\b/i,
  /\bfest(?:a|ival)?\b/i,
  /\bfest\s*ver[aã]o\b/i,
  /\bshopping\b/i,
  /\bmall\b/i,
  /\bprefeitura\b/i,
  /\bsecretaria\b/i,
  /\bsecult\b/i,
  /\bmetal[uú]rgica\b/i,
  /\bfood\s*service\b/i,
  /\bsabor\s+da\s+inf[aâ]ncia\b/i,
  /^rua\s/i,
];

function readEnv() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
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

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mergeLogs(value, patch) {
  return JSON.stringify({ ...parseJson(value), ...patch });
}

function parseUrl(value) {
  try {
    return new URL(clean(value));
  } catch {
    return null;
  }
}

function instagramHandleFromUrl(value) {
  const url = parseUrl(value);
  if (!url || !url.hostname.toLowerCase().includes('instagram.com')) return '';
  const first = url.pathname.split('/').filter(Boolean)[0] || '';
  if (!first || ['p', 'reel', 'stories', 'explore', 'tv'].includes(first.toLowerCase())) return '';
  return first.toLowerCase();
}

function canonicalInstagramProfileUrl(value) {
  const handle = instagramHandleFromUrl(value);
  return handle ? `https://instagram.com/${handle}` : '';
}

function distinctiveTokens(name) {
  return normalize(name)
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP_TOKENS.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function nationalPhoneDigits(value) {
  let digits = onlyDigits(value);
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

function phoneAreaCode(value) {
  const digits = nationalPhoneDigits(value);
  return digits.length >= 10 ? digits.slice(0, 2) : '';
}

function phoneEvidence(existingPhone, candidates) {
  const expectedDdd = EXPECTED_DDD_BY_STATE[STATE.toUpperCase()] || '';
  const existingDigits = nationalPhoneDigits(existingPhone);
  const candidateDigits = candidates.map(nationalPhoneDigits).filter(Boolean);
  const candidateDdds = candidateDigits
    .map((digits) => digits.length >= 10 ? digits.slice(0, 2) : '')
    .filter(Boolean);
  const exactMatch = Boolean(existingDigits && candidateDigits.some((digits) => digits === existingDigits));
  const targetAreaMatch = Boolean(expectedDdd && candidateDdds.includes(expectedDdd));
  const areaConflict = Boolean(
    candidateDdds.length
    && expectedDdd
    && !candidateDdds.includes(expectedDdd)
    && !exactMatch
  );
  return {
    expectedDdd,
    candidateDdds,
    exactMatch,
    targetAreaMatch,
    areaConflict,
  };
}

function formatBrazilPhone(digitsValue) {
  let digits = onlyDigits(digitsValue);
  if (digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return '';
}

function whatsappUrlFromPhone(phone) {
  let digits = onlyDigits(phone);
  if (!digits) return '';
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  return digits.length >= 12 ? `https://wa.me/${digits}` : '';
}

function extractPhones(text) {
  const phones = new Set();
  const source = clean(text);
  for (const match of source.matchAll(/(?:\+?55\s*)?\(?\b([1-9]{2})\)?\s*(9?\d{4})\s*[-.]?\s*(\d{4})\b/g)) {
    const formatted = formatBrazilPhone(`${match[1]}${match[2]}${match[3]}`);
    if (formatted) phones.add(formatted);
  }
  for (const match of source.matchAll(/(?:phone=|wa\.me\/|api\.whatsapp\.com\/send\?phone=)(55\d{10,11})/gi)) {
    const formatted = formatBrazilPhone(match[1]);
    if (formatted) phones.add(formatted);
  }
  return [...phones];
}

function extractOpeningHoursText(text) {
  const source = clean(text);
  const normalized = normalize(source);
  if (!/\d{1,2}\s*h/.test(normalized)) return '';
  if (!/(horario|horarios|atendimento|segunda|terca|quarta|quinta|sexta|sab|sabado|domingo|dom|seg|sex)/.test(normalized)) return '';
  return source.slice(0, 300);
}

function locationPhrases(restaurant = {}) {
  const phrases = new Set();
  const roadWords = new Set([
    'r', 'rua', 'av', 'avenida', 'travessa', 'tv', 'praca', 'praÃ§a',
    'rodovia', 'br', 'estrada', 'lote', 'loja', 'numero', 'n',
  ]);
  for (const raw of [restaurant.neighborhood, restaurant.address].filter(Boolean)) {
    const tokensWithStops = normalize(raw)
      .replace(/[.,;:()]/g, ' ')
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z0-9]/g, ''))
      .filter((token) => token.length >= 3)
      .filter((token) => !roadWords.has(token));
    if (tokensWithStops.length >= 2) phrases.add(tokensWithStops.join(' '));
    for (let index = 0; index < tokensWithStops.length - 1; index += 1) {
      phrases.add(`${tokensWithStops[index]} ${tokensWithStops[index + 1]}`);
    }
    const tokens = tokensWithStops
      .filter((token) => !STOP_TOKENS.has(token));
    if (tokens.length >= 2) phrases.add(tokens.join(' '));
    for (let index = 0; index < tokens.length - 1; index += 1) {
      phrases.add(`${tokens[index]} ${tokens[index + 1]}`);
    }
  }
  return [...phrases].filter((phrase) => phrase.length >= 7);
}

function latestRunDir() {
  if (RUN_ARG) return RUN_ARG;
  const dirs = fs.existsSync(ROOT)
    ? fs.readdirSync(ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d{4}-/.test(entry.name))
      .map((entry) => path.join(ROOT, entry.name))
      .filter((dir) => fs.existsSync(path.join(dir, 'results.jsonl')))
      .sort()
    : [];
  return dirs.pop() || '';
}

function readResults(runDir) {
  const jsonlPath = path.join(runDir, 'results.jsonl');
  return fs.readFileSync(jsonlPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function scoreInstagramCandidate(row, candidate) {
  const canonicalUrl = canonicalInstagramProfileUrl(candidate.link);
  const reasons = [];
  if (candidate.platform !== 'instagram') reasons.push('not_instagram');
  if (!canonicalUrl) reasons.push('not_profile');

  const restaurantName = row.restaurant?.name || '';
  const tokens = distinctiveTokens(restaurantName);
  if (!tokens.length) reasons.push('no_distinctive_restaurant_token');

  const text = normalize(`${candidate.title} ${candidate.snippet} ${candidate.displayedLink} ${candidate.link}`);
  const titleText = normalize(`${candidate.title} ${candidate.displayedLink}`);
  const handle = normalize(instagramHandleFromUrl(candidate.link));
  const titleHandleText = normalize(`${candidate.title} ${handle}`);
  const handleMatches = tokens.filter((token) => handle.includes(token));
  const titleMatches = tokens.filter((token) => titleText.includes(token));
  const titleHandleMatches = tokens.filter((token) => titleHandleText.includes(token));
  const textMatches = tokens.filter((token) => text.includes(token));
  const conflicts = CONFLICT_PATTERNS.filter((pattern) => text.includes(normalize(pattern)));
  const neighborhood = normalize(row.restaurant?.neighborhood || '');
  const address = normalize(row.restaurant?.address || '');
  const cityNameConfirmed = text.includes(normalize(CITY));
  const cityConfirmed = cityNameConfirmed || text.includes(normalize(STATE));
  const neighborhoodConfirmed = Boolean(neighborhood && neighborhood.length >= 4 && text.includes(neighborhood));
  const addressConfirmed = Boolean(
    address
    && address.length >= 6
    && address
      .split(/[,\-]/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 6)
      .some((part) => text.includes(part))
  );
  if (conflicts.length) reasons.push(`location_conflict:${conflicts.join('|')}`);
  const locationPhraseMatches = locationPhrases(row.restaurant || {})
    .filter((phrase) => text.includes(phrase));

  const hasWeakSingleToken = tokens.length === 1 && WEAK_SINGLE_TOKENS.has(tokens[0]);
  const strongBrand =
    handleMatches.length >= 1 ||
    titleHandleMatches.length >= 2 ||
    (titleHandleMatches.some((token) => token.length >= 5) && !hasWeakSingleToken);
  if (!strongBrand) reasons.push('brand_not_confirmed');
  if (hasWeakSingleToken && handleMatches.length <= 1 && titleMatches.length <= 1) {
    reasons.push('weak_single_brand_token');
  }

  let score = 40;
  score += handleMatches.length * 32;
  score += titleMatches.length * 14;
  score += Math.min(10, textMatches.length * 3);
  if (cityConfirmed) score += 14;
  if (extractPhones(`${candidate.title} ${candidate.snippet} ${candidate.link}`).length) score += 4;
  if (candidate.source === 'derived_instagram_handle') score -= 6;
  if (reasons.includes('brand_not_confirmed')) score -= 60;
  if (reasons.includes('weak_single_brand_token')) score -= 28;
  if (reasons.some((reason) => reason.startsWith('location_conflict'))) score -= 80;
  if (reasons.includes('not_profile')) score -= 80;

  const approved = score >= 70
    && canonicalUrl
    && strongBrand
    && !reasons.includes('weak_single_brand_token')
    && !reasons.some((reason) => reason.startsWith('location_conflict'));

  const evidenceText = clean(`${candidate.title}. ${candidate.snippet}. ${candidate.link}`);
  return {
    approved,
    score,
    reasons,
    canonicalUrl,
    handle,
    tokens,
    handleMatches,
    titleMatches,
    titleHandleMatches,
    textMatches,
    cityConfirmed,
    cityNameConfirmed,
    neighborhoodConfirmed,
    addressConfirmed,
    locationPhraseMatches,
    phones: extractPhones(evidenceText),
    openingHoursText: extractOpeningHoursText(evidenceText),
    candidate,
  };
}

function safeDecision(decision, restaurant) {
  if (!decision.baseApproved) return { safe: false, reason: decision.reason };
  const nameCategory = `${decision.restaurantName || ''} ${decision.restaurantCategory || ''}`;
  if (OUT_OF_SCOPE_NAME_PATTERNS.some((pattern) => pattern.test(nameCategory))) {
    return { safe: false, reason: 'out_of_scope_name_or_category' };
  }
  const best = decision.best;
  if (!best) return { safe: false, reason: 'no_instagram_candidate' };
  if (best.score < MIN_SCORE) return { safe: false, reason: `score_below_${MIN_SCORE}` };

  const phone = phoneEvidence(restaurant?.phone, best.phones || []);
  if (phone.areaConflict) return { safe: false, reason: `phone_area_conflict:${phone.candidateDdds.join('|')}` };

  const locationSupported = best.cityConfirmed || best.neighborhoodConfirmed || best.addressConfirmed;
  const cityNameSupported = Boolean(best.cityNameConfirmed);
  const phraseSupported = Boolean(best.locationPhraseMatches?.length);
  const phoneSupported = phone.exactMatch || phone.targetAreaMatch;
  const strongHandleMatch = best.handleMatches.length >= 2
    || best.handleMatches.some((token) => token.length >= 5)
    || best.titleHandleMatches.length >= 2;
  const singleBrandSupported = best.handleMatches.length >= 1 || best.titleHandleMatches.length >= 1;

  if (!strongHandleMatch && !(singleBrandSupported && (phone.exactMatch || phraseSupported || (cityNameSupported && phone.targetAreaMatch)))) {
    return { safe: false, reason: 'weak_handle_evidence' };
  }
  if (!locationSupported && !phoneSupported && !phraseSupported) return { safe: false, reason: 'no_location_or_phone_support' };

  return { safe: true, reason: 'approved_safe' };
}

async function selectRestaurantsByIds(supabase, ids) {
  const out = new Map();
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,city,state,phone,whatsapp_url,instagram,social_networks,coleta_logs,is_deleted')
      .in('id', chunk);
    if (error) throw error;
    for (const row of data || []) out.set(row.id, row);
  }
  return out;
}

function socialNetworksWithInstagram(current, url, metadata) {
  const list = Array.isArray(current) ? current : [];
  return [
    ...list.filter((item) => item?.platform !== 'instagram'),
    {
      platform: 'instagram',
      url,
      source: `${SEARCH_PROVIDER}_google_search`,
      confidence: metadata.score,
      collected_at: new Date().toISOString(),
      title: metadata.title,
      phone_candidate: metadata.phoneCandidate || null,
      opening_hours_text: metadata.openingHoursText || null,
    },
  ];
}

const runDir = latestRunDir();
if (!runDir) throw new Error(`Nenhum results.jsonl encontrado em ${ROOT}.`);
const results = readResults(runDir);

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const ids = [...new Set(results.map((row) => row.restaurant?.id).filter(Boolean))];
const restaurantById = await selectRestaurantsByIds(supabase, ids);

const decisions = [];
for (const row of results) {
  const restaurant = row.restaurant?.id ? restaurantById.get(row.restaurant.id) : null;
  const instagramCandidates = (row.candidates || [])
    .filter((candidate) => candidate.platform === 'instagram')
    .map((candidate) => scoreInstagramCandidate(row, candidate))
    .sort((a, b) => b.score - a.score);
  const best = instagramCandidates[0] || null;
  const existingInstagram = clean(restaurant?.instagram || '');
  const existingConflict = existingInstagram
    && best?.canonicalUrl
    && normalize(existingInstagram) !== normalize(best.canonicalUrl);
  const existingPresent = Boolean(existingInstagram && SKIP_EXISTING);
  const baseApproved = Boolean(best?.approved && !existingPresent && (!existingConflict || OVERWRITE));
  const safe = safeDecision({
    baseApproved,
    restaurantName: row.restaurant?.name || '',
    restaurantCategory: row.restaurant?.category || '',
    reason: baseApproved
      ? 'approved'
      : existingPresent
        ? 'existing_instagram_present'
      : existingConflict
        ? 'existing_instagram_conflict'
        : best?.reasons?.join(',') || 'no_instagram_candidate',
    best,
  }, restaurant);
  const approved = SAFE_ONLY ? safe.safe : baseApproved;
  decisions.push({
    restaurantId: row.restaurant?.id || null,
    restaurantName: row.restaurant?.name || '',
    restaurantCategory: row.restaurant?.category || null,
    approved,
    baseApproved,
    safe: safe.safe,
    reason: approved
      ? safe.reason
      : existingPresent
        ? 'existing_instagram_present'
      : existingConflict
        ? 'existing_instagram_conflict'
        : SAFE_ONLY && baseApproved
          ? safe.reason
          : best?.reasons?.join(',') || 'no_instagram_candidate',
    best,
    existingInstagram,
    existingPhone: restaurant?.phone || null,
  });
}

const updates = [];
const failures = [];
if (APPLY) {
  for (const decision of decisions.filter((item) => item.approved)) {
    const row = restaurantById.get(decision.restaurantId);
    if (!row || row.is_deleted) continue;
    const phoneCandidate = decision.best.phones[0] || '';
    const shouldFillPhone = !row.phone && phoneCandidate;
    const shouldFillWhatsapp = !row.whatsapp_url && phoneCandidate;
    const update = {
      instagram: decision.best.canonicalUrl,
      social_networks: socialNetworksWithInstagram(row.social_networks, decision.best.canonicalUrl, {
        score: decision.best.score,
        title: decision.best.candidate.title,
        phoneCandidate,
        openingHoursText: decision.best.openingHoursText,
      }),
      coleta_logs: mergeLogs(row.coleta_logs, {
        [`${SEARCH_PROVIDER}_instagram_discovery_v2`]: {
          runDir,
          appliedAt: new Date().toISOString(),
          source: `google_${SEARCH_PROVIDER}_instagram_search`,
          instagram: decision.best.canonicalUrl,
          score: decision.best.score,
          title: decision.best.candidate.title,
          snippet: decision.best.candidate.snippet,
          phone_candidate: phoneCandidate || null,
          opening_hours_text: decision.best.openingHoursText || null,
          brand_tokens: decision.best.tokens,
          matched_handle_tokens: decision.best.handleMatches,
          matched_text_tokens: decision.best.textMatches,
        },
      }),
    };
    if (shouldFillPhone) update.phone = phoneCandidate;
    if (shouldFillWhatsapp) update.whatsapp_url = whatsappUrlFromPhone(phoneCandidate);
    const { error } = await supabase
      .from('restaurants')
      .update(update)
      .eq('id', row.id)
      .eq('city', CITY)
      .eq('state', STATE);
    if (error) {
      failures.push({ id: row.id, name: row.name, error: error.message });
    } else {
      updates.push({
        id: row.id,
        name: row.name,
        instagram: update.instagram,
        phoneFilled: Boolean(shouldFillPhone),
        whatsappFilled: Boolean(shouldFillWhatsapp),
      });
    }
  }
}

const summary = {
  apply: APPLY,
  overwrite: OVERWRITE,
  safeOnly: SAFE_ONLY,
  skipExisting: SKIP_EXISTING,
  minScore: MIN_SCORE,
  city: CITY,
  state: STATE,
  runDir,
  processed: decisions.length,
  approved: decisions.filter((item) => item.approved).length,
  baseApproved: decisions.filter((item) => item.baseApproved).length,
  safe: decisions.filter((item) => item.safe).length,
  rejected: decisions.filter((item) => !item.approved).length,
  applied: updates.length,
  failures,
  reasonCounts: decisions.reduce((acc, item) => {
    acc[item.reason] = (acc[item.reason] || 0) + 1;
    return acc;
  }, {}),
  approvedSamples: decisions
    .filter((item) => item.approved)
    .slice(0, 30)
    .map((item) => ({
      name: item.restaurantName,
      instagram: item.best.canonicalUrl,
      score: item.best.score,
      phoneCandidate: item.best.phones[0] || null,
      openingHoursText: item.best.openingHoursText || null,
    })),
  rejectedSamples: decisions
    .filter((item) => !item.approved)
    .slice(0, 30)
    .map((item) => ({
      name: item.restaurantName,
      reason: item.reason,
      best: item.best ? {
        url: item.best.canonicalUrl || item.best.candidate.link,
        title: item.best.candidate.title,
        score: item.best.score,
        tokens: item.best.tokens,
        handleMatches: item.best.handleMatches,
        textMatches: item.best.textMatches,
      } : null,
    })),
  updates,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'decisions.json'), JSON.stringify(decisions, null, 2));
console.log(JSON.stringify(summary, null, 2));
