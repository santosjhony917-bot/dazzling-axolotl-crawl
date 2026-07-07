import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import vm from 'node:vm';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

function loadPlatformAdapters() {
  const adapterPath = path.join(process.cwd(), 'public', 'chrome-extension', 'platform-adapters.js');
  const source = fs.readFileSync(adapterPath, 'utf8');
  const context = vm.createContext({
    console,
    fetch,
    URL,
    setTimeout,
    clearTimeout,
    globalThis: {},
  });
  vm.runInContext(source, context, { filename: adapterPath });
  const adapters = context.globalThis.FilterFoodPlatformAdapters;
  if (!adapters?.normalizeAnotaNetworkMenu || !adapters?.countAnotaMenuStats) {
    throw new Error('Adaptador da extensao carregou sem normalizadores AnotaAI.');
  }
  return adapters;
}

const PlatformAdapters = loadPlatformAdapters();

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const RUN_ID = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const OUT_DIR = path.join('scratch', 'structured-menu-collection', RUN_ID);
const PLATFORM = argValue('--platform', 'cardapioweb');
const LIMIT = Math.max(1, Math.min(Number(argValue('--limit', '5')) || 5, 100));
const QUEUE_FILE = argValue('--queue-file', '');
const IDS_FILE = argValue('--ids-file', '');
const ONLY_ID = argValue('--id', '');
const APPLY = hasFlag('--apply');
const CONCURRENCY = Math.max(1, Math.min(Number(argValue('--concurrency', '2')) || 2, 8));
const TIMEOUT_MS = Math.max(30000, Math.min(Number(argValue('--timeout-ms', '90000')) || 90000, 240000));
const KEEP_BROWSERBASE_SESSION = hasFlag('--keep-session');

fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalize = (value) => clean(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();
const finiteNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

const OPERATIONAL_RE = /\b(ketchup|catchup|talher|talheres|guardanapo|descartavel|descartaveis|sacola|embalagem|cpf|troco|canudo|colher|garfo|faca|palito|copo descartavel|prato descartavel)\b/i;
const OPERATIONAL_STANDALONE_RE = /^(embalagens?|sacolas?|talheres?|guardanapos?|descartaveis?|canudos?|palitos?|cpf|troco|ketchup|catchup)$/i;
const INSTRUCTIONAL_COMBO_TITLE_RE = /\b(transforme|transformar|turbine|turbinar|upgrade|complete|completar)\b.{0,90}\b(lanche|combo|pedido|hamburguer|burger|sanduiche)\b/i;

function looksLikeInstructionalComboTitle(option, group, siblings = []) {
  const optionName = clean(option?.name || option?.title);
  if (!optionName || !INSTRUCTIONAL_COMBO_TITLE_RE.test(optionName)) return false;

  const groupName = clean(group?.name || group?.title || '');
  const hasRealSibling = siblings.some((sibling) => {
    const siblingName = clean(sibling?.name || sibling?.title);
    return siblingName && siblingName !== optionName && !INSTRUCTIONAL_COMBO_TITLE_RE.test(siblingName);
  });
  const context = normalize(`${groupName} ${optionName}`);
  return hasRealSibling || /\b(adicion|opcion|combo|turbine|transforme|upgrade)\b/.test(context);
}

function looksLikeOperationalMenuEntity(value) {
  const key = normalize(value || '');
  if (!key) return false;
  return OPERATIONAL_STANDALONE_RE.test(key)
    || /^(copo descartavel|prato descartavel|kit talher|kit talheres|sache ketchup|sache catchup)$/.test(key);
}

function looksLikeOperationalMenuItem(item) {
  const name = clean(item?.name || item?.title);
  if (!looksLikeOperationalMenuEntity(name)) return false;
  const price = money(item?.price ?? item?.display_price ?? item?.price_min);
  const description = normalize(item?.description || '');
  const hasFoodContext = /\b(bacon|queijo|carne|frango|pizza|burger|hamburguer|batata|maionese|molho|cebola|ovo|cheddar)\b/.test(`${normalize(name)} ${description}`);
  return !hasFoodContext || price == null || price <= 5;
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

function safeSlug(value) {
  return normalize(value || 'target')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'target';
}

function latestQueueFile() {
  const root = path.join('scratch', 'menu-collection-queue');
  if (!fs.existsSync(root)) return '';
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name, 'queue.json'))
    .filter((file) => fs.existsSync(file))
    .sort()
    .pop() || '';
}

function platformOf(url) {
  const lower = String(url || '').toLowerCase();
  if (lower.includes('ifood.com')) return 'ifood';
  if (lower.includes('cardapioweb')) return 'cardapioweb';
  if (lower.includes('anota.ai')) return 'anota_ai';
  if (lower.includes('restaurantlogin.com') || lower.includes('saborvip') || lower.includes('pizzariabomsaborpb.com.br')) return 'restaurantlogin';
  if (lower.includes('instadelivery')) return 'instadelivery';
  if (lower.includes('brendi')) return 'brendi';
  if (lower.includes('cardapiodigital')) return 'cardapiodigital';
  if (lower.includes('saipos')) return 'saipos';
  if (lower.includes('ola.click') || lower.includes('olaclick')) return 'olaclick';
  if (lower.includes('goomer')) return 'goomer';
  if (lower.includes('deliverydireto')) return 'deliverydireto';
  if (lower.includes('deliverymuch')) return 'deliverymuch';
  if (lower.includes('menudino')) return 'menudino';
  if (lower.includes('diggy')) return 'diggy';
  if (lower.includes('meucarrinho')) return 'meucarrinho';
  if (lower.includes('whatsmenu')) return 'whatsmenu';
  if (lower.includes('yooga')) return 'yooga';
  if (lower.includes('pedir.')) return 'pedir';
  return 'unknown';
}

function readTargetIds() {
  const ids = [];
  if (ONLY_ID) ids.push(ONLY_ID);
  if (IDS_FILE && fs.existsSync(IDS_FILE)) {
    ids.push(...fs.readFileSync(IDS_FILE, 'utf8').split(/\r?\n|,/).map((id) => id.trim()).filter(Boolean));
  }
  return [...new Set(ids)];
}

function loadTargets() {
  const queuePath = QUEUE_FILE || latestQueueFile();
  if (!queuePath) throw new Error('Nenhuma fila encontrada. Gere scratch/menu-collection-queue primeiro.');
  const ids = readTargetIds();
  const idOrder = new Map(ids.map((id, index) => [id, index]));
  const queuePayload = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const queue = Array.isArray(queuePayload) ? queuePayload : queuePayload.queue || [];
  const targets = queue
    .filter((entry) => !ids.length || idOrder.has(entry.restaurant_id || entry.restaurantId))
    .filter((entry) => entry.tier === 'green' || (ids.length && entry.tier !== 'red'))
    .filter((entry) => !PLATFORM || entry.platform === PLATFORM)
    .filter((entry) => !/ifood\.com/i.test(entry.source_url || entry.sourceUrl || ''))
    .sort((left, right) => {
      if (ids.length) return (idOrder.get(left.restaurant_id || left.restaurantId) ?? 999999) - (idOrder.get(right.restaurant_id || right.restaurantId) ?? 999999);
      return Number(right.reviews_count || right.reviewsCount || 0) - Number(left.reviews_count || left.reviewsCount || 0);
    })
    .slice(0, LIMIT)
    .map((entry) => ({
      restaurantId: entry.restaurant_id || entry.restaurantId,
      restaurantName: entry.name || entry.restaurantName,
      sourceUrl: entry.source_url || entry.sourceUrl,
      platform: entry.platform || platformOf(entry.source_url || entry.sourceUrl),
      reviewsCount: entry.reviews_count ?? entry.reviewsCount ?? null,
      address: entry.address || null,
      city: entry.city || 'Campina Grande',
      state: entry.state || 'PB',
      phone: entry.phone || null,
      queueEntry: entry,
    }));
  return { queuePath, targets };
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
    throw new Error(`Browserbase ${endpoint} HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 400)}`);
  }
  return payload;
}

async function createBrowserbaseSession(env) {
  const apiKey = env.BROWSERBASE_API_KEY;
  if (!apiKey) throw new Error('BROWSERBASE_API_KEY ausente no .env.');
  const body = {};
  if (env.BROWSERBASE_PROJECT_ID) body.projectId = env.BROWSERBASE_PROJECT_ID;
  if (env.BROWSERBASE_REGION) body.region = env.BROWSERBASE_REGION;
  if (env.BROWSERBASE_PROXY === 'true') body.proxies = true;
  const session = await browserbaseFetch(apiKey, 'sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const connectUrl = session.connectUrl
    || session.connect_url
    || session.browserWSEndpoint
    || session.browser_ws_endpoint
    || session.wsEndpoint;
  if (!session.id || !connectUrl) {
    throw new Error(`Browserbase criou sessao sem id/connectUrl: ${JSON.stringify({ keys: Object.keys(session), id: session.id || null })}`);
  }
  return { apiKey, session, connectUrl };
}

async function releaseBrowserbaseSession(apiKey, sessionId) {
  if (!sessionId || KEEP_BROWSERBASE_SESSION) return { skipped: true };
  try {
    return await browserbaseFetch(apiKey, `sessions/${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'REQUEST_RELEASE' }),
    });
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number > 1000 && Number.isInteger(number) ? number / 100 : number;
}

function entityUnavailable(entry) {
  if (!entry) return false;
  if (entry.status && entry.status !== 'ACTIVE') return true;
  const stock = Number(entry.stock);
  return entry.active_stock_control === true && Number.isFinite(stock) && stock < 0;
}

function inferGroupRule(group, children = []) {
  const groupName = clean(group?.name || group?.title || '');
  const minRaw = group?.min ?? group?.minimum ?? group?.min_quantity ?? group?.min_qty ?? group?.min_items;
  const maxRaw = group?.max ?? group?.maximum ?? group?.max_quantity ?? group?.max_qty ?? group?.max_items;
  const requiredRaw = group?.required ?? group?.is_required ?? group?.mandatory ?? group?.obligatory;
  let min = Number.isFinite(Number(minRaw)) ? Number(minRaw) : null;
  let max = Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : null;
  let required = typeof requiredRaw === 'boolean'
    ? requiredRaw
    : requiredRaw != null
      ? ['true', '1', 'yes', 'sim', 'required', 'obrigatorio'].includes(String(requiredRaw).toLowerCase())
      : null;
  const key = normalize(groupName);
  const chooseMatch = key.match(/(?:escolha|selecione|obrigatorio|obrigatoria)\s*(?:ate|at[eé])?\s*(\d+)/);
  const atMostMatch = key.match(/(?:ate|at[eé])\s*(\d+)/);
  if (min == null && /obrigator|escolha\s+\d+/.test(key)) min = chooseMatch ? Number(chooseMatch[1]) : 1;
  if (max == null && chooseMatch) max = Number(chooseMatch[1]);
  else if (max == null && atMostMatch) max = Number(atMostMatch[1]);
  if (required == null && min != null) required = min > 0;
  if (max == null && children.length === 1 && min === 1) max = 1;
  return {
    min_quantity: Math.max(0, Number(min || 0)),
    max_quantity: max != null && Number.isFinite(Number(max)) && Number(max) > 0 ? Number(max) : null,
    is_required: Boolean(required),
  };
}

function promotionActiveNow(item, now = new Date()) {
  if (!item?.promotional_price_active || money(item.promotional_price) == null) return false;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  const aliases = {
    domingo: 'sunday',
    segunda: 'monday',
    'segunda-feira': 'monday',
    terca: 'tuesday',
    'terca-feira': 'tuesday',
    terça: 'tuesday',
    'terça-feira': 'tuesday',
    quarta: 'wednesday',
    'quarta-feira': 'wednesday',
    quinta: 'thursday',
    'quinta-feira': 'thursday',
    sexta: 'friday',
    'sexta-feira': 'friday',
    sabado: 'saturday',
    sábado: 'saturday',
  };
  const normalizeDay = (value) => {
    const key = normalize(value);
    return days.includes(key) ? key : aliases[key] || '';
  };
  const schedules = Array.isArray(item.promotional_price_schedules) ? item.promotional_price_schedules : [];
  if (!schedules.length) {
    const availability = Array.isArray(item.promotional_price_availability) ? item.promotional_price_availability : [];
    const availableDays = availability.map(normalizeDay).filter(Boolean);
    return !availableDays.length || availableDays.includes(today);
  }
  const current = now.getHours() * 60 + now.getMinutes();
  return schedules.some((schedule) => {
    const day = normalizeDay(schedule?.day || schedule?.weekday || schedule?.week_day || schedule?.day_of_week);
    if (day && day !== today) return false;
    const parseTime = (value) => {
      const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
      if (!match) return null;
      return Number(match[1]) * 60 + Number(match[2]);
    };
    const start = parseTime(schedule?.start || schedule?.start_at || schedule?.starts_at);
    const end = parseTime(schedule?.end || schedule?.end_at || schedule?.ends_at);
    if (start == null && end == null) return true;
    if (start != null && end != null) return start <= end ? current >= start && current <= end : current >= start || current <= end;
    if (start != null) return current >= start;
    return current <= end;
  });
}

function normalizeCardapioWebCategories(payload, sourceUrl) {
  const categories = [];
  for (const category of Array.isArray(payload) ? payload : []) {
    if (category.status && category.status !== 'ACTIVE') continue;
    if (looksLikeOperationalMenuEntity(category.name || category.title)) continue;
    const items = [];
    for (const item of category.items || []) {
      if (entityUnavailable(item)) continue;
      if (looksLikeOperationalMenuItem(item)) continue;
      const directPrice = money(promotionActiveNow(item) ? item.promotional_price : item.price);
      const options = [];
      for (const group of item.add_ons || item.addons || item.options || []) {
        if (group.status && group.status !== 'ACTIVE') continue;
        const children = group.subitems || group.items || group.options || [];
        const rule = inferGroupRule(group, children);
        children.forEach((option, index) => {
          if (entityUnavailable(option)) return;
          if (looksLikeInstructionalComboTitle(option, group, children)) return;
          options.push({
            external_id: clean(option._id || option.id || option.uuid) || null,
            group_name: clean(group.name || group.title || 'Opcionais'),
            name: clean(option.name || option.title),
            description: clean(option.description),
            price: money(option.price),
            price_delta: money(option.price),
            min_quantity: rule.min_quantity,
            max_quantity: rule.max_quantity,
            is_required: rule.is_required,
            order_index: Number(option.order || option.position || index),
            raw_data: option,
          });
        });
      }
      const optionPrices = options.map((option) => option.price).filter((value) => value != null && value > 0);
      const allPrices = [directPrice, ...optionPrices].filter((value) => value != null && value > 0);
      const min = allPrices.length ? Math.min(...allPrices) : null;
      const max = allPrices.length ? Math.max(...allPrices) : null;
      items.push({
        external_id: clean(item._id || item.id || item.uuid) || null,
        name: clean(item.name || item.title),
        description: clean(item.description),
        image_url: item.image_url || item.thumbnail_url || item.image || null,
        price: directPrice,
        price_min: min,
        price_max: max,
        price_type: directPrice != null ? 'fixed' : optionPrices.length ? (min === max ? 'option_only' : 'range') : 'unknown',
        price_source: directPrice != null ? 'api.item' : optionPrices.length ? 'api.options' : null,
        options,
        source_url: sourceUrl,
        raw_data: item,
        extraction_confidence: allPrices.length ? 0.98 : 0.84,
        needs_review: !allPrices.length,
      });
    }
    if (items.length) {
      categories.push({
        external_id: clean(category._id || category.id || category.uuid) || null,
        name: clean(category.name || category.title || 'Cardapio'),
        order_index: categories.length,
        items,
      });
    }
  }
  return categories;
}

function parseYoogaSlug(sourceUrl) {
  const url = new URL(sourceUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = parts[0] || '';
  if (!slug) throw new Error(`Yooga sem slug detectavel: ${sourceUrl}`);
  return slug;
}

async function fetchYoogaJson(endpoint, sourceUrl) {
  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/json, text/plain, */*',
      origin: 'https://delivery.yooga.app',
      referer: sourceUrl,
      'user-agent': 'Mozilla/5.0 FilterFood structured collector',
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Yooga retornou nao JSON em ${endpoint}: ${text.slice(0, 200)}`);
  }
  if (!response.ok) throw new Error(`Yooga API HTTP ${response.status} em ${endpoint}`);
  return { response, payload, textLength: text.length };
}

function yoogaTimeFromIso(value) {
  const match = String(value || '').match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
}

const WEEK_DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function emptyOpeningWeek() {
  return Object.fromEntries(WEEK_DAY_KEYS.map((key) => [key, { isOpen: false, slots: [] }]));
}

function yoogaScheduleToOpeningHours(scheduleJson) {
  let schedule = [];
  try {
    schedule = typeof scheduleJson === 'string' ? JSON.parse(scheduleJson) : scheduleJson;
  } catch {
    return null;
  }
  if (!Array.isArray(schedule)) return null;
  const week = emptyOpeningWeek();
  let seen = false;
  for (const day of schedule) {
    const key = WEEK_DAY_KEYS[Number(day?.day_of_week)];
    if (!key) continue;
    seen = true;
    const slots = (Array.isArray(day?.hours) ? day.hours : [])
      .map((hour) => {
        const start = yoogaTimeFromIso(hour?.start);
        const end = yoogaTimeFromIso(hour?.end);
        return start && end ? { start, end } : null;
      })
      .filter(Boolean);
    week[key] = { isOpen: slots.length > 0, slots };
  }
  return seen ? week : null;
}

function summarizeYoogaHours(scheduleJson) {
  let schedule = [];
  try {
    schedule = typeof scheduleJson === 'string' ? JSON.parse(scheduleJson) : scheduleJson;
  } catch {
    return '';
  }
  if (!Array.isArray(schedule)) return '';
  return schedule
    .map((day) => {
      const hours = Array.isArray(day?.hours) ? day.hours : [];
      if (!hours.length) return `${clean(day?.day)}: fechado`;
      const ranges = hours
        .map((hour) => {
          const start = yoogaTimeFromIso(hour?.start);
          const end = yoogaTimeFromIso(hour?.end);
          return start && end ? `${start}-${end}` : '';
        })
        .filter(Boolean)
        .join(', ');
      return ranges ? `${clean(day?.day)}: ${ranges}` : '';
    })
    .filter(Boolean)
    .join('; ');
}

function parseWhatsMenuSlug(sourceUrl) {
  const url = new URL(sourceUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = parts.find((part) => !/^cardapio|menu|loja|store$/i.test(part)) || '';
  if (!slug) throw new Error(`WhatsMenu sem slug detectavel: ${sourceUrl}`);
  return slug;
}

async function fetchWhatsMenuJson(endpoint, sourceUrl) {
  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/json, text/plain, */*',
      origin: 'https://whatsmenu.com.br',
      referer: sourceUrl,
      'user-agent': 'Mozilla/5.0 FilterFood structured collector',
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`WhatsMenu retornou nao JSON em ${endpoint}: ${text.slice(0, 200)}`);
  }
  if (!response.ok) throw new Error(`WhatsMenu API HTTP ${response.status} em ${endpoint}`);
  return { response, payload, textLength: text.length };
}

function whatsMenuWeekToOpeningHours(week) {
  const result = emptyOpeningWeek();
  if (!week || typeof week !== 'object') return null;
  let seen = false;
  for (const key of WEEK_DAY_KEYS) {
    const slots = (Array.isArray(week[key]) ? week[key] : [])
      .filter((slot) => slot?.active !== false)
      .map((slot) => {
        const start = clean(slot?.open);
        const end = clean(slot?.close);
        return /^\d{1,2}:\d{2}$/.test(start) && /^\d{1,2}:\d{2}$/.test(end)
          ? { start: start.padStart(5, '0'), end: end.padStart(5, '0') }
          : null;
      })
      .filter(Boolean);
    if (Array.isArray(week[key])) seen = true;
    result[key] = { isOpen: slots.length > 0, slots };
  }
  return seen ? result : null;
}

function summarizeWhatsMenuHours(week) {
  if (!week || typeof week !== 'object') return '';
  return WEEK_DAY_KEYS
    .map((key) => {
      const slots = (Array.isArray(week[key]) ? week[key] : []).filter((slot) => slot?.active !== false);
      if (!slots.length) return `${key}: fechado`;
      const ranges = slots
        .map((slot) => {
          const start = clean(slot?.open);
          const end = clean(slot?.close);
          return start && end ? `${start}-${end}` : '';
        })
        .filter(Boolean)
        .join(', ');
      return ranges ? `${key}: ${ranges}` : '';
    })
    .filter(Boolean)
    .join('; ');
}

function parseInstaDeliverySlug(sourceUrl) {
  const url = new URL(sourceUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = parts[0] || '';
  if (!slug) throw new Error(`InstaDelivery sem slug detectavel: ${sourceUrl}`);
  return slug;
}

async function fetchInstaDeliveryJson(endpoint, sourceUrl) {
  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/json, text/plain, */*',
      origin: 'https://instadelivery.com.br',
      referer: sourceUrl,
      'user-agent': 'Mozilla/5.0 FilterFood structured collector',
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`InstaDelivery retornou nao JSON em ${endpoint}: ${text.slice(0, 200)}`);
  }
  if (!response.ok) throw new Error(`InstaDelivery API HTTP ${response.status} em ${endpoint}`);
  return { response, payload, textLength: text.length };
}

function instaDeliveryTimesToOpeningHours(times) {
  const slots = Object.values(times || {}).flatMap((value) => Array.isArray(value) ? value : []);
  if (!slots.length) return null;
  const week = emptyOpeningWeek();
  for (const slot of slots) {
    const key = WEEK_DAY_KEYS[Number(slot?.day)];
    const start = clean(slot?.time_open);
    const end = clean(slot?.time_close);
    if (!key || !/^\d{1,2}:\d{2}$/.test(start) || !/^\d{1,2}:\d{2}$/.test(end)) continue;
    week[key].slots.push({ start: start.padStart(5, '0'), end: end.padStart(5, '0') });
    week[key].isOpen = true;
  }
  return Object.values(week).some((day) => day.slots.length) ? week : null;
}

function summarizeInstaDeliveryHours(times) {
  const opening = instaDeliveryTimesToOpeningHours(times);
  if (!opening) return '';
  return WEEK_DAY_KEYS
    .map((key) => {
      const slots = opening[key]?.slots || [];
      if (!slots.length) return `${key}: fechado`;
      return `${key}: ${slots.map((slot) => `${slot.start}-${slot.end}`).join(', ')}`;
    })
    .join('; ');
}

function instaDeliveryActive(entry) {
  if (!entry) return false;
  if (entry.deleted_at) return false;
  if (Number(entry.is_invisible || 0) === 1) return false;
  return true;
}

function instaDeliveryOptionSemantic(groupName, optionName, included) {
  const key = normalize(`${groupName} ${optionName}`);
  if (/\b(sabor|sabores|flavor|pizza)\b/.test(key)) return 'flavor';
  if (/\b(borda|bordas)\b/.test(key)) return 'addon';
  if (/\b(bebida|refrigerante|suco|agua)\b/.test(key)) return 'combo_component';
  if (included) return 'included_choice';
  return 'addon';
}

function normalizeInstaDeliveryCategories(store, sourceUrl) {
  const categories = [];
  for (const [categoryIndex, group] of (store?.groups || []).entries()) {
    if (!instaDeliveryActive(group)) continue;
    const categoryName = clean(group.name || 'Cardapio');
    if (!categoryName || looksLikeOperationalMenuEntity(categoryName)) continue;

    const items = [];
    for (const [itemIndex, item] of (group.itens || []).entries()) {
      if (!instaDeliveryActive(item)) continue;
      if (looksLikeOperationalMenuItem(item)) continue;

      const directPrice = money(item.price1 ?? item.price ?? item.value);
      const options = [];
      for (const optionGroup of item.complementos || []) {
        if (!instaDeliveryActive(optionGroup)) continue;
        const children = Array.isArray(optionGroup.complements) ? optionGroup.complements : [];
        const rule = inferGroupRule(optionGroup, children);
        const groupName = clean(optionGroup.name || 'Opcionais');
        if (!groupName || looksLikeOperationalMenuEntity(groupName) || OPERATIONAL_RE.test(groupName)) continue;

        children.forEach((option, optionIndex) => {
          if (!instaDeliveryActive(option)) return;
          if (looksLikeInstructionalComboTitle(option, optionGroup, children)) return;
          const name = clean(option.name || option.title);
          if (!name || looksLikeOperationalMenuEntity(name)) return;
          if (OPERATIONAL_RE.test(`${groupName} ${name}`)) return;
          const delta = money(option.price);
          const included = delta == null || delta === 0;
          const semanticType = instaDeliveryOptionSemantic(groupName, name, included);
          options.push({
            external_id: clean(option.id || option.uuid) || null,
            group_name: groupName,
            name,
            description: clean(option.description),
            image_url: option.image || null,
            price: null,
            price_delta: included ? null : delta,
            price_behavior: included ? 'included' : 'price_delta',
            semantic_type: semanticType,
            is_searchable_variant: semanticType === 'flavor',
            min_quantity: rule.min_quantity,
            max_quantity: rule.max_quantity,
            is_required: rule.is_required,
            order_index: Number(option.order || optionIndex),
            raw_data: option,
          });
        });
      }

      const optionDeltas = options
        .map((option) => money(option.price_delta))
        .filter((value) => value != null && value > 0);
      const maxDelta = optionDeltas.length ? Math.max(...optionDeltas) : 0;
      const allPrices = [directPrice, ...optionDeltas].filter((value) => value != null && value > 0);
      items.push({
        external_id: clean(item.id || item.uuid) || null,
        name: clean(item.name || item.title),
        description: clean(item.description),
        image_url: item.image || item.image_2 || item.image_3 || null,
        price: directPrice,
        price_min: directPrice,
        price_max: directPrice != null ? Number((directPrice + maxDelta).toFixed(2)) : optionDeltas.length ? Math.max(...optionDeltas) : null,
        price_type: directPrice != null ? 'fixed' : optionDeltas.length ? (allPrices.length > 1 ? 'range' : 'option_only') : 'unknown',
        price_source: directPrice != null ? 'instadelivery.item.price1' : optionDeltas.length ? 'instadelivery.options' : null,
        options,
        source_url: sourceUrl,
        raw_data: item,
        extraction_confidence: allPrices.length ? 0.98 : 0.82,
        needs_review: !allPrices.length,
        order_index: Number(item.order || itemIndex),
      });
    }

    if (items.length) {
      categories.push({
        external_id: clean(group.id || group.uuid) || null,
        name: categoryName,
        order_index: Number(group.order || categoryIndex),
        items,
      });
    }
  }
  return categories;
}

function buildInstaDeliveryDetails(store, sourceUrl, stats = {}) {
  const openingHours = instaDeliveryTimesToOpeningHours(store?.times);
  const hours = summarizeInstaDeliveryHours(store?.times);
  const bodyTextSample = clean([
    store?.name,
    store?.type_name,
    store?.address,
    store?.city,
    store?.state,
    store?.phone,
    store?.whatsapp,
    store?.public_message,
    store?.top_message,
    hours,
    ...(store?.groups || []).slice(0, 12).map((group) => [
      group?.name,
      ...(group?.itens || []).slice(0, 20).map((item) => `${item?.name || ''} ${item?.description || ''}`),
    ].flat().join(' | ')),
  ].filter(Boolean).join(' | ')).slice(0, 12000);

  return {
    url: sourceUrl,
    title: store?.name || 'InstaDelivery',
    companySlug: store?.url || parseInstaDeliverySlug(sourceUrl),
    bodyTextSample,
    metrics: stats,
    instaDeliveryStore: {
      name: store?.name || null,
      phone: formatBrazilPhone(store?.whatsapp || store?.phone),
      formattedAddress: clean([store?.address, store?.city, store?.state].filter(Boolean).join(', ')) || null,
      address: {
        address: clean(store?.address || ''),
        city: clean(store?.city || ''),
        state: clean(store?.state || ''),
        cep: clean(store?.zipcode || ''),
      },
      hours: hours || null,
      openingHours,
      logo: store?.design?.logo || null,
      background: store?.design?.background || null,
    },
  };
}

async function extractInstaDeliveryNativeMenu(page, sourceUrl, targetDir) {
  const slug = parseInstaDeliverySlug(sourceUrl);
  const endpoint = `https://app.instadelivery.com.br/api/stores/by-slug/${encodeURIComponent(slug)}`;
  const { payload, response, textLength } = await fetchInstaDeliveryJson(endpoint, sourceUrl);
  const categories = normalizeInstaDeliveryCategories(payload, sourceUrl);
  const stats = {
    endpointStatus: response.status,
    textLength,
    groupCount: Array.isArray(payload?.groups) ? payload.groups.length : 0,
    itemCount: categories.reduce((total, category) => total + (category.items || []).length, 0),
  };
  const details = buildInstaDeliveryDetails(payload, sourceUrl, stats);

  fs.writeFileSync(path.join(targetDir, 'raw-instadelivery-store.json'), JSON.stringify({
    endpoint,
    status: response.status,
    stats,
    store: payload,
  }, null, 2), 'utf8');

  try {
    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: TIMEOUT_MS }).catch(() => null);
    const pageDetails = await page.evaluate(() => {
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      return {
        url: location.href,
        title: document.title,
        bodyTextSample: clean(document.body?.innerText || '').slice(0, 6000),
        metrics: {
          scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
          bodyLength: document.body?.innerHTML?.length || 0,
          imageCount: document.images?.length || 0,
        },
      };
    });
    details.url = pageDetails.url || details.url;
    details.title = pageDetails.title || details.title;
    details.bodyTextSample = clean([details.bodyTextSample, pageDetails.bodyTextSample].filter(Boolean).join(' | ')).slice(0, 16000);
    details.metrics = { ...details.metrics, page: pageDetails.metrics };
  } catch (error) {
    details.browserError = error.message || String(error);
  }

  return { details, categories, endpoint, stats, slug };
}

function formatBrazilPhone(value) {
  let raw = digits(value);
  if (raw.startsWith('55') && raw.length > 11) raw = raw.slice(2);
  if (raw.length === 11) return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  if (raw.length === 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
  return clean(value) || null;
}

function isRestaurantLoginUrl(value) {
  return /restaurantlogin\.com\/ordering\/restaurant\/menu/i.test(String(value || ''));
}

const KNOWN_RESTAURANTLOGIN_MENU_URLS = [
  {
    host: 'pizzariabomsaborpb.com.br',
    menuUrl: 'https://www.restaurantlogin.com/ordering/restaurant/menu?restaurant_uid=9c0d0eff-2947-4617-b174-f62eae570fe2',
    reason: 'custom domain blocks direct fetch, uid captured from RestaurantLogin cart/init evidence',
  },
];

function knownRestaurantLoginMenuUrl(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  return KNOWN_RESTAURANTLOGIN_MENU_URLS.find((entry) => host === entry.host)?.menuUrl || null;
}

function restaurantLoginTimeFromMinute(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  const normalized = Math.round(minutes) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function restaurantLoginOpeningHours(rows) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const week = emptyOpeningWeek();
  let seen = false;
  const bitDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (const row of rows) {
    if (row?.type && row.type !== 'opening') continue;
    const start = restaurantLoginTimeFromMinute(row?.begin_minute);
    const end = restaurantLoginTimeFromMinute(row?.end_minute);
    if (!start || !end) continue;
    const rawDay = Number(row?.day_of_week);
    const dayKeys = [];
    if (Number.isInteger(rawDay) && rawDay >= 0 && rawDay <= 6) {
      dayKeys.push(WEEK_DAY_KEYS[rawDay]);
    } else if (Number.isInteger(rawDay) && rawDay > 0) {
      for (let index = 0; index < bitDays.length; index += 1) {
        if (rawDay & (1 << index)) dayKeys.push(bitDays[index]);
      }
    }
    for (const dayKey of dayKeys.filter(Boolean)) {
      seen = true;
      week[dayKey].isOpen = true;
      week[dayKey].slots.push({ start, end });
    }
  }
  return seen ? week : null;
}

function summarizeRestaurantLoginHours(rows) {
  const opening = restaurantLoginOpeningHours(rows);
  if (!opening) return '';
  return WEEK_DAY_KEYS
    .map((key) => {
      const day = opening[key];
      if (!day?.isOpen) return `${key}: fechado`;
      const ranges = (day.slots || []).map((slot) => `${slot.start}-${slot.end}`).join(', ');
      return ranges ? `${key}: ${ranges}` : '';
    })
    .filter(Boolean)
    .join('; ');
}

function parseRestaurantLoginAddress(value) {
  const raw = clean(value).replace(/,\s*Brazil$/i, '');
  const parts = raw.split(',').map((part) => clean(part)).filter(Boolean);
  const street = parts[0] || '';
  let number = '';
  let neighborhood = '';
  if (parts[1]) {
    const second = parts[1];
    const split = second.split(/\s+-\s+/);
    const numberMatch = split[0]?.match(/\d+[A-Za-z]?/);
    number = numberMatch?.[0] || '';
    neighborhood = clean(split.slice(1).join(' - '));
  }
  let city = '';
  let state = '';
  if (parts[2]) {
    const match = parts[2].match(/(.+?)\s*-\s*([A-Z]{2})$/i);
    city = clean(match?.[1] || parts[2]);
    state = clean(match?.[2] || '');
  }
  const cep = clean((parts.find((part) => /\d{5}-?\d{3}/.test(part)) || '').match(/\d{5}-?\d{3}/)?.[0] || '');
  return {
    address: street,
    street,
    number,
    neighborhood,
    city,
    state,
    cep,
    formattedAddress: raw,
  };
}

function restaurantLoginActive(entry) {
  if (!entry) return false;
  if (entry.active === false || entry.hidden_until) return false;
  if (entry.is_out_of_stock === true || entry.out_of_stock === true) return false;
  return true;
}

function restaurantLoginGroupRule(group) {
  const minRaw = group?.force_min ?? group?.min ?? group?.minimum;
  const maxRaw = group?.force_max ?? group?.max ?? group?.maximum;
  const required = group?.required === true || group?.is_required === true;
  const min = Number.isFinite(Number(minRaw)) ? Number(minRaw) : required ? 1 : 0;
  const max = Number.isFinite(Number(maxRaw)) && Number(maxRaw) > 0 ? Number(maxRaw) : null;
  return {
    min_quantity: Math.max(0, min),
    max_quantity: max,
    is_required: Boolean(required || min > 0),
  };
}

function restaurantLoginOptionSemantic(groupName, optionName, rule, delta) {
  const text = normalize(`${groupName} ${optionName}`);
  if (/sabor|sabores/.test(text)) return 'flavor';
  if (/borda|recheio|catupiry|cheddar|chocolate/.test(text)) return 'addon';
  if (/bebida|refrigerante|sabor dore|guarana|laranja|limao|limão/.test(text)) return 'required_choice';
  return delta != null && delta > 0 && !rule.is_required ? 'addon' : 'required_choice';
}

function normalizeRestaurantLoginCategories(payload, sourceUrl) {
  const categories = [];
  const rawCategories = payload?.restaurant?.menu?.categories || [];
  for (const [categoryIndex, category] of rawCategories.entries()) {
    if (!restaurantLoginActive(category)) continue;
    const categoryName = clean(category.name || 'Cardapio');
    if (!categoryName || looksLikeOperationalMenuEntity(categoryName)) continue;
    const items = [];
    for (const [itemIndex, item] of (category.items || []).entries()) {
      if (!restaurantLoginActive(item)) continue;
      if (looksLikeOperationalMenuItem(item)) continue;
      const directPrice = money(item.price);
      const options = [];
      for (const group of item.groups || []) {
        if (!restaurantLoginActive(group)) continue;
        const groupName = clean(group.name || 'Opcoes');
        if (!groupName || looksLikeOperationalMenuEntity(groupName) || OPERATIONAL_RE.test(groupName)) continue;
        const children = Array.isArray(group.options) ? group.options : [];
        const rule = restaurantLoginGroupRule(group);
        children.forEach((option, optionIndex) => {
          if (!restaurantLoginActive(option)) return;
          if (looksLikeInstructionalComboTitle(option, group, children)) return;
          const name = clean(option.name);
          if (!name || looksLikeOperationalMenuEntity(name) || OPERATIONAL_RE.test(`${groupName} ${name}`)) return;
          const delta = money(option.price);
          const paidDelta = delta != null && delta > 0 ? delta : null;
          const semanticType = restaurantLoginOptionSemantic(groupName, name, rule, paidDelta);
          options.push({
            external_id: clean(option.id) || null,
            group_name: groupName,
            name,
            description: clean(option.description),
            price: null,
            price_delta: paidDelta,
            price_behavior: paidDelta != null ? 'price_delta' : 'included',
            semantic_type: semanticType,
            is_searchable_variant: semanticType === 'flavor',
            min_quantity: rule.min_quantity,
            max_quantity: rule.max_quantity,
            is_required: rule.is_required,
            order_index: Number(option.sort ?? optionIndex),
            raw_data: {
              ...option,
              restaurantlogin_group_id: group.id || null,
              restaurantlogin_group_required: group.required ?? null,
              restaurantlogin_force_min: group.force_min ?? null,
              restaurantlogin_force_max: group.force_max ?? null,
            },
          });
        });
      }
      const optionDeltas = options.map((option) => money(option.price_delta)).filter((value) => value != null && value > 0);
      const maxDelta = optionDeltas.length ? Math.max(...optionDeltas) : 0;
      const itemPayload = {
        external_id: clean(item.id) || null,
        name: clean(item.name),
        description: clean(item.description),
        image_url: null,
        price: directPrice,
        price_min: directPrice,
        price_max: directPrice != null ? Number((directPrice + maxDelta).toFixed(2)) : null,
        price_type: directPrice != null ? 'fixed' : 'unknown',
        price_source: directPrice != null ? 'restaurantlogin.item.price' : null,
        options,
        source_url: sourceUrl,
        raw_data: item,
        extraction_confidence: directPrice != null ? 0.98 : 0.82,
        needs_review: directPrice == null,
        order_index: Number(item.sort ?? itemIndex),
      };
      if (itemPayload.name) items.push(itemPayload);
    }
    if (items.length) {
      categories.push({
        external_id: clean(category.id) || null,
        name: categoryName,
        order_index: Number(category.sort ?? categoryIndex),
        items,
      });
    }
  }
  return categories;
}

async function resolveRestaurantLoginMenuUrl(page, sourceUrl, targetDir) {
  if (isRestaurantLoginUrl(sourceUrl)) return sourceUrl;
  const knownUrl = knownRestaurantLoginMenuUrl(sourceUrl);
  if (knownUrl) {
    fs.writeFileSync(path.join(targetDir, 'restaurantlogin-source-signals.json'), JSON.stringify({
      sourceUrl,
      resolvedBy: 'known_restaurantlogin_menu_url',
      menuUrl: knownUrl,
      knownReason: KNOWN_RESTAURANTLOGIN_MENU_URLS.find((entry) => knownUrl === entry.menuUrl)?.reason || null,
    }, null, 2), 'utf8');
    return knownUrl;
  }
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForNetworkIdle({ idleTime: 1000, timeout: TIMEOUT_MS }).catch(() => null);
  await sleep(800);
  const signals = await page.evaluate(() => {
    const cleanValue = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const anchors = [...document.querySelectorAll('a[href]')].map((anchor) => ({
      text: cleanValue(anchor.textContent || ''),
      href: new URL(anchor.getAttribute('href'), location.href).href,
    }));
    const html = document.documentElement?.outerHTML || '';
    return {
      url: location.href,
      title: document.title,
      bodyTextSample: cleanValue(document.body?.innerText || '').slice(0, 6000),
      anchors,
      htmlSample: html.slice(0, 50000),
    };
  });
  fs.writeFileSync(path.join(targetDir, 'restaurantlogin-source-signals.json'), JSON.stringify({
    sourceUrl,
    ...signals,
    htmlSample: undefined,
  }, null, 2), 'utf8');
  const link = signals.anchors.find((anchor) => isRestaurantLoginUrl(anchor.href))?.href
    || (signals.htmlSample.match(/https?:\/\/www\.restaurantlogin\.com\/ordering\/restaurant\/menu\?restaurant_uid=[^"' <]+/i) || [])[0]
    || (signals.htmlSample.match(/https?:\/\/restaurantlogin\.com\/ordering\/restaurant\/menu\?restaurant_uid=[^"' <]+/i) || [])[0];
  if (!link) throw new Error(`RestaurantLogin nao encontrado em ${sourceUrl}`);
  return link.replace(/^https?:\/\/restaurantlogin\.com/i, 'https://www.restaurantlogin.com');
}

function buildRestaurantLoginDetails(payload, sourceUrl, pageDetails = {}) {
  const restaurant = payload?.restaurant || {};
  const parsedAddress = parseRestaurantLoginAddress(restaurant.address);
  const openingHours = restaurantLoginOpeningHours(restaurant.opening_hours);
  const hours = summarizeRestaurantLoginHours(restaurant.opening_hours);
  const productSample = (restaurant.menu?.categories || [])
    .flatMap((category) => (category.items || []).slice(0, 20).map((item) => `${category.name} ${item.name} ${item.description || ''}`))
    .slice(0, 60)
    .join(' | ');
  const bodyTextSample = clean([
    restaurant.name,
    restaurant.address,
    restaurant.phone,
    hours,
    productSample,
    pageDetails.bodyTextSample,
  ].filter(Boolean).join(' | ')).slice(0, 12000);
  return {
    url: pageDetails.url || sourceUrl,
    title: pageDetails.title || restaurant.name || 'RestaurantLogin',
    companySlug: restaurant.uid || new URL(sourceUrl).searchParams.get('restaurant_uid') || '',
    bodyTextSample,
    metrics: pageDetails.metrics || null,
    restaurantLoginStore: {
      id: restaurant.id ?? null,
      uid: restaurant.uid || null,
      name: restaurant.name || null,
      phone: formatBrazilPhone(restaurant.phone),
      formattedAddress: parsedAddress.formattedAddress || null,
      address: parsedAddress,
      hours,
      openingHours,
      urls: restaurant.urls || [],
    },
  };
}

async function extractRestaurantLoginNativeMenu(page, sourceUrl, targetDir) {
  const menuUrl = await resolveRestaurantLoginMenuUrl(page, sourceUrl, targetDir);
  const networkEntries = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (!/\/api\/cart\/(?:init|update)/i.test(url)) return;
    const entry = {
      url,
      status: response.status(),
      method: response.request().method(),
      body: null,
      error: null,
    };
    try {
      entry.body = await response.json();
    } catch (error) {
      entry.error = error.message || String(error);
    }
    networkEntries.push(entry);
  });

  await page.goto(menuUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForNetworkIdle({ idleTime: 1400, timeout: TIMEOUT_MS }).catch(() => null);
  await sleep(1200);
  const pageDetails = await page.evaluate(() => {
    const cleanValue = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.href,
      title: document.title,
      bodyTextSample: cleanValue(document.body?.innerText || '').slice(0, 8000),
      metrics: {
        scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
        bodyLength: document.body?.innerHTML?.length || 0,
        imageCount: document.images?.length || 0,
      },
    };
  });

  const menuEntry = networkEntries.find((entry) => entry.body?.restaurant?.menu?.categories?.length)
    || networkEntries.find((entry) => entry.body?.restaurant);
  if (!menuEntry?.body?.restaurant?.menu?.categories?.length) {
    throw new Error(`RestaurantLogin sem menu estruturado capturado; respostas=${networkEntries.length}`);
  }

  const categories = normalizeRestaurantLoginCategories(menuEntry.body, pageDetails.url || menuUrl);
  const details = buildRestaurantLoginDetails(menuEntry.body, pageDetails.url || menuUrl, pageDetails);
  const stats = summarizeCategories(categories);
  fs.writeFileSync(path.join(targetDir, 'raw-restaurantlogin-menu.json'), JSON.stringify({
    sourceUrl,
    menuUrl,
    stats,
    networkEntries: networkEntries.map((entry) => ({
      url: entry.url,
      status: entry.status,
      method: entry.method,
      hasRestaurant: Boolean(entry.body?.restaurant),
      hasMenu: Boolean(entry.body?.restaurant?.menu?.categories?.length),
      error: entry.error,
    })),
    payload: menuEntry.body,
  }, null, 2), 'utf8');
  if (!categories.length) throw new Error('RestaurantLogin sem categorias com itens estruturados.');
  return {
    details,
    categories,
    endpoint: menuEntry.url,
    stats,
    menuUrl,
    networkEntryCount: networkEntries.length,
  };
}

function normalizeWhatsMenuAssetUrl(value) {
  const url = clean(value);
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function whatsMenuActive(entry) {
  if (!entry || entry.deleted_at) return false;
  if (entry.status === false || entry.status === 0 || entry.status === '0') return false;
  if (typeof entry.status === 'string' && /inactive|disabled|unavailable|indisponivel|deleted/i.test(entry.status)) return false;
  return true;
}

function shouldSkipWhatsMenuComplement(group) {
  const groupName = normalize(group?.name || '');
  return /desconto|peca.*outro|outro.*por|segunda.*unidade|2.*unidade|pague.*leve|leve.*pague|promocao/.test(groupName);
}

function whatsMenuGroupRule(group) {
  const required = group?.required === true || group?.required === 1 || group?.required === '1';
  const minRaw = Number(group?.min);
  const maxRaw = Number(group?.max);
  return {
    min_quantity: required && Number.isFinite(minRaw) && minRaw > 0 ? minRaw : required ? 1 : 0,
    max_quantity: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : null,
    is_required: required,
  };
}

function whatsMenuOptionSemantic(group, option, optionPrice, context = {}) {
  const text = normalize(`${group?.name || ''} ${option?.name || ''}`);
  if (context.absolutePriceGroup && /sabor|sabores/.test(text)) return 'flavor';
  if (context.absolutePriceGroup) return 'required_choice';
  if (/molho|molhos/.test(text) && optionPrice == null) return 'required_choice';
  if (/adicion|adicional|add|extra|mais sabor|borda|recheio|catupiry|cheddar|cream cheese/.test(text)) return 'addon';
  if (/bebida|refrigerante|suco|combo|acompanhamento/.test(text)) return 'combo_component';
  return optionPrice != null && optionPrice > 0 ? 'addon' : 'required_choice';
}

function normalizeWhatsMenuOption(group, option, rule, index, context = {}) {
  if (!whatsMenuActive(option)) return null;
  if (looksLikeInstructionalComboTitle(option, group, group?.itens || [])) return null;
  const name = clean(option.name || option.title);
  if (!name || looksLikeOperationalMenuEntity(name)) return null;
  if (OPERATIONAL_RE.test(`${group?.name || group?.title || ''} ${name}`)) return null;
  const optionPrice = money(option.value);
  const included = optionPrice == null || optionPrice === 0;
  const priceBehavior = included ? 'included' : context.absolutePriceGroup ? 'absolute_price' : 'price_delta';
  const semanticType = whatsMenuOptionSemantic(group, option, included ? null : optionPrice, context);
  return {
    external_id: clean(option.code || option.id || option._id || option.uuid) || null,
    group_name: clean(group?.name || group?.title || 'Opcoes'),
    name,
    description: clean(option.description),
    image_url: normalizeWhatsMenuAssetUrl(option.image || option.img),
    price: priceBehavior === 'absolute_price' ? optionPrice : null,
    price_delta: priceBehavior === 'price_delta' ? optionPrice : null,
    price_behavior: priceBehavior,
    semantic_type: semanticType,
    is_searchable_variant: semanticType === 'flavor' || (context.absolutePriceGroup && /tamanho|peso|volume|ml|litro|sabor/.test(normalize(group?.name || ''))),
    min_quantity: rule.min_quantity,
    max_quantity: rule.max_quantity,
    is_required: rule.is_required,
    order_index: Number(option.order || option.position || index),
    raw_data: option,
  };
}

function whatsMenuGroupHasPositivePrices(group) {
  return (group?.itens || group?.items || group?.options || [])
    .filter(whatsMenuActive)
    .some((option) => {
      const value = money(option?.value);
      return value != null && value > 0;
    });
}

function whatsMenuGroupUsesAbsolutePrices(group, product, groups, directPrice) {
  if (directPrice != null && directPrice > 0) return false;
  if (!whatsMenuGroupHasPositivePrices(group)) return false;
  const groupName = normalize(group?.name || '');
  const productText = normalize(`${product?.name || ''} ${product?.description || ''}`);
  const hasPricedSizeGroup = groups.some((candidate) => {
    const candidateName = normalize(candidate?.name || '');
    return candidate !== group && /tamanho|peso|volume|\bml\b|litro/.test(candidateName) && whatsMenuGroupHasPositivePrices(candidate);
  });
  if (/tamanho|peso|volume|\bml\b|litro/.test(groupName)) return true;
  if (/sabor|sabores/.test(groupName) && !hasPricedSizeGroup) return true;
  if (/picole|paleta|sorvete|casquinha/.test(productText) && /sabor|sabores/.test(groupName)) return true;
  return false;
}

function normalizeWhatsMenuItemBaseFromAbsoluteOptions(options, directPrice) {
  if (directPrice != null && directPrice > 0) return { directPrice, options };
  const groups = new Map();
  for (const option of options) {
    if (option.price_behavior !== 'absolute_price') continue;
    const groupName = clean(option.group_name || 'Opcoes');
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(option);
  }

  let primary = null;
  for (const [groupName, groupOptions] of groups.entries()) {
    const key = normalize(groupName);
    const prices = groupOptions.map((option) => money(option.price)).filter((value) => value != null && value > 0);
    if (!prices.length) continue;
    const primaryScore = (/tamanho|peso|volume|\bml\b|litro/.test(key) ? 3 : 0)
      + (/sabor|sabores/.test(key) ? 2 : 0)
      + (groupOptions.some((option) => option.is_required) ? 1 : 0);
    if (!primary || primaryScore > primary.score || (primaryScore === primary.score && prices.length > primary.prices.length)) {
      primary = { groupName, groupOptions, prices, score: primaryScore };
    }
  }
  if (!primary || primary.score <= 0) return { directPrice, options };

  const basePrice = Math.min(...primary.prices);
  const normalizedOptions = options.map((option) => {
    if (clean(option.group_name || 'Opcoes') !== primary.groupName || option.price_behavior !== 'absolute_price') return option;
    const absolutePrice = money(option.price);
    if (absolutePrice == null || absolutePrice <= 0) return option;
    const delta = Number(Math.max(0, absolutePrice - basePrice).toFixed(2));
    return {
      ...option,
      price: null,
      price_delta: delta > 0 ? delta : null,
      price_behavior: delta > 0 ? 'price_delta' : 'included',
      raw_data: {
        ...(option.raw_data || {}),
        absolute_price: absolutePrice,
        base_price_reference: basePrice,
        normalized_price_behavior: 'absolute_primary_option_to_item_base_delta',
      },
    };
  });
  return { directPrice: basePrice, options: normalizedOptions };
}

function normalizeWhatsMenuCategories(profile, sourceUrl) {
  const categories = [];
  for (const category of Array.isArray(profile?.categories) ? profile.categories : []) {
    if (!whatsMenuActive(category)) continue;
    if (looksLikeOperationalMenuEntity(category.name || category.title)) continue;
    const items = [];
    for (const product of category.products || []) {
      if (!whatsMenuActive(product)) continue;
      if (looksLikeOperationalMenuItem(product)) continue;
      const selectedDirectPrice = product.promoteStatus === 1 || product.promoteStatus === true
        ? (money(product.promoteValue) ?? money(product.value))
        : money(product.value);
      const directPrice = selectedDirectPrice != null && selectedDirectPrice > 0 ? selectedDirectPrice : null;
      const options = [];
      const groups = product.complements || product.addons || product.options || [];
      for (const group of groups) {
        if (!whatsMenuActive(group)) continue;
        if (shouldSkipWhatsMenuComplement(group)) continue;
        if (looksLikeOperationalMenuEntity(group.name || group.title)) continue;
        if (OPERATIONAL_RE.test(clean(group.name || group.title))) continue;
        const children = group.itens || group.items || group.options || [];
        const rule = whatsMenuGroupRule(group);
        const absolutePriceGroup = whatsMenuGroupUsesAbsolutePrices(group, product, groups, directPrice);
        children.forEach((option, optionIndex) => {
          const normalized = normalizeWhatsMenuOption(group, option, rule, optionIndex, {
            absolutePriceGroup,
            directPrice,
            category,
            product,
          });
          if (normalized) options.push(normalized);
        });
      }
      const baseNormalized = normalizeWhatsMenuItemBaseFromAbsoluteOptions(options, directPrice);
      const normalizedOptions = baseNormalized.options;
      const normalizedDirectPrice = baseNormalized.directPrice;
      const optionDeltas = normalizedOptions
        .map((option) => money(option.price_delta))
        .filter((value) => value != null && value > 0);
      const optionAbsolutePrices = normalizedOptions
        .map((option) => money(option.price))
        .filter((value) => value != null && value > 0);
      const allPrices = [normalizedDirectPrice, ...optionAbsolutePrices].filter((value) => value != null && value > 0);
      const min = money(product.min_value) ?? (normalizedDirectPrice ?? (allPrices.length ? Math.min(...allPrices) : null));
      const max = normalizedDirectPrice != null
        ? normalizedDirectPrice + (optionDeltas.length ? Math.max(...optionDeltas) : 0)
        : allPrices.length ? Math.max(...allPrices) : null;
      items.push({
        external_id: clean(product.id || product.product_code || product._id || product.uuid) || null,
        name: clean(product.name || product.title),
        description: clean(product.description),
        image_url: normalizeWhatsMenuAssetUrl(product.image || product.img || product.image_url),
        price: normalizedDirectPrice,
        price_min: min,
        price_max: max,
        price_type: normalizedDirectPrice != null ? 'fixed' : optionAbsolutePrices.length ? (min === max ? 'option_only' : 'range') : 'unknown',
        price_source: normalizedDirectPrice != null ? (directPrice != null ? 'whatsmenu.product.value' : 'whatsmenu.primary_option_base') : optionAbsolutePrices.length ? 'whatsmenu.options' : null,
        options: normalizedOptions,
        source_url: sourceUrl,
        raw_data: product,
        extraction_confidence: allPrices.length || normalizedDirectPrice != null ? 0.98 : 0.84,
        needs_review: !allPrices.length,
      });
    }
    if (items.length) {
      categories.push({
        external_id: clean(category.id || category._id || category.uuid) || null,
        name: clean(category.name || category.title || 'Cardapio'),
        order_index: Number(category.order || categories.length),
        items,
      });
    }
  }
  return categories;
}

function buildWhatsMenuDetails(profile, sourceUrl, endpoint, pageDetails = {}) {
  const address = profile?.address || {};
  const openingHours = whatsMenuWeekToOpeningHours(profile?.week);
  const formattedAddress = clean([
    address.street,
    address.number,
    address.neigborhood || address.neighborhood,
    address.city,
    address.state,
    address.zipcode,
  ].filter(Boolean).join(' '));
  const hours = summarizeWhatsMenuHours(profile?.week);
  const productSample = (profile?.categories || [])
    .flatMap((category) => (category.products || []).slice(0, 4).map((product) => `${category.name} ${product.name} ${product.description || ''}`))
    .slice(0, 30)
    .join(' | ');
  const bodyTextSample = clean([
    profile?.name,
    profile?.description,
    profile?.slug,
    profile?.whatsapp,
    formattedAddress,
    address.complement,
    hours,
    productSample,
    pageDetails.bodyTextSample,
  ].filter(Boolean).join(' | ')).slice(0, 10000);
  return {
    url: pageDetails.url || sourceUrl,
    title: pageDetails.title || profile?.name || 'WhatsMenu',
    companySlug: profile?.slug || parseWhatsMenuSlug(sourceUrl),
    bodyTextSample,
    whatsMenuStore: {
      id: profile?.id ?? null,
      name: profile?.name || null,
      slug: profile?.slug || null,
      logo: normalizeWhatsMenuAssetUrl(profile?.logo),
      background: normalizeWhatsMenuAssetUrl(profile?.background),
      whatsapp: profile?.whatsapp || null,
      phone: formatBrazilPhone(profile?.whatsapp),
      formattedAddress: formattedAddress || null,
      address,
      latitude: finiteNumber(address.latitude),
      longitude: finiteNumber(address.longitude),
      hours,
      openingHours,
      endpoint,
    },
    metrics: pageDetails.metrics || null,
  };
}

async function extractWhatsMenuNativeMenu(page, sourceUrl, targetDir) {
  const slug = parseWhatsMenuSlug(sourceUrl);
  const endpoint = `https://api2.whatsmenu.com.br/api/v2/business/${encodeURIComponent(slug)}/profile/`;
  const profileResult = await fetchWhatsMenuJson(endpoint, sourceUrl);

  let pageDetails = {};
  try {
    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await page.waitForNetworkIdle({ idleTime: 1200, timeout: TIMEOUT_MS }).catch(() => null);
    await sleep(1200);
    pageDetails = await page.evaluate(() => {
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      return {
        url: location.href,
        title: document.title,
        bodyTextSample: clean(document.body?.innerText || '').slice(0, 6000),
        metrics: {
          scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
          bodyLength: document.body?.innerHTML?.length || 0,
          imageCount: document.images?.length || 0,
        },
      };
    });
  } catch (error) {
    pageDetails = {
      url: sourceUrl,
      title: profileResult.payload?.name || 'WhatsMenu',
      bodyTextSample: '',
      metrics: { pageError: error.message || String(error) },
    };
  }

  const categories = normalizeWhatsMenuCategories(profileResult.payload, sourceUrl);
  const details = buildWhatsMenuDetails(profileResult.payload, sourceUrl, endpoint, pageDetails);
  const stats = summarizeCategories(categories);
  fs.writeFileSync(path.join(targetDir, 'raw-whatsmenu-profile.json'), JSON.stringify({
    endpoint,
    status: profileResult.response.status,
    textLength: profileResult.textLength,
    stats,
    payload: profileResult.payload,
  }, null, 2), 'utf8');

  if (!categories.length) throw new Error('WhatsMenu sem categorias com itens estruturados.');
  return {
    details,
    categories,
    stats,
    endpoint,
    slug,
  };
}

function parseBrendiSlug(sourceUrl) {
  const url = new URL(sourceUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = parts[0] || '';
  if (!slug) throw new Error(`Brendi sem slug detectavel: ${sourceUrl}`);
  return slug;
}

function extractNuxtDataPayload(html) {
  const match = String(html || '').match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('Payload __NUXT_DATA__ nao encontrado.');
  const payload = JSON.parse(match[1]);
  const cache = new Map();

  function hydrate(index) {
    if (index === -1) return undefined;
    if (cache.has(index)) return cache.get(index);
    const value = payload[index];
    if (Array.isArray(value)) {
      const tag = value[0];
      if (['Reactive', 'ShallowReactive', 'Ref', 'Readonly', 'ShallowReadonly'].includes(tag)) return hydrate(value[1]);
      if (tag === 'EmptyRef') return null;
      if (tag === 'Date') return value[1];
      if (tag === 'Set') return [];
      const arr = [];
      cache.set(index, arr);
      for (const ref of value) arr.push(typeof ref === 'number' ? hydrate(ref) : ref);
      return arr;
    }
    if (value && typeof value === 'object') {
      const obj = {};
      cache.set(index, obj);
      for (const [key, ref] of Object.entries(value)) obj[key] = typeof ref === 'number' ? hydrate(ref) : ref;
      return obj;
    }
    cache.set(index, value);
    return value;
  }

  return hydrate(0);
}

function brendiMoney(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) return money(value);
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Number((number / 100).toFixed(2));
}

function brendiActive(entry) {
  if (!entry || entry.active === false || entry.missing === true) return false;
  return true;
}

function brendiAssetUrl(value) {
  const url = clean(value);
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  // Brendi stores internal public/stores paths in Nuxt payload, but CDN exposes
  // optimized hashes. Avoid importing broken URLs; media is enriched elsewhere.
  return null;
}

function brendiMinuteToTime(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  const normalized = Math.min(1439, Math.max(0, Math.round(minutes)));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function brendiWorkingHoursToOpeningHours(workingHours) {
  if (!workingHours || typeof workingHours !== 'object') return null;
  const map = {
    sun: 'sunday',
    mon: 'monday',
    tue: 'tuesday',
    wed: 'wednesday',
    thu: 'thursday',
    fri: 'friday',
    sat: 'saturday',
  };
  const week = emptyOpeningWeek();
  let seen = false;
  for (const [shortDay, dayKey] of Object.entries(map)) {
    const slots = Array.isArray(workingHours[shortDay]) ? workingHours[shortDay] : [];
    if (shortDay in workingHours) seen = true;
    const normalizedSlots = slots
      .map((slot) => {
        const start = brendiMinuteToTime(slot?.start);
        const end = brendiMinuteToTime(slot?.end);
        return start && end ? { start, end } : null;
      })
      .filter(Boolean);
    week[dayKey] = { isOpen: normalizedSlots.length > 0, slots: normalizedSlots };
  }
  return seen ? week : null;
}

function summarizeBrendiHours(workingHours) {
  const opening = brendiWorkingHoursToOpeningHours(workingHours);
  if (!opening) return '';
  return WEEK_DAY_KEYS
    .map((key) => {
      const day = opening[key];
      if (!day?.isOpen) return `${key}: fechado`;
      const ranges = (day.slots || []).map((slot) => `${slot.start}-${slot.end}`).join(', ');
      return ranges ? `${key}: ${ranges}` : '';
    })
    .filter(Boolean)
    .join('; ');
}

function brendiGroupRule(group) {
  const groupName = normalize(group?.title || group?.name || '');
  const minRaw = Number(group?.minChoices ?? group?.min ?? group?.minimum);
  const maxRaw = Number(group?.maxChoices ?? group?.max ?? group?.maximum);
  const required = group?.required === true || /obrigator/.test(groupName);
  const isUnique = normalize(group?.type || '') === 'unique';
  const min = Number.isFinite(minRaw) && minRaw > 0 ? minRaw : required ? 1 : 0;
  const max = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : isUnique ? 1 : null;
  return {
    min_quantity: min,
    max_quantity: max,
    is_required: Boolean(required || min > 0),
  };
}

function brendiOptionSemantic(group, option, delta, rule) {
  const text = normalize(`${group?.title || group?.name || ''} ${option?.title || option?.name || ''}`);
  if (/ponto da carne|mal passado|ao ponto|bem passado/.test(text)) return 'required_choice';
  if (/bebida|refri|refrigerante|suco|agua|água|combo/.test(text)) return 'combo_component';
  if (/burguer|burger|hamburguer|carne|proteina/.test(text) && rule.is_required) return 'required_choice';
  if (/sabor|sabores/.test(text)) return 'flavor';
  return delta != null && delta > 0 && !rule.is_required ? 'addon' : 'required_choice';
}

function normalizeBrendiOptions(product, sourceUrl) {
  const options = [];
  const groups = Array.isArray(product?.customs) && product.customs.length
    ? product.customs
    : [];

  for (const group of groups) {
    if (!brendiActive(group)) continue;
    const groupName = clean(group.title || group.name || 'Opcoes');
    if (!groupName || looksLikeOperationalMenuEntity(groupName) || OPERATIONAL_RE.test(groupName)) continue;
    const children = Array.isArray(group.choices) ? group.choices : [];
    const rule = brendiGroupRule(group);
    children.forEach((choice, index) => {
      if (!brendiActive(choice)) return;
      if (looksLikeInstructionalComboTitle(choice, group, children)) return;
      const name = clean(choice.title || choice.name);
      if (!name || looksLikeOperationalMenuEntity(name)) return;
      if (OPERATIONAL_RE.test(`${groupName} ${name}`)) return;
      const delta = brendiMoney(choice.extraPrice);
      const included = delta == null || delta === 0;
      const semanticType = brendiOptionSemantic(group, choice, included ? null : delta, rule);
      options.push({
        external_id: clean(choice.id || choice.pdvCode || choice.uuid) || null,
        group_name: groupName,
        name,
        description: clean(choice.description),
        image_url: brendiAssetUrl(choice.picture),
        price: null,
        price_delta: included ? null : delta,
        price_behavior: included ? 'included' : 'price_delta',
        semantic_type: semanticType,
        is_searchable_variant: semanticType === 'flavor',
        min_quantity: rule.min_quantity,
        max_quantity: rule.max_quantity,
        is_required: rule.is_required,
        order_index: Number(choice.order || choice.position || index),
        raw_data: {
          ...choice,
          source_url: sourceUrl,
          brendi_group_id: group.id || group?.$ref?.id || null,
          brendi_group_type: group.type || null,
        },
      });
    });
  }
  return options;
}

function normalizeBrendiCategories(menu, sourceUrl) {
  const productsByCategory = menu?.productsByCategory || {};
  const categories = [];
  for (const [categoryIndex, category] of (menu?.categories || []).entries()) {
    if (!brendiActive(category)) continue;
    if (looksLikeOperationalMenuEntity(category.name || category.title)) continue;
    const products = Array.isArray(productsByCategory[category.id]) ? productsByCategory[category.id] : [];
    const items = [];
    for (const [productIndex, product] of products.entries()) {
      if (!brendiActive(product)) continue;
      if (looksLikeOperationalMenuItem(product)) continue;
      const directPrice = brendiMoney(product.price);
      const options = normalizeBrendiOptions(product, sourceUrl);
      const optionDeltas = options
        .map((option) => money(option.price_delta))
        .filter((value) => value != null && value > 0);
      const maxDelta = optionDeltas.length ? Math.max(...optionDeltas) : 0;
      items.push({
        external_id: clean(product.id || product.pdvCode || product.uuid) || null,
        name: clean(product.name || product.title),
        description: clean(product.description),
        image_url: brendiAssetUrl(product.picture),
        price: directPrice,
        price_min: directPrice,
        price_max: directPrice != null ? Number((directPrice + maxDelta).toFixed(2)) : null,
        price_type: directPrice != null ? 'fixed' : 'unknown',
        price_source: directPrice != null ? 'brendi.product.price_cents' : null,
        options,
        source_url: sourceUrl,
        raw_data: product,
        extraction_confidence: directPrice != null ? 0.98 : 0.82,
        needs_review: directPrice == null,
        order_index: Number(product.order || product.position || productIndex),
      });
    }
    if (items.length) {
      categories.push({
        external_id: clean(category.id || category.uuid) || null,
        name: clean(category.name || category.title || 'Cardapio'),
        order_index: Number(category.order || categoryIndex),
        items,
      });
    }
  }
  return categories;
}

function buildBrendiDetails(menu, sourceUrl, pageDetails = {}) {
  const store = menu?.store || {};
  const address = store.address || {};
  const openingHours = brendiWorkingHoursToOpeningHours(store.workingHours);
  const hours = summarizeBrendiHours(store.workingHours);
  const formattedAddress = clean([
    address.street,
    address.number,
    address.neighborhood,
    address.city,
    address.state,
    address.zipcode,
  ].filter(Boolean).join(' '));
  const productSample = Object.values(menu?.productsByCategory || {})
    .flatMap((products) => (Array.isArray(products) ? products : []).slice(0, 4).map((product) => `${product.name} ${product.description || ''}`))
    .slice(0, 40)
    .join(' | ');
  const storeName = store.brand?.name || store.name || pageDetails.title || 'Brendi';
  const bodyTextSample = clean([
    storeName,
    store.menuSlug,
    store.phoneNumber,
    formattedAddress,
    address.complement,
    hours,
    productSample,
    pageDetails.bodyTextSample,
  ].filter(Boolean).join(' | ')).slice(0, 10000);
  return {
    url: pageDetails.url || sourceUrl,
    title: pageDetails.title || storeName,
    companySlug: store.menuSlug || parseBrendiSlug(sourceUrl),
    bodyTextSample,
    brendiStore: {
      id: store.id || null,
      name: storeName,
      slug: store.menuSlug || parseBrendiSlug(sourceUrl),
      logo: brendiAssetUrl(store.logo),
      background: brendiAssetUrl(store.banner),
      phone: formatBrazilPhone(store.phoneNumber),
      formattedAddress: formattedAddress || null,
      address,
      latitude: finiteNumber(address.lat),
      longitude: finiteNumber(address.lng),
      hours,
      openingHours,
      rawAssets: {
        logo: store.logo || null,
        banner: store.banner || null,
      },
    },
    metrics: pageDetails.metrics || null,
  };
}

async function extractBrendiNativeMenu(page, sourceUrl, targetDir) {
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForNetworkIdle({ idleTime: 1200, timeout: TIMEOUT_MS }).catch(() => null);
  await sleep(1200);
  const pageDetails = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.href,
      title: document.title,
      bodyTextSample: clean(document.body?.innerText || '').slice(0, 6000),
      html: document.documentElement?.outerHTML || '',
      metrics: {
        scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
        bodyLength: document.body?.innerHTML?.length || 0,
        imageCount: document.images?.length || 0,
      },
    };
  });
  const root = extractNuxtDataPayload(pageDetails.html);
  const slug = parseBrendiSlug(pageDetails.url || sourceUrl);
  const data = root?.data || {};
  const menuKey = `menu-${slug}`;
  const menu = data[menuKey] || Object.entries(data).find(([key]) => key.startsWith('menu-'))?.[1];
  if (!menu?.productsByCategory) throw new Error(`Brendi sem menu Nuxt detectavel para slug ${slug}.`);
  const categories = normalizeBrendiCategories(menu, pageDetails.url || sourceUrl);
  const details = buildBrendiDetails(menu, pageDetails.url || sourceUrl, pageDetails);
  const stats = summarizeCategories(categories);
  fs.writeFileSync(path.join(targetDir, 'raw-brendi-nuxt-menu.json'), JSON.stringify({
    slug,
    menuKey,
    stats,
    store: menu.store,
    categories: menu.categories,
    customs: menu.customs,
    productsByCategory: menu.productsByCategory,
  }, null, 2), 'utf8');
  if (!categories.length) throw new Error('Brendi sem categorias com itens estruturados.');
  delete pageDetails.html;
  return {
    details,
    categories,
    stats,
    endpoint: `nuxt:${menuKey}`,
    slug,
  };
}

function meuCarrinhoSlug(sourceUrl) {
  const url = new URL(sourceUrl);
  const slug = url.pathname.split('/').filter(Boolean)[0] || '';
  if (!slug) throw new Error(`MeuCarrinho sem slug detectavel: ${sourceUrl}`);
  return slug;
}

function meuCarrinhoOpeningHours(availability) {
  if (!Array.isArray(availability) || !availability.length) return null;
  const week = emptyOpeningWeek();
  const aliases = {
    domingo: 'sunday',
    segunda: 'monday',
    'segunda-feira': 'monday',
    terca: 'tuesday',
    'terca-feira': 'tuesday',
    terça: 'tuesday',
    'terça-feira': 'tuesday',
    quarta: 'wednesday',
    'quarta-feira': 'wednesday',
    quinta: 'thursday',
    'quinta-feira': 'thursday',
    sexta: 'friday',
    'sexta-feira': 'friday',
    sabado: 'saturday',
    sábado: 'saturday',
  };
  for (const slot of availability) {
    const key = aliases[normalize(slot?.weekday)] || '';
    const start = clean(slot?.hourStart);
    const end = clean(slot?.hourEnd);
    if (!key || !/^\d{1,2}:\d{2}$/.test(start) || !/^\d{1,2}:\d{2}$/.test(end)) continue;
    week[key].slots.push({ start: start.padStart(5, '0'), end: end.padStart(5, '0') });
    week[key].isOpen = true;
  }
  return Object.values(week).some((day) => day.slots.length) ? week : null;
}

function summarizeMeuCarrinhoHours(availability) {
  const opening = meuCarrinhoOpeningHours(availability);
  if (!opening) return '';
  return WEEK_DAY_KEYS
    .map((key) => {
      const slots = opening[key]?.slots || [];
      if (!slots.length) return `${key}: fechado`;
      return `${key}: ${slots.map((slot) => `${slot.start}-${slot.end}`).join(', ')}`;
    })
    .join('; ');
}

function meuCarrinhoProductImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const best = images
    .slice()
    .sort((left, right) => Number(left.priority || 0) - Number(right.priority || 0))
    .find((image) => image?.path && !/default_product/i.test(image.path));
  return best?.path || null;
}

function normalizeMeuCarrinhoOption(group, option, rule, index) {
  const groupName = clean(group?.name || group?.title || 'Opcionais');
  const name = clean(option?.name || option?.title);
  if (!groupName || !name) return null;
  if (looksLikeOperationalMenuEntity(groupName) || looksLikeOperationalMenuEntity(name)) return null;
  if (OPERATIONAL_RE.test(`${groupName} ${name}`)) return null;
  if (looksLikeInstructionalComboTitle(option, group, group?.options || group?.items || [])) return null;
  const delta = money(option?.price ?? option?.value ?? option?.additionalPrice ?? option?.additional_price);
  const included = delta == null || delta === 0;
  return {
    external_id: clean(option?.id || option?.uuid) || null,
    group_name: groupName,
    name,
    description: clean(option?.description),
    image_url: option?.image || option?.image_url || null,
    price: null,
    price_delta: included ? null : delta,
    price_behavior: included ? 'included' : 'price_delta',
    semantic_type: included ? 'included_choice' : 'addon',
    is_searchable_variant: false,
    min_quantity: rule.min_quantity,
    max_quantity: rule.max_quantity,
    is_required: rule.is_required,
    order_index: Number(option?.priority || option?.order || index),
    raw_data: option,
  };
}

function normalizeMeuCarrinhoCategories(store, categoriesPayload, productsByCategory, sourceUrl) {
  const categories = [];
  for (const [categoryIndex, category] of (categoriesPayload || []).entries()) {
    if (category?.availability && category.availability !== 'AVAILABLE') continue;
    const categoryName = clean(String(category?.name || 'Cardapio').replace(/^\d+\s*[-.)]\s*/, ''));
    if (!categoryName || looksLikeOperationalMenuEntity(categoryName)) continue;
    const products = productsByCategory.get(category.id) || [];
    const items = [];
    for (const [itemIndex, product] of products.entries()) {
      if (product?.availability && product.availability !== 'AVAILABLE') continue;
      if (looksLikeOperationalMenuItem(product)) continue;
      const name = clean(product?.name || product?.title);
      if (!name) continue;
      const directPrice = money(product?.price);
      const options = [];
      const groups = [
        ...(Array.isArray(product?.variations) ? product.variations : []),
        ...(Array.isArray(product?.options) ? product.options : []),
        ...(Array.isArray(product?.addOns) ? product.addOns : []),
        ...(Array.isArray(product?.add_ons) ? product.add_ons : []),
      ];
      for (const group of groups) {
        const children = group?.items || group?.options || group?.values || [];
        if (!Array.isArray(children) || !children.length) continue;
        const rule = inferGroupRule(group, children);
        children.forEach((option, optionIndex) => {
          const normalized = normalizeMeuCarrinhoOption(group, option, rule, optionIndex);
          if (normalized) options.push(normalized);
        });
      }
      const optionDeltas = options
        .map((option) => money(option.price_delta))
        .filter((value) => value != null && value > 0);
      const maxDelta = optionDeltas.length ? Math.max(...optionDeltas) : 0;
      items.push({
        external_id: clean(product.id || product.uuid) || null,
        name,
        description: clean(product.description),
        image_url: meuCarrinhoProductImage(product),
        price: directPrice,
        price_min: directPrice,
        price_max: directPrice != null ? Number((directPrice + maxDelta).toFixed(2)) : null,
        price_type: directPrice != null ? 'fixed' : optionDeltas.length ? 'option_only' : 'unknown',
        price_source: directPrice != null ? 'meucarrinho.product.price' : optionDeltas.length ? 'meucarrinho.product.variations' : null,
        options,
        source_url: sourceUrl,
        raw_data: product,
        extraction_confidence: directPrice != null ? 0.98 : 0.82,
        needs_review: directPrice == null,
        order_index: Number(product.priority || itemIndex),
      });
    }
    if (items.length) {
      categories.push({
        external_id: clean(category.id || category.uuid) || null,
        name: categoryName,
        order_index: Number(category.priority || categoryIndex),
        items: items.sort((left, right) => Number(left.order_index || 0) - Number(right.order_index || 0)),
      });
    }
  }
  return categories.sort((left, right) => Number(left.order_index || 0) - Number(right.order_index || 0));
}

function buildMeuCarrinhoDetails(store, categoriesPayload, productsByCategory, sourceUrl, pageDetails = {}) {
  const address = store?.address || {};
  const openingHours = meuCarrinhoOpeningHours(store?.availability);
  const hours = summarizeMeuCarrinhoHours(store?.availability);
  const formattedAddress = clean([
    address.street,
    address.streetNumber,
    address.neighborhood,
    address.city,
    address.state,
    address.postalCode,
  ].filter(Boolean).join(', '));
  const productSample = [...productsByCategory.values()]
    .flat()
    .slice(0, 90)
    .map((product) => `${product?.name || ''} ${product?.description || ''} ${product?.price ?? ''}`)
    .join(' | ');
  const bodyTextSample = clean([
    store?.name,
    store?.urlCode,
    store?.instagram,
    formattedAddress,
    store?.marketSegment?.name,
    hours,
    ...(categoriesPayload || []).slice(0, 30).map((category) => category?.name),
    productSample,
    pageDetails.bodyTextSample,
  ].filter(Boolean).join(' | ')).slice(0, 12000);

  return {
    url: pageDetails.url || sourceUrl,
    title: pageDetails.title || store?.name || 'MeuCarrinho',
    companySlug: store?.urlCode || meuCarrinhoSlug(sourceUrl),
    bodyTextSample,
    metrics: pageDetails.metrics || null,
    meuCarrinhoStore: {
      id: store?.id || null,
      name: store?.name || null,
      slug: store?.urlCode || null,
      phone: formatBrazilPhone(`${store?.whatsappDdd || store?.phoneDdd || ''}${store?.whatsappNumber || store?.phoneNumber || ''}`),
      instagram: store?.instagram ? `https://www.instagram.com/${String(store.instagram).replace(/^@/, '')}` : null,
      formattedAddress: formattedAddress || null,
      address: {
        address: clean(address.street || ''),
        number: clean(address.streetNumber || ''),
        neighborhood: clean(address.neighborhood || ''),
        city: clean(address.city || ''),
        state: clean(address.state || ''),
        cep: clean(address.postalCode || ''),
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
      },
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      hours: hours || null,
      openingHours,
      logo: store?.logoPath || null,
      background: store?.bannerPath || null,
      status: store?.status || null,
    },
  };
}

async function extractMeuCarrinhoNativeMenu(page, sourceUrl, targetDir) {
  const networkEntries = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (!/meucarrinho\.delivery\/api\/merchant\/(categories|products|urlcode)/i.test(url)) return;
    const entry = {
      url,
      status: response.status(),
      contentType: response.headers()['content-type'] || '',
      method: response.request().method(),
      body: null,
      error: null,
    };
    try {
      const text = await response.text();
      entry.textLength = text.length;
      entry.body = text ? JSON.parse(text) : null;
    } catch (error) {
      entry.error = error.message || String(error);
    }
    networkEntries.push(entry);
  });

  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForNetworkIdle({ idleTime: 1500, timeout: TIMEOUT_MS }).catch(() => null);
  await sleep(1200);
  for (let i = 0; i < 7; i += 1) {
    await page.evaluate(() => window.scrollBy(0, Math.max(500, Math.floor(window.innerHeight * 0.8)))).catch(() => null);
    await sleep(700);
  }
  await page.waitForNetworkIdle({ idleTime: 1200, timeout: TIMEOUT_MS }).catch(() => null);

  const pageDetails = await page.evaluate(() => {
    const cleanValue = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.href,
      title: document.title,
      bodyTextSample: cleanValue(document.body?.innerText || '').slice(0, 8000),
      metrics: {
        scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
        bodyLength: document.body?.innerHTML?.length || 0,
        imageCount: document.images?.length || 0,
      },
    };
  });

  const storeEntries = networkEntries.filter((entry) => /\/api\/merchant\/urlcode/i.test(entry.url) && entry.body && !entry.error);
  const categoryEntries = networkEntries.filter((entry) => /\/api\/merchant\/categories/i.test(entry.url) && Array.isArray(entry.body));
  const productEntries = networkEntries.filter((entry) => /\/api\/merchant\/products/i.test(entry.url) && Array.isArray(entry.body));
  const store = storeEntries.at(-1)?.body || null;
  const categoriesPayload = categoryEntries
    .flatMap((entry) => entry.body || [])
    .filter((category, index, list) => category?.id && list.findIndex((candidate) => candidate?.id === category.id) === index);
  const productsById = new Map();
  for (const entry of productEntries) {
    for (const product of entry.body || []) {
      if (product?.id) productsById.set(product.id, product);
    }
  }
  const productsByCategory = new Map();
  for (const product of productsById.values()) {
    if (!product.categoryId) continue;
    if (!productsByCategory.has(product.categoryId)) productsByCategory.set(product.categoryId, []);
    productsByCategory.get(product.categoryId).push(product);
  }

  const categories = normalizeMeuCarrinhoCategories(store, categoriesPayload, productsByCategory, sourceUrl);
  const stats = {
    networkEntryCount: networkEntries.length,
    categoryEntryCount: categoryEntries.length,
    productEntryCount: productEntries.length,
    categoryCount: categories.length,
    rawCategoryCount: categoriesPayload.length,
    rawProductCount: productsById.size,
    itemCount: categories.reduce((total, category) => total + (category.items || []).length, 0),
    optionCount: categories.reduce((total, category) => total + (category.items || []).reduce((itemTotal, item) => itemTotal + (item.options || []).length, 0), 0),
  };
  const details = buildMeuCarrinhoDetails(store, categoriesPayload, productsByCategory, sourceUrl, pageDetails);

  fs.writeFileSync(path.join(targetDir, 'raw-meucarrinho-network.json'), JSON.stringify({
    stats,
    networkEntries: networkEntries.map((entry) => ({
      url: entry.url,
      status: entry.status,
      contentType: entry.contentType,
      method: entry.method,
      textLength: entry.textLength || 0,
      bodyKeys: Array.isArray(entry.body) ? ['array', entry.body.length] : entry.body ? Object.keys(entry.body).slice(0, 60) : [],
      error: entry.error,
    })),
  }, null, 2), 'utf8');
  fs.writeFileSync(path.join(targetDir, 'raw-meucarrinho-menu.json'), JSON.stringify({
    sourceUrl,
    stats,
    store,
    categories: categoriesPayload,
    products: [...productsById.values()],
  }, null, 2), 'utf8');

  if (!store) throw new Error('MeuCarrinho sem dados de loja capturados em /api/merchant/urlcode.');
  if (!categories.length) throw new Error('MeuCarrinho sem categorias com itens estruturados.');
  return {
    details,
    categories,
    stats,
    endpoint: 'browserbase-network:/api/merchant/{urlcode,categories,products}',
    slug: store?.urlCode || meuCarrinhoSlug(sourceUrl),
  };
}

function extractBalancedFunctionCalls(text, functionName) {
  const calls = [];
  const needle = `${functionName}(`;
  let pos = 0;
  while ((pos = String(text || '').indexOf(needle, pos)) >= 0) {
    let index = pos + needle.length;
    let depth = 1;
    let quote = null;
    let escaped = false;
    for (; index < text.length; index += 1) {
      const ch = text[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (quote) {
        if (ch === '\\') escaped = true;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          calls.push(text.slice(pos + needle.length, index));
          index += 1;
          break;
        }
      }
    }
    pos = Math.max(index, pos + needle.length);
  }
  return calls;
}

function parseCardapioDigitalCalls(html) {
  const calls = extractBalancedFunctionCalls(html, 'openItemModal');
  const parsed = [];
  for (const call of calls) {
    if (!call.trim().startsWith('{')) continue;
    try {
      const value = vm.runInNewContext(`[${call}]`, Object.create(null), { timeout: 1000 });
      const [item, addons] = value;
      if (item?.name) parsed.push({ item, addons });
    } catch {
      // Ignore non-literal helper calls from page scripts.
    }
  }
  return parsed;
}

function cardapioDigitalAssetUrl(value, sourceUrl) {
  const url = clean(value);
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return new URL(url.startsWith('uploads/') ? url : `uploads/${url}`, sourceUrl).href;
}

function normalizeCardapioDigitalOption(group, option, rule, index, sourceUrl) {
  const name = clean(option?.name || option?.title);
  if (!name || looksLikeOperationalMenuEntity(name)) return null;
  if (OPERATIONAL_RE.test(`${group?.name || ''} ${name}`)) return null;
  const price = money(option?.price);
  const included = price == null || price === 0 || (Number(group?.free_limit || 0) > 0 && Number(option?.price || 0) === 0);
  return {
    external_id: clean(option?.id || option?.uuid) || null,
    group_name: clean(group?.name || 'Adicionais'),
    name,
    description: clean(option?.description),
    image_url: cardapioDigitalAssetUrl(option?.image, sourceUrl),
    price: null,
    price_delta: included ? null : price,
    price_behavior: included ? 'included' : 'price_delta',
    semantic_type: included ? 'included_choice' : 'addon',
    is_searchable_variant: false,
    min_quantity: rule.min_quantity,
    max_quantity: rule.max_quantity,
    is_required: rule.is_required,
    order_index: Number(option?.position || option?.order || index),
    raw_data: option,
  };
}

function normalizeCardapioDigitalCategories(parsedItems, sourceUrl) {
  const byCategory = new Map();
  for (const { item, addons } of parsedItems || []) {
    if (String(item?.is_active ?? 1) === '0') continue;
    if (looksLikeOperationalMenuItem(item)) continue;
    const categoryName = clean(item.cat_name || 'Cardapio');
    if (looksLikeOperationalMenuEntity(categoryName)) continue;
    const directPrice = money(Number(item.promotional_price) > 0 ? item.promotional_price : item.price);
    const options = [];
    const groups = Array.isArray(addons) ? addons : Object.values(addons || {});
    for (const group of groups) {
      if (String(group?.is_active ?? 1) === '0') continue;
      const groupName = clean(group?.name || 'Adicionais');
      if (!groupName || looksLikeOperationalMenuEntity(groupName) || OPERATIONAL_RE.test(groupName)) continue;
      const children = Array.isArray(group.items) ? group.items : [];
      const rule = {
        min_quantity: 0,
        max_quantity: Number(group.max_limit) > 0 ? Number(group.max_limit) : null,
        is_required: false,
      };
      children.forEach((option, optionIndex) => {
        const normalized = normalizeCardapioDigitalOption(group, option, rule, optionIndex, sourceUrl);
        if (normalized) options.push(normalized);
      });
    }
    const optionDeltas = options.map((option) => money(option.price_delta)).filter((value) => value != null && value > 0);
    const maxDelta = optionDeltas.length ? Math.max(...optionDeltas) : 0;
    const normalizedItem = {
      external_id: clean(item.id || item.uuid) || null,
      name: clean(item.name || item.title),
      description: clean(item.description),
      image_url: cardapioDigitalAssetUrl(item.image, sourceUrl),
      price: directPrice,
      price_min: directPrice,
      price_max: directPrice != null ? Number((directPrice + maxDelta).toFixed(2)) : null,
      price_type: directPrice != null ? 'fixed' : 'unknown',
      price_source: directPrice != null ? (Number(item.promotional_price) > 0 ? 'cardapiodigital.promotional_price' : 'cardapiodigital.price') : null,
      options,
      source_url: sourceUrl,
      raw_data: item,
      extraction_confidence: directPrice != null ? 0.94 : 0.78,
      needs_review: directPrice == null,
      order_index: Number(item.position || 0),
    };
    if (!normalizedItem.name) continue;
    if (!byCategory.has(categoryName)) byCategory.set(categoryName, []);
    byCategory.get(categoryName).push(normalizedItem);
  }
  return [...byCategory.entries()].map(([name, items], index) => ({
    external_id: null,
    name,
    order_index: index,
    items: items.map((item, itemIndex) => ({ ...item, order_index: item.order_index || itemIndex })),
  })).filter((category) => category.items.length);
}

function buildCardapioDigitalDetails(pageDetails, sourceUrl, parsedItems) {
  const body = pageDetails.bodyTextSample || '';
  const headerName = clean((body.match(/^\s*([^\n|]+?)(?:\s+Todos os dias|\s+\d{1,2}h|\s+Av\.|\s+R\.)/i) || [])[1]);
  const hours = clean((body.match(/Todos os dias[^|.\n]+(?:\d{1,2}h(?:\d{2})?)?/i) || [])[0]);
  const address = clean((body.match(/(?:Av\.|Avenida|R\.|Rua)\s+[^|\n]+/i) || [])[0]);
  const productSample = (parsedItems || [])
    .slice(0, 50)
    .map(({ item }) => `${item.cat_name || ''} ${item.name || ''} ${item.description || ''}`)
    .join(' | ');
  return {
    url: pageDetails.url || sourceUrl,
    title: pageDetails.title || headerName || 'Cardapio Digital',
    companySlug: new URL(sourceUrl).searchParams.get('s') || '',
    bodyTextSample: clean([headerName, hours, address, body, productSample].filter(Boolean).join(' | ')).slice(0, 10000),
    cardapioDigitalStore: {
      name: headerName || null,
      formattedAddress: address || null,
      address: { address },
      hours: hours || null,
      logo: pageDetails.logo || null,
      openingHours: null,
    },
    metrics: pageDetails.metrics || null,
  };
}

async function extractCardapioDigitalMenu(page, sourceUrl, targetDir) {
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForNetworkIdle({ idleTime: 1000, timeout: TIMEOUT_MS }).catch(() => null);
  await sleep(700);
  const pageDetails = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const logo = document.querySelector('.logo-img')?.getAttribute('src') || document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    return {
      url: location.href,
      title: document.title,
      bodyTextSample: clean(document.body?.innerText || '').slice(0, 8000),
      html: document.documentElement?.outerHTML || '',
      logo: logo ? new URL(logo, location.href).href : null,
      metrics: {
        scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
        bodyLength: document.body?.innerHTML?.length || 0,
        imageCount: document.images?.length || 0,
      },
    };
  });
  let parsedItems = parseCardapioDigitalCalls(pageDetails.html);
  let rawHtmlSource = 'browser_dom';
  if (!parsedItems.length) {
    const rawResponse = await fetch(pageDetails.url || sourceUrl);
    const rawHtml = await rawResponse.text();
    const rawParsedItems = parseCardapioDigitalCalls(rawHtml);
    if (rawParsedItems.length) {
      parsedItems = rawParsedItems;
      rawHtmlSource = `direct_fetch_http_${rawResponse.status}`;
    }
  }
  const categories = normalizeCardapioDigitalCategories(parsedItems, pageDetails.url || sourceUrl);
  const details = buildCardapioDigitalDetails(pageDetails, pageDetails.url || sourceUrl, parsedItems);
  const stats = summarizeCategories(categories);
  fs.writeFileSync(path.join(targetDir, 'raw-cardapiodigital-menu.json'), JSON.stringify({
    stats,
    pageDetails: { ...pageDetails, html: undefined },
    rawHtmlSource,
    parsedItems,
  }, null, 2), 'utf8');
  if (!categories.length) throw new Error('CardapioDigital sem categorias com itens estruturados.');
  delete pageDetails.html;
  return {
    details,
    categories,
    stats,
    endpoint: 'html:openItemModal',
  };
}

function buildYoogaDetails(store, sourceUrl, menuEndpoint, pageDetails = {}) {
  const address = store?.address || {};
  const openingHours = yoogaScheduleToOpeningHours(store?.schedule_json);
  const formattedAddress = clean(address.addressFormatted || [
    address.address,
    address.number,
    address.neighbourhood,
    address.city,
    address.state,
  ].filter(Boolean).join(' '));
  const hours = summarizeYoogaHours(store?.schedule_json);
  const bodyTextSample = clean([
    store?.name,
    store?.description,
    store?.segment_name,
    store?.status_label,
    store?.status_label_additional,
    formattedAddress,
    address.cep,
    address.city,
    address.state,
    hours,
    pageDetails.bodyTextSample,
  ].filter(Boolean).join(' | ')).slice(0, 10000);
  return {
    url: pageDetails.url || sourceUrl,
    title: pageDetails.title || store?.name || 'Yooga',
    companySlug: store?.url || parseYoogaSlug(sourceUrl),
    bodyTextSample,
    yoogaStore: {
      id: store?.id ?? null,
      idi: store?.idi ?? null,
      name: store?.name || null,
      slug: store?.url || null,
      image: store?.img || null,
      latitude: store?.latitude ?? null,
      longitude: store?.longitude ?? null,
      minimumOrder: store?.minimum_order ?? null,
      formattedAddress: formattedAddress || null,
      address,
      hours,
      openingHours,
      menuEndpoint,
    },
    metrics: pageDetails.metrics || null,
  };
}

function normalizeYoogaOption(group, option, rule, index) {
  if (entityUnavailable(option)) return null;
  if (looksLikeInstructionalComboTitle(option, group, group?.options || [])) return null;
  const name = clean(option.name || option.title);
  if (!name || looksLikeOperationalMenuEntity(name)) return null;
  const price = money(option.price);
  const included = price == null || price === 0;
  const useAbsolute = Number(group?.use_greater_option_price || 0) === 1;
  const priceBehavior = included ? 'included' : useAbsolute ? 'absolute_price' : 'price_delta';
  return {
    external_id: clean(option.id || option._id || option.uuid) || null,
    group_name: clean(group?.name || group?.title || 'Opcoes'),
    name,
    description: clean(option.description),
    image_url: option.img || option.image || null,
    price: included ? null : price,
    price_delta: included ? null : price,
    price_behavior: priceBehavior,
    min_quantity: rule.min_quantity,
    max_quantity: rule.max_quantity,
    is_required: rule.is_required,
    order_index: Number(option.order || option.position || index),
    raw_data: option,
  };
}

function normalizeYoogaCategories(payload, sourceUrl) {
  const categories = [];
  for (const category of Array.isArray(payload) ? payload : []) {
    if (looksLikeOperationalMenuEntity(category.name || category.title)) continue;
    const items = [];
    for (const item of category.items || []) {
      if (entityUnavailable(item)) continue;
      if (looksLikeOperationalMenuItem(item)) continue;
      const promotional = money(item.promotional_price);
      const directPrice = promotional != null && promotional > 0
        ? promotional
        : money(item.price ?? item.min_value ?? item.min_value_promotional);
      const options = [];
      for (const group of item.choices || item.add_ons || item.options || []) {
        if (looksLikeOperationalMenuEntity(group.name || group.title)) continue;
        const children = group.options || group.items || group.subitems || [];
        const rule = inferGroupRule(group, children);
        children.forEach((option, optionIndex) => {
          const normalized = normalizeYoogaOption(group, option, rule, optionIndex);
          if (normalized) options.push(normalized);
        });
      }
      const optionPrices = options
        .map((option) => money(option.price ?? option.price_delta))
        .filter((value) => value != null && value > 0);
      const allPrices = [directPrice, ...optionPrices].filter((value) => value != null && value > 0);
      const min = money(item.min_value) ?? (allPrices.length ? Math.min(...allPrices) : null);
      const max = allPrices.length ? Math.max(...allPrices) : null;
      items.push({
        external_id: clean(item.id || item._id || item.uuid) || null,
        name: clean(item.name || item.title),
        description: clean(item.description),
        image_url: item.img || item.image || item.image_url || null,
        price: directPrice,
        price_min: min,
        price_max: max,
        price_type: directPrice != null ? 'fixed' : optionPrices.length ? (min === max ? 'option_only' : 'range') : 'unknown',
        price_source: promotional != null && promotional > 0 ? 'yooga.item.promotional_price' : directPrice != null ? 'yooga.item.price' : optionPrices.length ? 'yooga.options' : null,
        options,
        source_url: sourceUrl,
        raw_data: item,
        extraction_confidence: allPrices.length ? 0.98 : 0.84,
        needs_review: !allPrices.length,
      });
    }
    if (items.length) {
      categories.push({
        external_id: clean(category.id || category._id || category.uuid) || null,
        name: clean(category.name || category.title || 'Cardapio'),
        order_index: categories.length,
        items,
      });
    }
  }
  return categories;
}

async function extractYoogaNativeMenu(page, sourceUrl, targetDir) {
  const slug = parseYoogaSlug(sourceUrl);
  const storeEndpoint = `https://delivery2.yooga.com.br/v2/stores/${encodeURIComponent(slug)}`;
  const menuEndpoint = `${storeEndpoint}/menu?type_query=null`;
  const [storeResult, menuResult] = await Promise.all([
    fetchYoogaJson(storeEndpoint, sourceUrl),
    fetchYoogaJson(menuEndpoint, sourceUrl),
  ]);

  let pageDetails = {};
  try {
    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await page.waitForNetworkIdle({ idleTime: 1200, timeout: TIMEOUT_MS }).catch(() => null);
    await sleep(1200);
    pageDetails = await page.evaluate(() => {
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      return {
        url: location.href,
        title: document.title,
        bodyTextSample: clean(document.body?.innerText || '').slice(0, 6000),
        metrics: {
          scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
          bodyLength: document.body?.innerHTML?.length || 0,
          imageCount: document.images?.length || 0,
        },
      };
    });
  } catch (error) {
    pageDetails = {
      url: sourceUrl,
      title: storeResult.payload?.name || 'Yooga',
      bodyTextSample: '',
      metrics: { pageError: error.message || String(error) },
    };
  }

  const categories = normalizeYoogaCategories(menuResult.payload, sourceUrl);
  const details = buildYoogaDetails(storeResult.payload, sourceUrl, menuEndpoint, pageDetails);
  const stats = summarizeCategories(categories);
  fs.writeFileSync(path.join(targetDir, 'raw-yooga-store.json'), JSON.stringify({
    endpoint: storeEndpoint,
    status: storeResult.response.status,
    textLength: storeResult.textLength,
    payload: storeResult.payload,
  }, null, 2), 'utf8');
  fs.writeFileSync(path.join(targetDir, 'raw-yooga-menu.json'), JSON.stringify({
    endpoint: menuEndpoint,
    status: menuResult.response.status,
    textLength: menuResult.textLength,
    stats,
    payload: menuResult.payload,
  }, null, 2), 'utf8');

  if (!categories.length) throw new Error('Yooga sem categorias com itens estruturados.');
  return {
    details,
    categories,
    stats,
    endpoint: menuEndpoint,
    slug,
  };
}

async function extractCardapioWebDetails(page, sourceUrl) {
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForNetworkIdle({ idleTime: 1200, timeout: TIMEOUT_MS }).catch(() => null);
  await sleep(1500);
  return await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const readStorage = (keys) => {
      for (const key of keys) {
        try {
          const value = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (value) return value;
        } catch (_) {}
      }
      return '';
    };
    const bodyText = String(document.body?.innerText || '');
    const scripts = Array.from(document.scripts || []).map((script) => script.textContent || '').join('\n').slice(0, 400000);
    const blob = [location.href, bodyText, scripts].join('\n');
    const companyId = window.companyId
      || readStorage(['company-id', 'companyId', '@cardapio-web-menu/company_id'])
      || (blob.match(/company[-_ ]?id["']?\s*[:=]\s*["']?([0-9]+)/i) || [])[1]
      || '';
    const companySlug = window.companySlug
      || readStorage(['company', 'companySlug', '@cardapio-web-menu/company'])
      || (blob.match(/companySlug["']?\s*[:=]\s*["']?([a-z0-9._-]+)/i) || [])[1]
      || location.pathname.split('/').filter(Boolean).pop()
      || '';
    return {
      url: location.href,
      title: document.title,
      companyId: String(companyId || ''),
      companySlug: String(companySlug || ''),
      bodyTextSample: clean(bodyText).slice(0, 8000),
      metrics: {
        scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
        bodyLength: document.body?.innerHTML?.length || 0,
        imageCount: document.images?.length || 0,
      },
    };
  });
}

async function extractAnotaAiNetworkMenu(page, sourceUrl, targetDir) {
  const networkEntries = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (!/api\.anota\.ai\/clientauth\/nm-category\/menu-merchant/i.test(url)) return;
    const entry = {
      url,
      status: response.status(),
      contentType: response.headers()['content-type'] || '',
      capturedAt: new Date().toISOString(),
      body: null,
      error: null,
    };
    try {
      const text = await response.text();
      entry.textLength = text.length;
      entry.body = JSON.parse(text);
    } catch (error) {
      entry.error = error.message || String(error);
    }
    networkEntries.push(entry);
  });

  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForNetworkIdle({ idleTime: 1800, timeout: TIMEOUT_MS }).catch(() => null);
  await sleep(2500);

  const details = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.href,
      title: document.title,
      bodyTextSample: clean(document.body?.innerText || '').slice(0, 10000),
      metrics: {
        scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
        bodyLength: document.body?.innerHTML?.length || 0,
        imageCount: document.images?.length || 0,
      },
    };
  });

  fs.writeFileSync(path.join(targetDir, 'anota-network-entries.json'), JSON.stringify(networkEntries.map((entry) => ({
    ...entry,
    body: entry.body ? {
      keys: Array.isArray(entry.body) ? ['array', entry.body.length] : Object.keys(entry.body).slice(0, 50),
      sample: JSON.stringify(entry.body).slice(0, 4000),
    } : null,
  })), null, 2), 'utf8');

  let best = null;
  for (const entry of networkEntries) {
    if (!entry.body) continue;
    const categories = PlatformAdapters.normalizeAnotaNetworkMenu(entry.body, details.url || sourceUrl);
    const stats = PlatformAdapters.countAnotaMenuStats(categories);
    if (!best || stats.itemCount > best.stats.itemCount || stats.optionCount > best.stats.optionCount) {
      best = { entry, categories, stats };
    }
  }

  if (!best?.categories?.length) {
    throw new Error('AnotaAI sem menu estruturado capturado em api.anota.ai/clientauth/nm-category/menu-merchant.');
  }

  fs.writeFileSync(path.join(targetDir, 'raw-anota-network-menu.json'), JSON.stringify({
    sourceEndpoint: best.entry.url,
    status: best.entry.status,
    stats: best.stats,
    body: best.entry.body,
  }, null, 2), 'utf8');

  return {
    details,
    categories: best.categories,
    stats: best.stats,
    endpoint: best.entry.url,
    networkEntryCount: networkEntries.length,
  };
}

function summarizeCategories(categories = []) {
  let itemCount = 0;
  let optionCount = 0;
  let operationalCategoryCount = 0;
  let operationalItemCount = 0;
  let operationalOptionCount = 0;
  const samples = [];
  for (const category of categories) {
    if (looksLikeOperationalMenuEntity(category.name)) operationalCategoryCount += 1;
    itemCount += (category.items || []).length;
    const sampleCategory = { name: category.name, items: [] };
    for (const item of category.items || []) {
      if (looksLikeOperationalMenuItem(item)) operationalItemCount += 1;
      optionCount += (item.options || []).length;
      operationalOptionCount += (item.options || []).filter((option) => OPERATIONAL_RE.test(`${option.group_name || ''} ${option.name || ''}`)).length;
      if (sampleCategory.items.length < 5) {
        sampleCategory.items.push({
          name: item.name,
          price: item.price ?? item.price_min ?? null,
          options: (item.options || []).slice(0, 4).map((option) => ({
            group: option.group_name,
            name: option.name,
            price: option.price,
            min: option.min_quantity,
            max: option.max_quantity,
            required: option.is_required,
          })),
        });
      }
    }
    if (samples.length < 6 && sampleCategory.items.length) samples.push(sampleCategory);
  }
  return { categoryCount: categories.length, itemCount, optionCount, operationalCategoryCount, operationalItemCount, operationalOptionCount, samples };
}

function digits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function significantTokens(value) {
  const stopwords = new Set(['bar', 'restaurante', 'pizzaria', 'lanchonete', 'delivery', 'cabedelo', 'pb', 'paraiba', 'praia', 'do', 'da', 'de', 'dos', 'das', 'e', 'em', 'com']);
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !stopwords.has(token));
}

function hasTokenEvidence(haystack, value, minHits = 2) {
  const tokens = significantTokens(value);
  if (!tokens.length) return false;
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return hits >= Math.min(minHits, tokens.length);
}

function sourceIdentityEvidence(details, target) {
  const haystack = normalize([
    details?.title,
    details?.url,
    details?.companySlug,
    details?.bodyTextSample,
  ].filter(Boolean).join(' '));
  const bodyOnly = normalize(details?.bodyTextSample || '');
  const pageDigits = digits(details?.bodyTextSample || '');
  const phoneDigits = digits(target.phone || '');
  const address = clean(target.address || '');
  const addressNumber = (address.match(/\b\d{1,6}\b/) || [])[0] || '';
  const city = normalize(target.city || '');
  const state = normalize(target.state || '');
  const pageHasPhone = phoneDigits.length >= 8 && pageDigits.includes(phoneDigits.slice(-8));
  const pageHasCity = city && bodyOnly.includes(city);
  const pageHasState = state && new RegExp(`\\b${state}\\b`).test(bodyOnly);
  const pageHasAddress = address
    && hasTokenEvidence(bodyOnly, address, 2)
    && (!addressNumber || bodyOnly.includes(addressNumber));
  const pageHasName = hasTokenEvidence(haystack, target.restaurantName, 2);
  const urlHasName = hasTokenEvidence(normalize(details?.url || details?.companySlug || ''), target.restaurantName, 2);
  const confirmed = Boolean(pageHasName && (pageHasPhone || pageHasAddress || pageHasCity || pageHasState));
  return {
    confirmed,
    pageHasName,
    urlHasName,
    pageHasPhone,
    pageHasAddress,
    pageHasCity,
    pageHasState,
    evidence: {
      targetName: target.restaurantName,
      targetAddress: target.address || null,
      targetPhoneLast8: phoneDigits ? phoneDigits.slice(-8) : null,
      targetCity: target.city || null,
      targetState: target.state || null,
    },
  };
}

function sourceIdentityForTarget(details, target) {
  const identity = sourceIdentityEvidence(details, target);
  const sourceLabel = clean(target.queueEntry?.other_url_label || target.queueEntry?.source_label || '');
  const fromValidatedInstagramBio = /bio.*instagram|instagram.*bio/i.test(sourceLabel)
    && (target.queueEntry?.source_field === 'other_url' || target.queueEntry?.other_url);
  if (
    !identity.confirmed
    && fromValidatedInstagramBio
    && (
      identity.pageHasName
      || identity.urlHasName
      || identity.pageHasAddress
      || (identity.pageHasCity && identity.pageHasState)
    )
  ) {
    return {
      ...identity,
      confirmed: true,
      bioLinkTrust: true,
      bioLinkTrustReason: 'Link veio da bio do Instagram ja validado e a pagina confirma nome, endereco ou cidade/UF do restaurante.',
    };
  }
  return identity;
}

function runImporter(restaurantId, evidencePath, dryRun = true) {
  return new Promise((resolve) => {
    const childArgs = ['scratch/hybrid_menu_extractor_v2.cjs', '--id', restaurantId, '--evidence-file', evidencePath];
    if (dryRun) childArgs.push('--dry-run');
    const child = spawn(process.execPath, childArgs, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      const resultLine = stdout.split(/\r?\n/).find((line) => line.startsWith('RESULT:'));
      let result = null;
      if (resultLine) {
        try {
          result = JSON.parse(resultLine.slice('RESULT:'.length));
        } catch (error) {
          result = { success: false, error: `RESULT invalido: ${error.message}` };
        }
      }
      resolve({ code, result, stdoutTail: stdout.slice(-4000), stderrTail: stderr.slice(-4000) });
    });
  });
}

function countOperationalInDryRun(dryRunResult) {
  let count = 0;
  let categoryCount = 0;
  let itemCount = 0;
  let optionCount = 0;
  for (const category of dryRunResult?.categories || []) {
    if (looksLikeOperationalMenuEntity(category.name)) {
      count += 1;
      categoryCount += 1;
    }
    for (const item of category.items || []) {
      if (looksLikeOperationalMenuItem(item)) {
        count += 1;
        itemCount += 1;
      }
      const allOptions = [
        ...(item.options || []),
        ...(item.option_groups || []).flatMap((group) => group.items || []),
      ];
      const foundOptions = allOptions.filter((option) => OPERATIONAL_RE.test(`${option.group_name || ''} ${option.name || ''}`)).length;
      count += foundOptions;
      optionCount += foundOptions;
    }
  }
  return { total: count, categoryCount, itemCount, optionCount };
}

function classify({ dryRun, rawSummary, identity }) {
  const flags = [];
  const audit = dryRun?.result?.audit || {};
  const dryRunApproved = dryRun?.result?.success === true && audit.approved === true;
  const dryRunOperational = countOperationalInDryRun(dryRun?.result);
  if (!identity?.confirmed) flags.push('source_identity_not_confirmed');
  if (!dryRunApproved) flags.push('dry_run_not_approved');
  if (dryRunOperational.total > 0) flags.push('operational_entities_after_importer_cleanup');
  if ((rawSummary.itemCount || 0) <= 0) flags.push('no_items');
  if (Number(audit.pricedRatio ?? 0) < 0.95) flags.push('price_coverage_review');
  if (Number(audit.unresolvedPriceCount ?? 0) > 0) flags.push('unresolved_prices');
  return {
    tier: flags.length ? 'yellow' : 'green',
    flags,
    dryRunApproved,
    dryRunOperationalEntityCount: dryRunOperational.total,
    dryRunOperationalCategoryCount: dryRunOperational.categoryCount,
    dryRunOperationalItemCount: dryRunOperational.itemCount,
    dryRunOperationalOptionCount: dryRunOperational.optionCount,
    itemCount: rawSummary.itemCount || 0,
    optionCount: rawSummary.optionCount || 0,
    rawOperationalCategoryCount: rawSummary.operationalCategoryCount || 0,
    rawOperationalItemCount: rawSummary.operationalItemCount || 0,
    rawOperationalOptionCount: rawSummary.operationalOptionCount || 0,
    identity: identity || null,
    audit,
  };
}

async function collectOne(browser, target, index) {
  const dir = path.join(OUT_DIR, `${String(index + 1).padStart(3, '0')}-${safeSlug(target.restaurantName)}`);
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });

  const entry = {
    restaurantId: target.restaurantId,
    restaurantName: target.restaurantName,
    platform: target.platform,
    sourceUrl: target.sourceUrl,
    evidenceDir: dir,
    startedAt: new Date().toISOString(),
    details: null,
    rawSummary: null,
    evidencePath: null,
    dryRun: null,
    review: null,
    committed: false,
    commit: null,
    error: null,
  };

  try {
    let details = null;
    let categories = [];
    let endpoint = null;
    let evidencePlatform = target.platform;
    let probeSource = '';
    let probeExtra = {};

    if (target.platform === 'cardapioweb') {
      details = await extractCardapioWebDetails(page, target.sourceUrl);
      if (!details.companyId || !details.companySlug) throw new Error('CardapioWeb sem company/company-id detectavel.');
      endpoint = 'https://integracao.cardapioweb.com/api/menu/company/categories?only_available_for=delivery&origin=catalogo';
      const response = await fetch(endpoint, {
        headers: {
          company: details.companySlug,
          'company-id': String(details.companyId),
          sessionid: `structured_${Math.random().toString(36).slice(2, 12)}`,
        },
      });
      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(`CardapioWeb API retornou nao JSON: ${text.slice(0, 200)}`);
      }
      fs.writeFileSync(path.join(dir, 'raw-cardapioweb-response.json'), JSON.stringify({
        endpoint,
        status: response.status,
        ok: response.ok,
        details,
        payload,
      }, null, 2), 'utf8');
      if (!response.ok) throw new Error(`CardapioWeb API HTTP ${response.status}`);
      categories = normalizeCardapioWebCategories(payload, target.sourceUrl);
      evidencePlatform = 'cardapio_web';
      probeSource = 'browserbase_plus_cardapioweb_native_api';
      probeExtra = { companyId: details.companyId, companySlug: details.companySlug };
    } else if (target.platform === 'anota_ai') {
      const anota = await extractAnotaAiNetworkMenu(page, target.sourceUrl, dir);
      details = anota.details;
      categories = anota.categories;
      endpoint = anota.endpoint;
      evidencePlatform = 'anota_ai_network';
      probeSource = 'browserbase_plus_anota_ai_network_menu';
      probeExtra = { anotaStats: anota.stats, networkEntryCount: anota.networkEntryCount };
    } else if (target.platform === 'restaurantlogin') {
      const restaurantLogin = await extractRestaurantLoginNativeMenu(page, target.sourceUrl, dir);
      details = restaurantLogin.details;
      categories = restaurantLogin.categories;
      endpoint = restaurantLogin.endpoint;
      evidencePlatform = 'restaurantlogin_native_api';
      probeSource = 'browserbase_plus_restaurantlogin_cart_api';
      probeExtra = {
        restaurantLoginStats: restaurantLogin.stats,
        menuUrl: restaurantLogin.menuUrl,
        networkEntryCount: restaurantLogin.networkEntryCount,
      };
    } else if (target.platform === 'yooga') {
      const yooga = await extractYoogaNativeMenu(page, target.sourceUrl, dir);
      details = yooga.details;
      categories = yooga.categories;
      endpoint = yooga.endpoint;
      evidencePlatform = 'yooga_native_api';
      probeSource = 'browserbase_plus_yooga_native_api';
      probeExtra = { yoogaStats: yooga.stats, yoogaSlug: yooga.slug };
    } else if (target.platform === 'whatsmenu') {
      const whatsMenu = await extractWhatsMenuNativeMenu(page, target.sourceUrl, dir);
      details = whatsMenu.details;
      categories = whatsMenu.categories;
      endpoint = whatsMenu.endpoint;
      evidencePlatform = 'whatsmenu_native_api';
      probeSource = 'browserbase_plus_whatsmenu_native_api';
      probeExtra = { whatsMenuStats: whatsMenu.stats, whatsMenuSlug: whatsMenu.slug };
    } else if (target.platform === 'brendi') {
      const brendi = await extractBrendiNativeMenu(page, target.sourceUrl, dir);
      details = brendi.details;
      categories = brendi.categories;
      endpoint = brendi.endpoint;
      evidencePlatform = 'brendi_nuxt_payload';
      probeSource = 'browserbase_plus_brendi_nuxt_payload';
      probeExtra = { brendiStats: brendi.stats, brendiSlug: brendi.slug };
    } else if (target.platform === 'cardapiodigital') {
      const cardapioDigital = await extractCardapioDigitalMenu(page, target.sourceUrl, dir);
      details = cardapioDigital.details;
      categories = cardapioDigital.categories;
      endpoint = cardapioDigital.endpoint;
      evidencePlatform = 'cardapiodigital_html_payload';
      probeSource = 'browserbase_plus_cardapiodigital_open_item_modal';
      probeExtra = { cardapioDigitalStats: cardapioDigital.stats };
    } else if (target.platform === 'instadelivery') {
      const instaDelivery = await extractInstaDeliveryNativeMenu(page, target.sourceUrl, dir);
      details = instaDelivery.details;
      categories = instaDelivery.categories;
      endpoint = instaDelivery.endpoint;
      evidencePlatform = 'instadelivery_native_api';
      probeSource = 'browserbase_plus_instadelivery_native_api';
      probeExtra = { instaDeliveryStats: instaDelivery.stats, instaDeliverySlug: instaDelivery.slug };
    } else if (target.platform === 'meucarrinho') {
      const meuCarrinho = await extractMeuCarrinhoNativeMenu(page, target.sourceUrl, dir);
      details = meuCarrinho.details;
      categories = meuCarrinho.categories;
      endpoint = meuCarrinho.endpoint;
      evidencePlatform = 'meucarrinho_native_api';
      probeSource = 'browserbase_plus_meucarrinho_network_api';
      probeExtra = { meuCarrinhoStats: meuCarrinho.stats, meuCarrinhoSlug: meuCarrinho.slug };
    } else {
      throw new Error(`structured collector ainda nao implementou ${target.platform}`);
    }

    entry.details = details;
    const screenshotPath = path.join(dir, 'browserbase-full-page.jpg');
    await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 72, fullPage: true }).catch(() => null);
    await page.close().catch(() => null);

    entry.rawSummary = summarizeCategories(categories);
    const identity = sourceIdentityForTarget(details, target);
    const sourceStore = details?.yoogaStore || details?.whatsMenuStore || details?.brendiStore || details?.cardapioDigitalStore || details?.instaDeliveryStore || details?.meuCarrinhoStore || details?.restaurantLoginStore || {};
    const sourceAddress = sourceStore.address || {};
    const sourceLatitude = finiteNumber(sourceStore.latitude ?? sourceAddress.latitude);
    const sourceLongitude = finiteNumber(sourceStore.longitude ?? sourceAddress.longitude);
    const evidence = {
      success: categories.length > 0,
      sourceUrl: target.sourceUrl,
      finalUrl: details.url || target.sourceUrl,
      platform: evidencePlatform,
      extractionLevel: 0,
      confidence: 0.98,
      categories,
      visualVerification: {
        status: 'browserbase_structured_probe',
        browserbaseFullPagePath: screenshotPath,
        fullPage: true,
        truncated: false,
        domMetrics: details.metrics || null,
      },
      structuredProbe: {
        source: probeSource,
        endpoint,
        ...probeExtra,
        rawSummary: entry.rawSummary,
        sourceIdentity: identity,
      },
      restaurant: {
        id: target.restaurantId,
        name: target.restaurantName,
        address: clean(sourceAddress.address || sourceAddress.street || target.address || '') || null,
        number: clean(sourceAddress.number || '') || null,
        neighborhood: clean(sourceAddress.neighbourhood || sourceAddress.neighborhood || sourceAddress.neigborhood || '') || null,
        city: clean(sourceAddress.city || target.city || '') || null,
        state: clean(sourceAddress.state || target.state || '') || 'PB',
        cep: clean(sourceAddress.cep || sourceAddress.zipcode || '') || null,
        phone: sourceStore.phone || target.phone || null,
        latitude: sourceLatitude,
        longitude: sourceLongitude,
        opening_hours: sourceStore.openingHours || null,
        image_url: sourceStore.image || sourceStore.logo || null,
        cover_image_url: sourceStore.background || null,
      },
    };
    const evidencePath = path.join(dir, 'menu-evidence.json');
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');
    entry.evidencePath = evidencePath;

    const dryRun = await runImporter(target.restaurantId, evidencePath, true);
    entry.dryRun = dryRun;
    fs.writeFileSync(path.join(dir, 'dry-run.json'), JSON.stringify(dryRun, null, 2), 'utf8');
    entry.review = classify({ dryRun, rawSummary: entry.rawSummary, identity });

    if (APPLY && entry.review.tier === 'green') {
      const commit = await runImporter(target.restaurantId, evidencePath, false);
      entry.commit = commit;
      entry.committed = commit.result?.success === true;
      fs.writeFileSync(path.join(dir, 'commit.json'), JSON.stringify(commit, null, 2), 'utf8');
    } else if (APPLY) {
      entry.commitSkippedReason = `review_tier_${entry.review.tier}`;
    }
  } catch (error) {
    entry.error = error.message || String(error);
    try { await page.close(); } catch (_) {}
  }
  entry.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(entry, null, 2), 'utf8');
  return entry;
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function loop() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, loop));
  return results;
}

function writeSummary(summary) {
  const reviews = summary.processed.map((entry) => entry.review).filter(Boolean);
  summary.counts = {
    processed: summary.processed.length,
    committed: summary.processed.filter((entry) => entry.committed).length,
    errors: summary.processed.filter((entry) => entry.error).length,
    green: reviews.filter((review) => review.tier === 'green').length,
    yellow: reviews.filter((review) => review.tier === 'yellow').length,
    red: reviews.filter((review) => review.tier === 'red').length,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  const lines = [
    `# Structured Menu Collection ${summary.runId}`,
    '',
    `Platform: ${summary.platform}`,
    `Apply: ${summary.apply}`,
    `Targets: ${summary.targetCount}`,
    `Processed: ${summary.counts.processed}`,
    `Green: ${summary.counts.green}`,
    `Yellow: ${summary.counts.yellow}`,
    `Committed: ${summary.counts.committed}`,
    `Errors: ${summary.counts.errors}`,
    '',
    '## Results',
  ];
  for (const entry of summary.processed) {
    lines.push('');
    lines.push(`### ${entry.restaurantName}`);
    lines.push(`- Review: ${entry.review?.tier || 'error'} ${(entry.review?.flags || []).join(', ') || ''}`);
    lines.push(`- Items/options raw: ${entry.rawSummary?.itemCount ?? 0} / ${entry.rawSummary?.optionCount ?? 0}`);
    lines.push(`- Raw operational category/item/options: ${entry.rawSummary?.operationalCategoryCount ?? 0} / ${entry.rawSummary?.operationalItemCount ?? 0} / ${entry.rawSummary?.operationalOptionCount ?? 0}`);
    lines.push(`- Dry-run approved: ${entry.review?.dryRunApproved ?? false}`);
    lines.push(`- Dry-run operational after cleanup category/item/options: ${entry.review?.dryRunOperationalCategoryCount ?? 'n/a'} / ${entry.review?.dryRunOperationalItemCount ?? 'n/a'} / ${entry.review?.dryRunOperationalOptionCount ?? 'n/a'}`);
    lines.push(`- Committed: ${entry.committed}`);
    lines.push(`- Evidence: ${entry.evidencePath || entry.evidenceDir}`);
    if (entry.error) lines.push(`- Error: ${entry.error}`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'report.md'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const env = readEnv();
  const { queuePath, targets } = loadTargets();
  if (!targets.length) throw new Error('Nenhum alvo elegivel encontrado.');
  const browserbase = await createBrowserbaseSession(env);
  const browser = await puppeteer.connect({
    browserWSEndpoint: browserbase.connectUrl,
    defaultViewport: null,
    protocolTimeout: TIMEOUT_MS + 60000,
  });
  const summary = {
    runId: RUN_ID,
    outDir: OUT_DIR,
    queuePath,
    platform: PLATFORM,
    apply: APPLY,
    concurrency: CONCURRENCY,
    targetCount: targets.length,
    browserbase: {
      sessionId: browserbase.session.id,
      keepSession: KEEP_BROWSERBASE_SESSION,
    },
    targets,
    processed: [],
    release: null,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'targets.json'), JSON.stringify(targets, null, 2), 'utf8');
  try {
    summary.processed = await runPool(targets, async (target, index) => {
      console.log(`[${index + 1}/${targets.length}] ${target.restaurantName}`);
      const entry = await collectOne(browser, target, index);
      console.log(`  ${entry.review?.tier || 'erro'} | items=${entry.rawSummary?.itemCount ?? 0} options=${entry.rawSummary?.optionCount ?? 0} dry=${entry.review?.dryRunApproved ?? false} commit=${entry.committed}`);
      writeSummary({ ...summary, processed: summary.processed.filter(Boolean).concat(entry) });
      return entry;
    });
  } finally {
    await browser.disconnect().catch(() => null);
    summary.release = await releaseBrowserbaseSession(browserbase.apiKey, browserbase.session.id);
    writeSummary(summary);
  }
  console.log(JSON.stringify({
    success: true,
    runId: RUN_ID,
    outDir: OUT_DIR,
    counts: summary.counts,
    report: path.join(OUT_DIR, 'report.md'),
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ success: false, runId: RUN_ID, outDir: OUT_DIR, error: error.message || String(error) }, null, 2));
  process.exitCode = 1;
});
