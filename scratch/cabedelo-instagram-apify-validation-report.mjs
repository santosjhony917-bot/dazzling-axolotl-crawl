import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};

const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
function latestApplyDir() {
  const root = path.join('scratch', `${SEARCH_PROVIDER}-menu-discovery`);
  if (!fs.existsSync(root)) return '';
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('instagram-apply-'))
    .map((entry) => path.join(root, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'decisions.json')))
    .sort()
    .at(-1) || '';
}
const APPLY_DIR = argValue('--apply-dir', latestApplyDir());
const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
const BATCH_SIZE = Math.max(1, Math.min(Number(argValue('--batch-size', '25')) || 25, 50));
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'cabedelo-instagram-validation-report', RUN_ID);

const STOP_TOKENS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no',
  'cabedelo', 'pb', 'paraiba', 'brasil', 'intermares', 'ponta', 'campina',
  'centro', 'poco', 'poço', 'camboinha', 'jacare', 'jacaré', 'renascer',
  'formosa', 'vila', 'sao', 'são', 'joao', 'joão', 'areia', 'dourada',
  'praia', 'beach', 'por', 'sol', 'restaurante', 'restaurant', 'bar',
  'lanchonete', 'pizzaria', 'pizza', 'hamburgueria', 'burger', 'burguer',
  'cafeteria', 'bistro', 'delivery', 'pedido', 'cardapio', 'cardápio',
  'menu', 'oficial', 'online', 'loja', 'unidade', 'sushi', 'temaki',
  'temakeria', 'acai', 'açai', 'açaí', 'acaiteria', 'sorveteria', 'gelato',
  'churrascaria', 'galeteria', 'tapiocaria', 'pastel', 'pastelaria',
  'espetinho', 'lanches', 'lanche', 'massas', 'pizzas', 'caldinho',
  'comida', 'rua', 'lote', 'express', 'premium', 'gourmet', 'self', 'service',
]);

const WEAK_SINGLE_TOKENS = new Set([
  'casa', 'sabor', 'cantinho', 'bom', 'melhor', 'popular', 'prime', 'familia',
  'family', 'brasil', 'food', 'hall', 'porto', 'rainha', 'paulista',
]);

const HARD_CONFLICTS = [
  'manaus, am', 'manaus am', 'rio de janeiro, rj', 'rio de janeiro rj',
  'fortaleza, ce', 'fortaleza ce', 'vespasiano, mg', 'vespasiano mg',
  'sao paulo, sp', 'sao paulo sp', 'guarus', 'barcelos', 'maceio, al',
  'maceio al', 'recife, pe', 'recife pe', 'natal, rn', 'natal rn',
  'curitiba, pr', 'curitiba pr', 'blumenau, sc', 'florianopolis, sc',
  'joao pessoa, pb', 'joão pessoa, pb', 'joao pessoa pb', 'jp',
];

const OUT_OF_SCOPE = [
  /\bobra\b/i,
  /\bfest(?:a|ival)?\b/i,
  /\bfest\s*ver[aã]o\b/i,
  /\bshopping\b/i,
  /\bmall\b/i,
  /\bprefeitura\b/i,
  /\bmetal[uú]rgica\b/i,
  /\bmedicamentos\b/i,
  /^rua\s/i,
];

for (const token of ['marmitaria', 'refeicoes']) STOP_TOKENS.add(token);
if (HARD_CONFLICTS.includes('jp')) HARD_CONFLICTS.splice(HARD_CONFLICTS.indexOf('jp'), 1);
HARD_CONFLICTS.push('bessa', 'manaira', 'tambau', 'ruy carneiro');
OUT_OF_SCOPE.push(/\bairbnb\b/i, /\bimobiliaria\b/i);

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ALIASES = {
  dom: 'sunday',
  domingo: 'sunday',
  sab: 'saturday',
  sabado: 'saturday',
  sábado: 'saturday',
  seg: 'monday',
  segunda: 'monday',
  ter: 'tuesday',
  terca: 'tuesday',
  terça: 'tuesday',
  qua: 'wednesday',
  quarta: 'wednesday',
  qui: 'thursday',
  quinta: 'thursday',
  sex: 'friday',
  sexta: 'friday',
};

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
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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
  if (!first || ['p', 'reel', 'stories', 'explore', 'tv', 'accounts'].includes(first.toLowerCase())) return '';
  return first.toLowerCase();
}

function canonicalInstagram(handle) {
  return handle ? `https://instagram.com/${handle}` : '';
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function nationalPhone(value) {
  let digits = onlyDigits(value);
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

function formatBrazilPhone(digitsValue) {
  let digits = onlyDigits(digitsValue);
  if (digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return '';
}

function extractPhones(text) {
  const phones = new Set();
  const source = clean(text);
  for (const match of source.matchAll(/(?:\+?55\s*)?\(?\b([1-9]{2})\)?[\s.-]*(9?\d{4})\s*[-.]?\s*(\d{4})\b/g)) {
    const formatted = formatBrazilPhone(`${match[1]}${match[2]}${match[3]}`);
    if (formatted) phones.add(formatted);
  }
  for (const match of source.matchAll(/(?:phone=|wa\.me\/|api\.whatsapp\.com\/send\?phone=)(55\d{10,11})/gi)) {
    const formatted = formatBrazilPhone(match[1]);
    if (formatted) phones.add(formatted);
  }
  return [...phones];
}

function profileLinks(profile) {
  const urls = [];
  if (profile?.externalUrl) urls.push(profile.externalUrl);
  if (profile?.externalUrlShimmed) urls.push(profile.externalUrlShimmed);
  for (const entry of profile?.externalUrls || []) {
    if (typeof entry === 'string') urls.push(entry);
    else {
      if (entry?.url) urls.push(entry.url);
      if (entry?.lynx_url) urls.push(entry.lynx_url);
      if (entry?.landingPageUrl) urls.push(entry.landingPageUrl);
    }
  }
  return [...new Set(urls.map(clean).filter(Boolean))];
}

function usefulBioLink(profile) {
  for (const raw of profileLinks(profile)) {
    const url = parseUrl(raw);
    if (!url) continue;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host.includes('instagram.com') || host.includes('facebook.com')) continue;
    return url.toString();
  }
  return '';
}

function distinctiveTokens(name) {
  return normalize(name)
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP_TOKENS.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

function emptyWeek() {
  return Object.fromEntries(DAY_ORDER.map((day) => [day, { isOpen: false, slots: [] }]));
}

function dayKey(value) {
  return DAY_ALIASES[normalize(value).replace(/\s+feira\b/g, '').trim()] || '';
}

function daysBetween(startKey, endKey) {
  const start = DAY_ORDER.indexOf(startKey);
  const end = DAY_ORDER.indexOf(endKey);
  if (start < 0 || end < 0) return [];
  const out = [];
  for (let index = start; ; index = (index + 1) % DAY_ORDER.length) {
    out.push(DAY_ORDER[index]);
    if (index === end) break;
  }
  return out;
}

function normalizeTime(hour, minute = '00') {
  const h = Math.max(0, Math.min(Number(hour) || 0, 23));
  const m = Math.max(0, Math.min(Number(minute) || 0, 59));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeOpeningHoursFromBio(text) {
  const source = normalize(text)
    .replace(/\baberto\s+de\b/g, 'de')
    .replace(/\baberto\b/g, '')
    .replace(/[|;]/g, ' | ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/\d{1,2}\s*(?:h|:)/.test(source)) return null;

  const day = '(dom(?:ingo)?|seg(?:unda)?(?: feira)?|ter(?:ca)?(?: feira)?|qua(?:rta)?(?: feira)?|qui(?:nta)?(?: feira)?|sex(?:ta)?(?: feira)?|sab(?:ado)?)';
  const time = '(\\d{1,2})(?:(?:h|:)(\\d{2}))?\\s*(?:h)?';
  const connector = '(?:a|as|ate|-|–)';
  const rangeRegex = new RegExp(`(?:de\\s+)?${day}\\s*(?:a|ate)\\s*${day}.{0,50}?${time}\\s*${connector}\\s*${time}`, 'i');
  const range = source.match(rangeRegex);
  if (range) {
    const days = daysBetween(dayKey(range[1]), dayKey(range[2]));
    if (days.length) {
      const schedule = emptyWeek();
      const slot = { start: normalizeTime(range[3], range[4] || '00'), end: normalizeTime(range[5], range[6] || '00') };
      for (const key of days) schedule[key] = { isOpen: true, slots: [slot] };
      return { parser: 'instagram_bio_day_range_v1', sourceText: text, opening_hours: schedule };
    }
  }

  const schedule = emptyWeek();
  let seen = false;
  const singleRegex = new RegExp(`${day}.{0,35}?${time}\\s*${connector}\\s*${time}`, 'gi');
  for (const match of source.matchAll(singleRegex)) {
    const key = dayKey(match[1]);
    if (!key) continue;
    schedule[key] = {
      isOpen: true,
      slots: [{ start: normalizeTime(match[2], match[3] || '00'), end: normalizeTime(match[4], match[5] || '00') }],
    };
    seen = true;
  }
  const listedTime = source.match(new RegExp(`${time}\\s*${connector}\\s*${time}`, 'i'));
  if (listedTime) {
    const beforeTime = source.slice(0, listedTime.index);
    const listedDays = [...beforeTime.matchAll(/\b(dom|domingo|seg|segunda|ter|terca|qua|quarta|qui|quinta|sex|sexta|sab|sabado)\b/g)]
      .map((match) => dayKey(match[1]))
      .filter(Boolean);
    const uniqueDays = [...new Set(listedDays)];
    if (uniqueDays.length > 1 || !seen) {
      const slot = {
        start: normalizeTime(listedTime[1], listedTime[2] || '00'),
        end: normalizeTime(listedTime[3], listedTime[4] || '00'),
      };
      for (const key of uniqueDays) schedule[key] = { isOpen: true, slots: [slot] };
      seen = true;
    }
  }
  const hasOpenDay = Object.values(schedule).some((dayValue) => dayValue.isOpen);
  return seen && hasOpenDay ? { parser: 'instagram_bio_single_days_v1', sourceText: text, opening_hours: schedule } : null;
}

async function fetchApifyProfiles(token, usernames) {
  const url = new URL('https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items');
  url.searchParams.set('timeout', '180');
  url.searchParams.set('token', token);
  const body = JSON.stringify({
    usernames,
    resultsLimit: usernames.length,
    addParentData: false,
  });
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const text = await response.text();
    if (response.ok) {
      const data = text ? JSON.parse(text) : [];
      return Array.isArray(data) ? data : [];
    }
    lastError = new Error(`Apify HTTP ${response.status}: ${text.slice(0, 300)}`);
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
  }
  throw lastError;
}

async function fetchRestaurants(supabase, ids) {
  const out = new Map();
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,address,neighborhood,city,state,phone,opening_hours,is_deleted')
      .in('id', chunk);
    if (error) throw error;
    for (const row of data || []) out.set(row.id, row);
  }
  return out;
}

function classify(decision, restaurant, profile) {
  const best = decision.best;
  if (!best?.canonicalUrl) {
    return { status: 'not_found', confidence: 0, reasons: ['no_instagram_profile_candidate'] };
  }

  const urlHandle = instagramHandleFromUrl(best.canonicalUrl);
  const profileHandle = normalize(profile?.username || '');
  const profileFound = Boolean(profile && profileHandle === normalize(urlHandle));
  const profileText = clean([
    profile?.username,
    profile?.fullName,
    profile?.biography,
    profile?.businessCategoryName,
    profileLinks(profile).join(' '),
    best.candidate?.title,
    best.candidate?.snippet,
  ].filter(Boolean).join(' | '));
  const normalizedText = normalize(profileText);
  const candidateText = normalize(`${best.candidate?.title || ''} ${best.candidate?.snippet || ''} ${best.candidate?.link || ''}`);
  const name = restaurant?.google_maps_name || restaurant?.name || decision.restaurantName || '';
  const tokens = distinctiveTokens(name);
  const handleMatches = tokens.filter((token) => normalize(urlHandle).includes(token));
  const profileMatches = tokens.filter((token) => normalizedText.includes(token));
  const weakSingle = tokens.length === 1 && WEAK_SINGLE_TOKENS.has(tokens[0]);
  const brandStrong = handleMatches.length >= 2
    || handleMatches.some((token) => token.length >= 5 && !weakSingle)
    || profileMatches.length >= 2
    || (tokens.length === 1 && tokens[0].length >= 6 && profileMatches.length >= 1 && !weakSingle);

  const phoneCandidates = [
    ...(best.phones || []),
    ...extractPhones(profileText),
  ];
  const existingPhone = nationalPhone(restaurant?.phone || decision.existingPhone || '');
  const phoneExact = Boolean(existingPhone && phoneCandidates.some((phone) => nationalPhone(phone) === existingPhone));
  const phoneDdd83 = phoneCandidates.some((phone) => nationalPhone(phone).startsWith('83'));
  const citySupported = normalizedText.includes(normalize(CITY))
    || candidateText.includes(normalize(CITY))
    || normalizedText.includes(`${normalize(CITY)}/${normalize(STATE)}`)
    || candidateText.includes(`${normalize(CITY)}/${normalize(STATE)}`);
  const neighborhood = normalize(restaurant?.neighborhood || '');
  const neighborhoodSupported = Boolean(neighborhood && neighborhood.length >= 4 && normalizedText.includes(neighborhood));
  const locationSupported = citySupported || neighborhoodSupported || phoneExact || phoneDdd83
    || best.cityConfirmed || best.neighborhoodConfirmed || best.addressConfirmed || (best.locationPhraseMatches || []).length > 0;
  const conflict = HARD_CONFLICTS.find((item) => normalizedText.includes(normalize(item)) || candidateText.includes(normalize(item)));
  const outOfScope = OUT_OF_SCOPE.some((pattern) => pattern.test(`${name} ${restaurant?.category || ''} ${profileText}`));
  const inactive = /\bencerramos?\s+as\s+atividades\b|\bencerrad[ao]\b|\bfechad[ao]\b/i.test(profileText);

  const reasons = [];
  if (!profileFound) reasons.push('apify_profile_not_returned');
  if (!brandStrong) reasons.push('brand_not_confirmed');
  if (weakSingle) reasons.push('weak_single_brand_token');
  if (!locationSupported) reasons.push('no_location_or_phone_support');
  if (conflict) reasons.push(`location_conflict:${conflict}`);
  if (outOfScope) reasons.push('out_of_scope_name_or_category');
  if (inactive) reasons.push('profile_indicates_closed_or_inactive');

  let confidence = Math.min(99, Math.max(0, Number(best.score || 0)));
  if (profileFound) confidence += 8;
  if (brandStrong) confidence += 16;
  if (citySupported || neighborhoodSupported) confidence += 18;
  if (phoneExact) confidence += 30;
  else if (phoneDdd83) confidence += 8;
  if (conflict) confidence -= 90;
  if (outOfScope) confidence -= 80;
  if (inactive) confidence -= 80;
  if (weakSingle) confidence -= 25;
  confidence = Math.max(0, Math.min(100, confidence));

  const status = reasons.length === 0 && confidence >= 85 ? 'secure' : 'insecure';
  return {
    status,
    confidence,
    reasons,
    evidence: {
      tokens,
      handleMatches,
      profileMatches,
      citySupported,
      neighborhoodSupported,
      phoneExact,
      phoneDdd83,
      conflict: conflict || null,
    },
  };
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const env = readEnv();
if (!env.APIFY_TOKEN) throw new Error('APIFY_TOKEN ausente no .env');

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

fs.mkdirSync(OUT_DIR, { recursive: true });
if (!APPLY_DIR) throw new Error(`Nenhum instagram-apply-* encontrado em scratch/${SEARCH_PROVIDER}-menu-discovery.`);
const decisions = JSON.parse(fs.readFileSync(path.join(APPLY_DIR, 'decisions.json'), 'utf8'));
const candidates = decisions.filter((item) => item.best?.canonicalUrl);
const ids = [...new Set(decisions.map((item) => item.restaurantId).filter(Boolean))];
const restaurantById = await fetchRestaurants(supabase, ids);

const usernames = [...new Set(candidates.map((item) => instagramHandleFromUrl(item.best.canonicalUrl)).filter(Boolean))];
const profiles = [];
for (let index = 0; index < usernames.length; index += BATCH_SIZE) {
  const batch = usernames.slice(index, index + BATCH_SIZE);
  console.log(`Apify batch ${index + 1}-${index + batch.length}/${usernames.length}: ${batch.join(', ')}`);
  profiles.push(...await fetchApifyProfiles(env.APIFY_TOKEN, batch));
}

const profileByUsername = new Map(profiles.map((profile) => [normalize(profile.username || ''), profile]));
const items = decisions.map((decision) => {
  const handle = instagramHandleFromUrl(decision.best?.canonicalUrl || decision.best?.candidate?.link || '');
  const profile = profileByUsername.get(normalize(handle));
  const restaurant = restaurantById.get(decision.restaurantId);
  const classification = classify(decision, restaurant, profile);
  const biography = clean(profile?.biography || '');
  const phones = [...new Set([
    ...(decision.best?.phones || []),
    ...extractPhones([
      biography,
      profile?.externalUrl,
      profile?.externalUrlShimmed,
      profileLinks(profile).join(' '),
    ].filter(Boolean).join(' ')),
  ])];
  const bioHours = normalizeOpeningHoursFromBio(biography);
  return {
    id: decision.restaurantId,
    name: decision.restaurantName,
    category: decision.restaurantCategory,
    instagram: handle ? canonicalInstagram(handle) : null,
    status: classification.status,
    confidence: classification.confidence,
    reasons: classification.reasons,
    evidence: classification.evidence || null,
    serpapiScore: decision.best?.score ?? null,
    serpapiTitle: decision.best?.candidate?.title || null,
    serpapiSnippet: decision.best?.candidate?.snippet || null,
    followers: Number(profile?.followersCount || 0) || null,
    bio: biography || null,
    bioPhone: phones[0] || null,
    bioPhones: phones,
    bioOpeningHoursText: bioHours?.sourceText || null,
    opening_hours: bioHours?.opening_hours || null,
    bioLink: usefulBioLink(profile) || null,
    apifyProfileFound: Boolean(profile),
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  city: CITY,
  state: STATE,
  searchProvider: SEARCH_PROVIDER,
  applyDir: APPLY_DIR,
  processed: decisions.length,
  withInstagramCandidate: items.filter((item) => item.instagram).length,
  secure: items.filter((item) => item.status === 'secure').length,
  insecure: items.filter((item) => item.status === 'insecure').length,
  notFound: items.filter((item) => item.status === 'not_found').length,
  apifyProfilesFetched: profiles.length,
  outDir: OUT_DIR,
  secureItems: items.filter((item) => item.status === 'secure').map((item) => ({
    name: item.name,
    instagram: item.instagram,
    followers: item.followers,
    bioPhone: item.bioPhone,
    bioLink: item.bioLink,
    bioOpeningHoursText: item.bioOpeningHoursText,
    confidence: item.confidence,
  })),
  falsePositiveExamples: items
    .filter((item) => item.status !== 'secure')
    .filter((item) => item.reasons.some((reason) => /brand_not_confirmed|location_conflict|out_of_scope|phone_area/.test(reason)))
    .slice(0, 20)
    .map((item) => ({
      name: item.name,
      candidate: item.instagram,
      title: item.serpapiTitle,
      reason: item.reasons.join(','),
    })),
};

const headers = [
  'status', 'confidence', 'name', 'instagram', 'followers', 'bio', 'bioPhone',
  'bioOpeningHoursText', 'bioLink', 'reasons', 'serpapiScore', 'serpapiTitle',
];
const csv = [
  headers.join(';'),
  ...items.map((item) => headers.map((header) => csvEscape(
    header === 'reasons' ? item.reasons : item[header],
  )).join(';')),
].join('\n');

fs.writeFileSync(path.join(OUT_DIR, 'items.json'), JSON.stringify(items, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'items.csv'), csv, 'utf8');
console.log(JSON.stringify(summary, null, 2));
