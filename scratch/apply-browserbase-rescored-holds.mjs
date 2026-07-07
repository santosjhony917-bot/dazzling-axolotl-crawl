import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};

const REVIEW = argValue('--review', '');
const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
if (!REVIEW) throw new Error('Use --review=path/to/browserbase/review.json');

const STOP = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no',
  'cabedelo', 'pb', 'paraiba', 'brasil', 'restaurante', 'bar', 'lanchonete',
  'pizzaria', 'pizza', 'hamburgueria', 'burger', 'cafeteria', 'bistro',
  'delivery', 'pedido', 'cardapio', 'cardápio', 'menu', 'oficial', 'online',
  'loja', 'unidade', 'sushi', 'temaki', 'temakeria', 'acai', 'açai',
  'sorveteria', 'churrascaria', 'galeteria', 'tapiocaria', 'pastelaria',
  'espetinho', 'lanches', 'lanche', 'comida',
]);

const LOCATION_MARKERS = [
  'cabedelo',
  'ponta de campina',
  'intermares',
  'camboinha',
  'jacare',
  'jacaré',
  'praia formosa',
  'recanto do poço',
  'recanto do poco',
];

const CONFLICTS = [
  'rio de janeiro', 'sao goncalo', 'são gonçalo', 'cassino/rs', 'cassino rs',
  'viamao', 'viamão', 'tambaú', 'tambau', 'ruy carneiro', 'caico, rn',
  'recife, pe', 'natal, rn', 'sao paulo', 'curitiba',
];

const OUT_OF_SCOPE = [
  /\bpadaria\b/i,
  /\bp[aã]o\b/i,
  /\bbolos?\b/i,
  /\btortas?\b/i,
  /\bdoceria\b/i,
  /\barquitetura\b/i,
  /\bprefeitura\b/i,
  /\bsecult\b/i,
  /\bmarina\b/i,
  /\bfest(?:a|ival)?\b/i,
  /\bshopping\b/i,
  /\bmall\b/i,
];

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

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

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
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

function handleFromUrl(value) {
  const url = parseUrl(value);
  if (!url || !url.hostname.toLowerCase().includes('instagram.com')) return '';
  return (url.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
}

function tokens(name) {
  return normalize(name)
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP.has(token));
}

function formatPhone(digitsValue) {
  let digits = String(digitsValue || '').replace(/\D/g, '');
  if (digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return '';
}

function extractPhones(text) {
  const phones = new Set();
  for (const match of clean(text).matchAll(/(?:\+?55\s*)?\(?\b([1-9]{2})\)?[\s.-]*(9?\d{4})\s*[-.]?\s*(\d{4})\b/g)) {
    const formatted = formatPhone(`${match[1]}${match[2]}${match[3]}`);
    if (formatted) phones.add(formatted);
  }
  return [...phones];
}

function socialNetworksWithInstagram(current, url, metadata) {
  const list = Array.isArray(current) ? current : [];
  return [
    ...list.filter((item) => item?.platform !== 'instagram'),
    {
      platform: 'instagram',
      url,
      source: 'browserbase_rescored_hold_review',
      confidence: metadata.score,
      collected_at: new Date().toISOString(),
      title: metadata.title,
    },
  ];
}

const payload = JSON.parse(fs.readFileSync(REVIEW, 'utf8'));
const candidates = (payload.results || []).map((item) => {
  const evidence = clean(item.best?.evidenceSample || '');
  const text = normalize(evidence);
  const handle = normalize(handleFromUrl(item.instagramCandidate || item.best?.url || ''));
  const nameTokens = tokens(item.name);
  const handleMatches = nameTokens.filter((token) => handle.includes(token));
  const textMatches = nameTokens.filter((token) => text.includes(token));
  const locationMatches = LOCATION_MARKERS.filter((marker) => text.includes(normalize(marker)));
  const conflictMatches = CONFLICTS.filter((marker) => text.includes(normalize(marker)));
  const phones = extractPhones(evidence);
  const ddd83 = phones.some((phone) => phone.replace(/\D/g, '').startsWith('83'));
  const outOfScope = OUT_OF_SCOPE.some((pattern) => pattern.test(evidence));
  const strongBrand = handleMatches.length >= 1 || textMatches.length >= 2;
  const handleSupportedBrand = handleMatches.length >= 1;
  let score = 40 + handleMatches.length * 30 + Math.min(24, textMatches.length * 8);
  if (locationMatches.length) score += 35;
  if (ddd83) score += 20;
  if (!strongBrand) score -= 50;
  if (conflictMatches.length) score -= 100;
  if (outOfScope) score -= 100;
  const approve = item.status === 'hold'
    && score >= 100
    && strongBrand
    && handleSupportedBrand
    && (locationMatches.length || ddd83)
    && !conflictMatches.length
    && !outOfScope;
  return {
    ...item,
    rescore: {
      approve,
      score,
      handleMatches,
      textMatches,
      locationMatches,
      conflictMatches,
      phones,
      ddd83,
      outOfScope,
    },
  };
}).filter((item) => item.rescore.approve);

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const applied = [];
const skipped = [];
const failures = [];

for (const item of candidates) {
  const { data: row, error: selectError } = await supabase
    .from('restaurants')
    .select('id,name,city,state,instagram,social_networks,coleta_logs,is_deleted')
    .eq('id', item.id)
    .maybeSingle();
  if (selectError) {
    failures.push({ id: item.id, name: item.name, error: selectError.message });
    continue;
  }
  if (!row || row.is_deleted || row.city !== CITY || row.state !== STATE) {
    skipped.push({ id: item.id, name: item.name, reason: 'not_active_city_row' });
    continue;
  }
  if (clean(row.instagram)) {
    skipped.push({ id: item.id, name: row.name, reason: 'already_has_instagram', instagram: row.instagram });
    continue;
  }
  const url = item.best?.url || item.instagramCandidate;
  const update = {
    instagram: url,
    social_networks: socialNetworksWithInstagram(row.social_networks, url, {
      score: item.rescore.score,
      title: item.best?.pageTitle || item.title || '',
    }),
    coleta_logs: mergeLogs(row.coleta_logs, {
      browserbase_instagram_hold_rescore: {
        appliedAt: new Date().toISOString(),
        sourceReview: REVIEW,
        instagram: url,
        score: item.rescore.score,
        evidenceSample: item.best?.evidenceSample || '',
        locationMatches: item.rescore.locationMatches,
        phones: item.rescore.phones,
      },
    }),
  };
  const { error } = await supabase
    .from('restaurants')
    .update(update)
    .eq('id', row.id)
    .eq('city', CITY)
    .eq('state', STATE);
  if (error) failures.push({ id: row.id, name: row.name, error: error.message });
  else applied.push({ id: row.id, name: row.name, instagram: url, score: item.rescore.score });
}

console.log(JSON.stringify({
  review: REVIEW,
  candidates: candidates.map((item) => ({
    id: item.id,
    name: item.name,
    instagram: item.best?.url || item.instagramCandidate,
    score: item.rescore.score,
    locationMatches: item.rescore.locationMatches,
    phones: item.rescore.phones,
  })),
  applied,
  skipped,
  failures,
}, null, 2));
