import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const SITE = argValue('--site', 'instagram');
const DIRECT_URL = argValue('--url', '');
const CONTEXT_ID = argValue('--context-id', '');
const CREATE_CONTEXT = hasFlag('--create-context');
const STATE_FILE = path.join('scratch', 'browserbase-auth-contexts.json');
const OUT_DIR = path.join('scratch', 'browserbase-auth-context');
const KEEP_ALIVE = !hasFlag('--no-keep-alive');

const SITE_URLS = {
  instagram: 'https://www.instagram.com/',
  google: 'https://www.google.com/',
  whatsapp: 'https://web.whatsapp.com/',
};

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

function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function browserbaseFetch(apiKey, endpoint, options = {}) {
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
  if (!response.ok) {
    throw new Error(`Browserbase ${endpoint} HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return payload;
}

async function createContext(apiKey) {
  return await browserbaseFetch(apiKey, 'contexts', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

async function createSession(apiKey, env, contextId) {
  const body = {
    keepAlive: KEEP_ALIVE,
    browserSettings: {
      viewport: {
        width: Number(argValue('--width', '1440')) || 1440,
        height: Number(argValue('--height', '1000')) || 1000,
      },
      context: {
        id: contextId,
        persist: true,
      },
    },
    userMetadata: {
      purpose: `filterfood-${SITE}-login`,
      site: SITE,
      createdBy: 'codex',
    },
  };
  if (env.BROWSERBASE_PROJECT_ID) body.projectId = env.BROWSERBASE_PROJECT_ID;
  if (env.BROWSERBASE_REGION) body.region = env.BROWSERBASE_REGION;
  if (env.BROWSERBASE_PROXY === 'true') body.proxies = true;
  return await browserbaseFetch(apiKey, 'sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function debugUrls(apiKey, sessionId) {
  return await browserbaseFetch(apiKey, `sessions/${encodeURIComponent(sessionId)}/debug`, {
    method: 'GET',
  });
}

async function navigateSession(connectUrl, url) {
  const browser = await puppeteer.connect({ browserWSEndpoint: connectUrl });
  try {
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } finally {
    browser.disconnect();
  }
}

const env = readEnv();
if (!env.BROWSERBASE_API_KEY) throw new Error('BROWSERBASE_API_KEY ausente no .env.');

fs.mkdirSync(OUT_DIR, { recursive: true });

const state = readState();
let contextId = CONTEXT_ID || state.contexts?.[SITE]?.contextId || '';
let createdContext = null;
if (CREATE_CONTEXT || !contextId) {
  createdContext = await createContext(env.BROWSERBASE_API_KEY);
  contextId = createdContext.id;
  if (!contextId) throw new Error(`Browserbase nao retornou context id: ${JSON.stringify(createdContext)}`);
}

const targetUrl = DIRECT_URL || SITE_URLS[SITE] || SITE;
const session = await createSession(env.BROWSERBASE_API_KEY, env, contextId);
const connectUrl = session.connectUrl || session.connect_url || session.browserWSEndpoint || session.wsEndpoint;
if (!session.id || !connectUrl) {
  throw new Error(`Browserbase criou sessao sem id/connectUrl: ${JSON.stringify({ keys: Object.keys(session), id: session.id || null })}`);
}

await navigateSession(connectUrl, targetUrl);
const debug = await debugUrls(env.BROWSERBASE_API_KEY, session.id);

state.contexts[SITE] = {
  contextId,
  site: SITE,
  lastSessionId: session.id,
  lastSessionUrl: `https://browserbase.com/sessions/${session.id}`,
  lastLiveViewUrl: debug.debuggerFullscreenUrl || debug.debuggerUrl || null,
  updatedAt: new Date().toISOString(),
};
writeState(state);

const result = {
  success: true,
  site: SITE,
  targetUrl,
  contextId,
  createdContext: Boolean(createdContext),
  sessionId: session.id,
  dashboardUrl: `https://browserbase.com/sessions/${session.id}`,
  liveViewUrl: debug.debuggerFullscreenUrl || debug.debuggerUrl || null,
  keepAlive: KEEP_ALIVE,
  stateFile: STATE_FILE,
  nextStep: 'Abra o liveViewUrl, faca login e me avise quando terminar. Depois feche a sessao pelo dashboard ou me peca para continuar usando esse contexto.',
};

const outPath = path.join(OUT_DIR, `${SITE}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
