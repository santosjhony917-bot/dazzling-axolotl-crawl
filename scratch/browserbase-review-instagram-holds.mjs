import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
const QUEUE_FILE = argValue('--queue', path.join('scratch', 'cabedelo-instagram-browserbase-review', 'hold-queue.json'));
const LIMIT = Number(argValue('--limit', '0')) || 0;
const CONCURRENCY = Math.max(1, Math.min(Number(argValue('--concurrency', '12')) || 12, 25));
const APPLY = hasFlag('--apply');
const KEEP_SESSIONS = hasFlag('--keep-sessions');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'cabedelo-instagram-browserbase-review', RUN_ID);
const STATE_FILE = path.join('scratch', 'browserbase-auth-contexts.json');

const STOP_TOKENS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no',
  'cabedelo', 'pb', 'paraiba', 'brasil', 'intermares', 'ponta', 'campina',
  'centro', 'poco', 'poço', 'camboinha', 'jacare', 'jacaré', 'renascer',
  'formosa', 'vila', 'sao', 'são', 'joao', 'joão', 'areia', 'dourada',
  'praia', 'beach', 'restaurante', 'restaurant', 'bar', 'lanchonete',
  'pizzaria', 'pizza', 'hamburgueria', 'burger', 'cafeteria', 'bistro',
  'delivery', 'pedido', 'cardapio', 'cardápio', 'menu', 'oficial', 'online',
  'loja', 'unidade', 'sushi', 'temaki', 'temakeria', 'acai', 'açai',
  'acaiteria', 'sorveteria', 'gelato', 'churrascaria', 'galeteria',
  'tapiocaria', 'pastel', 'pastelaria', 'espetinho', 'lanches', 'lanche',
  'massas', 'pizzas', 'caldinho', 'comida', 'rua', 'lote', 'express',
  'premium', 'gourmet', 'self', 'service',
]);

const HARD_CONFLICTS = [
  'sao paulo', 'rio de janeiro', 'recife', 'natal', 'fortaleza', 'maceio',
  'salvador', 'brasilia', 'curitiba', 'caico', 'manaus', 'viamao', 'viamão',
  'blumenau', 'florianopolis', 'florianópolis', 'campinas', 'sao goncalo',
  'são gonçalo', 'cassino/rs', 'cassino rs', 'meier', 'méier', 'jacarepagua',
  'jacarepaguá', 'tambau', 'tambaú', 'ruy carneiro',
];

const CABEDELO_LOCATION_MARKERS = [
  'ponta de campina',
  'intermares',
  'camboinha',
  'jacare',
  'jacaré',
  'praia formosa',
  'formosa',
  'poco',
  'poço',
  'recanto do poco',
  'recanto do poço',
  'cabedelo',
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
  /\bdefesa\s+civil\b/i,
  /\bmarina\b/i,
  /\bfest(?:a|ival)?\b/i,
  /\bshopping\b/i,
  /\bmall\b/i,
];

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

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

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { contexts: {} };
  }
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

function instagramHandle(value) {
  const url = parseUrl(value);
  if (!url || !url.hostname.toLowerCase().includes('instagram.com')) return '';
  const first = url.pathname.split('/').filter(Boolean)[0] || '';
  if (!first || ['p', 'reel', 'stories', 'explore', 'tv'].includes(first.toLowerCase())) return '';
  return first.toLowerCase();
}

function canonicalInstagram(value) {
  const handle = instagramHandle(value);
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

function nationalPhone(value) {
  let digits = onlyDigits(value);
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

function formatPhone(digitsValue) {
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
    const formatted = formatPhone(`${match[1]}${match[2]}${match[3]}`);
    if (formatted) phones.add(formatted);
  }
  for (const match of source.matchAll(/(?:phone=|wa\.me\/|api\.whatsapp\.com\/send\?phone=)(55\d{10,11})/gi)) {
    const formatted = formatPhone(match[1]);
    if (formatted) phones.add(formatted);
  }
  return [...phones];
}

function locationPhrases(row = {}) {
  const phrases = new Set();
  const roadWords = new Set(['r', 'rua', 'av', 'avenida', 'travessa', 'tv', 'praca', 'praça', 'rodovia', 'br', 'estrada', 'lote', 'loja', 'numero']);
  for (const raw of [row.neighborhood, row.address].filter(Boolean)) {
    const tokens = normalize(raw)
      .replace(/[.,;:()]/g, ' ')
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z0-9]/g, ''))
      .filter((token) => token.length >= 3)
      .filter((token) => !roadWords.has(token))
      .filter((token) => token !== normalize(CITY) && !STOP_TOKENS.has(token));
    if (tokens.length >= 2) phrases.add(tokens.join(' '));
    for (let index = 0; index < tokens.length - 1; index += 1) {
      phrases.add(`${tokens[index]} ${tokens[index + 1]}`);
    }
  }
  return [...phrases].filter((phrase) => phrase.length >= 7);
}

async function browserbaseFetch(apiKey, endpoint, options = {}) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`https://api.browserbase.com/v1/${endpoint}`, {
      ...options,
      headers: {
        'x-bb-api-key': apiKey,
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }
    if (response.ok) return payload;
    if (response.status === 429 && attempt < 4) {
      const waitMatch = String(payload.message || '').match(/in\s+(\d+)\s+seconds/i);
      const waitMs = waitMatch ? (Number(waitMatch[1]) + 2) * 1000 : 30000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }
    throw new Error(`Browserbase ${endpoint} HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  }
  throw new Error(`Browserbase ${endpoint} failed after retries`);
}

async function createSession(env, contextId, workerIndex) {
  const body = {
    keepAlive: false,
    browserSettings: {
      viewport: { width: 1440, height: 1000 },
    },
    userMetadata: {
      purpose: 'filterfood-instagram-hold-review',
      workerIndex: String(workerIndex),
      createdBy: 'codex',
    },
  };
  if (contextId) {
    body.browserSettings.context = { id: contextId, persist: true };
  }
  if (env.BROWSERBASE_PROJECT_ID) body.projectId = env.BROWSERBASE_PROJECT_ID;
  if (env.BROWSERBASE_REGION) body.region = env.BROWSERBASE_REGION;
  if (env.BROWSERBASE_PROXY === 'true') body.proxies = true;
  const session = await browserbaseFetch(env.BROWSERBASE_API_KEY, 'sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const connectUrl = session.connectUrl || session.connect_url || session.browserWSEndpoint || session.wsEndpoint;
  if (!session.id || !connectUrl) throw new Error(`Sessao Browserbase sem id/connectUrl: ${JSON.stringify(Object.keys(session))}`);
  return { session, connectUrl };
}

async function releaseSession(env, sessionId) {
  if (!sessionId || KEEP_SESSIONS) return;
  try {
    await browserbaseFetch(env.BROWSERBASE_API_KEY, `sessions/${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'REQUEST_RELEASE' }),
    });
  } catch (_) {}
}

async function extractInstagramPage(page, url) {
  const target = `${url.replace(/\/$/, '')}/?hl=pt-br`;
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 5000));
  try {
    await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('button, span, div, a'));
      const more = nodes.find((node) => /^(mais|more)$/i.test(String(node.textContent || '').trim()));
      if (more) more.click();
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));
  } catch (_) {}
  return await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const metas = Array.from(document.querySelectorAll('meta')).map((meta) => ({
      property: meta.getAttribute('property') || meta.getAttribute('name') || '',
      content: clean(meta.getAttribute('content') || ''),
    })).filter((meta) => meta.content);
    const anchors = Array.from(document.querySelectorAll('a[href]')).slice(0, 80).map((anchor) => ({
      text: clean(anchor.textContent || ''),
      href: anchor.href,
    }));
    return {
      url: location.href,
      title: document.title,
      bodyText: clean(document.body?.innerText || '').slice(0, 12000),
      metas,
      anchors,
    };
  });
}

function scoreEvidence(item, row, pageData) {
  const evidence = clean([
    item.title,
    item.evidenceSample,
    pageData.title,
    pageData.bodyText,
    (pageData.metas || []).map((meta) => meta.content).join(' '),
    (pageData.anchors || []).map((anchor) => `${anchor.text} ${anchor.href}`).join(' '),
  ].join(' '));
  const text = normalize(evidence);
  const handle = normalize(instagramHandle(item.instagramCandidate));
  const tokens = distinctiveTokens(row.name || item.name);
  const handleMatches = tokens.filter((token) => handle.includes(token));
  const textMatches = tokens.filter((token) => text.includes(token));
  const cityConfirmed = text.includes(normalize(CITY));
  const stateConfirmed = text.includes(normalize(STATE));
  let neighborhood = normalize(row.neighborhood || item.neighborhood || '');
  if (neighborhood === normalize(CITY) || STOP_TOKENS.has(neighborhood)) neighborhood = '';
  const neighborhoodConfirmed = Boolean(neighborhood && text.includes(neighborhood));
  const phrases = locationPhrases(row);
  const phraseMatches = phrases.filter((phrase) => text.includes(phrase));
  const phones = extractPhones(evidence);
  const existingPhone = nationalPhone(row.phone || '');
  const exactPhone = Boolean(existingPhone && phones.some((phone) => nationalPhone(phone) === existingPhone));
  const ddd83 = phones.some((phone) => nationalPhone(phone).startsWith('83'));
  const conflicts = HARD_CONFLICTS.filter((pattern) => text.includes(normalize(pattern)));
  const cityMarkerMatches = CABEDELO_LOCATION_MARKERS.filter((pattern) => text.includes(normalize(pattern)));
  const outOfScope = OUT_OF_SCOPE.some((pattern) => pattern.test(evidence));
  const strongBrand = handleMatches.length >= 1 || textMatches.length >= 2;
  const locationSupported = cityConfirmed || stateConfirmed || neighborhoodConfirmed || phraseMatches.length > 0 || cityMarkerMatches.length > 0 || exactPhone || ddd83;

  let score = 40;
  score += handleMatches.length * 34;
  score += Math.min(24, textMatches.length * 8);
  if (cityConfirmed) score += 24;
  if (stateConfirmed) score += 8;
  if (neighborhoodConfirmed) score += 18;
  if (phraseMatches.length) score += 18;
  if (cityMarkerMatches.length) score += 22;
  if (exactPhone) score += 42;
  else if (ddd83) score += 10;
  if (!strongBrand) score -= 55;
  if (!locationSupported) score -= 35;
  if (conflicts.length && !cityConfirmed && !exactPhone) score -= 100;
  if (outOfScope) score -= 100;
  if (/login|entrar|sign up|log in/i.test(pageData.bodyText || '') && (pageData.bodyText || '').length < 900) score -= 25;

  const approved = score >= 100
    && strongBrand
    && locationSupported
    && !outOfScope
    && !(conflicts.length && !cityConfirmed && !exactPhone);
  const rejected = outOfScope || (conflicts.length && !cityConfirmed && !exactPhone) || score < 45;
  return {
    status: approved ? 'approve' : rejected ? 'reject' : 'hold',
    score,
    url: canonicalInstagram(item.instagramCandidate),
    handle,
    tokens,
    handleMatches,
    textMatches,
    cityConfirmed,
    stateConfirmed,
    neighborhoodConfirmed,
    phraseMatches,
    cityMarkerMatches,
    phones,
    exactPhone,
    ddd83,
    conflicts,
    outOfScope,
    evidenceSample: evidence.slice(0, 1600),
    pageUrl: pageData.url,
    pageTitle: pageData.title,
  };
}

async function fetchRows(supabase, ids) {
  const out = new Map();
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,category,neighborhood,address,city,state,phone,instagram,social_networks,coleta_logs,is_deleted')
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
      source: 'browserbase_instagram_hold_review',
      confidence: metadata.score,
      collected_at: new Date().toISOString(),
      title: metadata.title,
    },
  ];
}

async function applyApproval(supabase, item, row) {
  const update = {
    instagram: item.best.url,
    social_networks: socialNetworksWithInstagram(row.social_networks, item.best.url, {
      score: item.best.score,
      title: item.best.pageTitle,
    }),
    coleta_logs: mergeLogs(row.coleta_logs, {
      browserbase_instagram_hold_review: {
        appliedAt: new Date().toISOString(),
        instagram: item.best.url,
        score: item.best.score,
        pageTitle: item.best.pageTitle,
        pageUrl: item.best.pageUrl,
        evidenceSample: item.best.evidenceSample,
        sourceQueue: QUEUE_FILE,
      },
    }),
  };
  const { error } = await supabase
    .from('restaurants')
    .update(update)
    .eq('id', row.id)
    .eq('city', CITY)
    .eq('state', STATE);
  if (error) throw error;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const env = readEnv();
  if (!env.BROWSERBASE_API_KEY) throw new Error('BROWSERBASE_API_KEY ausente no .env.');
  const state = readState();
  const contextId = state.contexts?.instagram?.contextId || '';
  const queuePayload = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  const queue = (queuePayload.items || [])
    .filter((item) => item.instagramCandidate && canonicalInstagram(item.instagramCandidate))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, LIMIT || undefined);

  const supabase = createClient(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const rowById = await fetchRows(supabase, queue.map((item) => item.id));
  const targets = queue.filter((item) => {
    const row = rowById.get(item.id);
    return row && !row.is_deleted && !clean(row.instagram) && row.city === CITY && row.state === STATE;
  });

  let cursor = 0;
  const results = [];
  const applied = [];
  const failures = [];
  const workerCount = Math.min(CONCURRENCY, targets.length);

  async function worker(workerIndex) {
    let sessionInfo = null;
    let browser = null;
    try {
      sessionInfo = await createSession(env, contextId, workerIndex);
      browser = await puppeteer.connect({ browserWSEndpoint: sessionInfo.connectUrl });
      const page = (await browser.pages())[0] || await browser.newPage();
      page.setDefaultNavigationTimeout(45000);
      while (cursor < targets.length) {
        const item = targets[cursor++];
        const row = rowById.get(item.id);
        try {
          const pageData = await extractInstagramPage(page, item.instagramCandidate);
          const best = scoreEvidence(item, row, pageData);
          const result = { ...item, rowName: row.name, status: best.status, best, sessionId: sessionInfo.session.id };
          results.push(result);
          fs.writeFileSync(path.join(OUT_DIR, `${item.id}.json`), JSON.stringify(result, null, 2), 'utf8');
          if (APPLY && best.status === 'approve') {
            await applyApproval(supabase, result, row);
            applied.push({ id: item.id, name: row.name, instagram: best.url, score: best.score });
          }
          console.log(`${results.length}/${targets.length} ${best.status.padEnd(7)} ${row.name} ${best.url} ${best.score}`);
        } catch (error) {
          const failure = { id: item.id, name: item.name, error: error.message || String(error), sessionId: sessionInfo.session.id };
          failures.push(failure);
          results.push({ ...item, status: 'error', error: failure.error });
          console.log(`${results.length}/${targets.length} error   ${item.name} ${failure.error}`);
        }
      }
    } finally {
      try {
        if (browser) browser.disconnect();
      } catch (_) {}
      if (sessionInfo) await releaseSession(env, sessionInfo.session.id);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, (_, index) => worker(index + 1)));

  const summary = {
    generatedAt: new Date().toISOString(),
    apply: APPLY,
    city: CITY,
    state: STATE,
    queueFile: QUEUE_FILE,
    outDir: OUT_DIR,
    requested: queue.length,
    processed: results.length,
    concurrency: workerCount,
    contextId: contextId || null,
    counts: results.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}),
    applied,
    failures,
    approved: results.filter((item) => item.status === 'approve').map((item) => ({
      id: item.id,
      name: item.name,
      instagram: item.best.url,
      score: item.best.score,
      evidence: item.best.evidenceSample.slice(0, 300),
    })),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'review.json'), JSON.stringify({ summary, results }, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

await main();
