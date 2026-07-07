import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0) || null;
const OFFSET = Number(process.argv.find((arg) => arg.startsWith('--offset='))?.split('=')[1] || 0);
const VISIBLE_MS = Number(process.argv.find((arg) => arg.startsWith('--visible-ms='))?.split('=')[1] || 1000);
const APPLY = !process.argv.includes('--no-update');
const COMMAND_BASE = 'http://127.0.0.1:8080/api/local-collector';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'google-maps-base-collection', RUN_ID);
const CHECKPOINT_FILE = path.join(OUT_DIR, 'results.jsonl');
const SUMMARY_FILE = path.join(OUT_DIR, 'summary.json');
const EXTENSION_ID = process.env.FF_EXTENSION_ID || 'kehbedmdplkodjgfiohgnebicblmhghe';
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readEnv = () => {
  const env = {};
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
};

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const decodeLoose = (value) => {
  const raw = String(value || '');
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '));
  } catch {
    return raw.replace(/\+/g, ' ');
  }
};

const fetchAll = async (supabase, table, select, apply = (query) => query) => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await apply(supabase.from(table).select(select).range(from, from + 999));
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
};

const targetPredicate = (restaurant) => {
  if (restaurant.is_deleted === true) return false;
  const city = normalize(restaurant.city);
  const mapsUrl = normalize(decodeLoose(restaurant.google_maps_url));
  const mapsName = normalize(restaurant.google_maps_name);
  const name = normalize(restaurant.name);
  const context = normalize(`${restaurant.city} ${restaurant.state} ${restaurant.address} ${restaurant.location_issue_reason}`);
  if (context.includes('campina grande do sul') || normalize(restaurant.state) === 'pr') return false;
  return city.includes('campina grande')
    || mapsUrl.includes('campina grande')
    || mapsName.includes('campina grande')
    || name.includes('campina grande');
};

const commandFetch = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${url}: HTTP ${response.status}`);
  return response.json();
};

const clearCommandState = async () => {
  await commandFetch(`${COMMAND_BASE}/extension-command`, { method: 'DELETE' }).catch(() => null);
  await commandFetch(`${COMMAND_BASE}/extension-command-result`, { method: 'DELETE' }).catch(() => null);
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
    if (!clicked) throw new Error(`Nao consegui clicar reload da extensao ${EXTENSION_ID}`);
  } finally {
    await browser.disconnect();
  }
};

const runExtensionCommand = async (restaurant) => {
  await commandFetch(`${COMMAND_BASE}/extension-command-result`, { method: 'DELETE' }).catch(() => null);
  const query = `${restaurant.google_maps_name || restaurant.name || ''} Campina Grande PB`.replace(/\s+/g, ' ').trim();
  const payload = {
    type: 'google_maps_place_info',
    label: `maps-base-${restaurant.id}`,
    name: query,
    query,
    mapUrl: restaurant.google_maps_url || '',
    googleMapsUrl: restaurant.google_maps_url || '',
    active: true,
    closeTabAfter: true,
    visibleDelayMs: VISIBLE_MS,
  };
  const posted = await commandFetch(`${COMMAND_BASE}/extension-command`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const commandId = posted.command?.id;
  if (!commandId) throw new Error('Extensao nao retornou command id.');
  await wakeExtension();

  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const state = await commandFetch(`${COMMAND_BASE}/extension-command-result`);
    const hit = (state.results || []).find((entry) => String(entry.commandId) === String(commandId));
    if (hit) return hit.result || hit;
    await sleep(1000);
  }
  throw new Error(`Timeout aguardando extensao para ${restaurant.name}`);
};

const parseGoogleMapsAddress = (fullAddress) => {
  let street = '';
  let number = '';
  let neighborhood = '';
  let city = '';
  let state = '';
  let cep = '';
  if (!fullAddress) return { street, number, neighborhood, city, state, cep };

  let working = String(fullAddress).replace(/\s+/g, ' ').trim();
  working = working
    .replace(/\s*,?\s*(?:Brazil|Brasil)\s*[;,.]*\s*$/i, '')
    .replace(/^[^\p{L}\d]*(?=(?:R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|Pra[cç]a|Alameda|Estrada|\d))/iu, '')
    .trim();
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
  working = working.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  const parts = working.split(',').map((part) => part.trim()).filter(Boolean);

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
      } else {
        street += `, ${second}`;
      }
    } else if (/^\d+/.test(second) || normalize(second) === 's/n') {
      number = second;
    } else {
      neighborhood = second;
    }
    const rest = parts.slice(2).join(', ').trim();
    const restHyphen = rest.indexOf(' - ');
    if (restHyphen !== -1 && !neighborhood) {
      neighborhood = rest.slice(0, restHyphen).trim();
      city = rest.slice(restHyphen + 3).trim();
    } else {
      city = rest;
    }
  } else if (parts.length === 2) {
    street = parts[0];
    const second = parts[1];
    const hyphen = second.indexOf(' - ');
    if (hyphen !== -1) {
      neighborhood = second.slice(0, hyphen).trim();
      city = second.slice(hyphen + 3).trim();
    } else {
      city = second;
    }
    const numInStreet = street.match(/,\s*(\d+[A-Za-z]?)\s*$/);
    if (numInStreet) {
      number = numInStreet[1];
      street = street.substring(0, street.lastIndexOf(numInStreet[0])).trim();
    }
  } else {
    street = working;
  }

  return { street, number, neighborhood, city, state, cep };
};

const extractCoordsFromUrl = (url) => {
  if (!url) return null;
  const text = String(url);
  const match = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    || text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    || text.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
  return match ? { lat: Number(match[1]), lng: Number(match[2]) } : null;
};

const isGenericSearchName = (value) => /^(google maps|google|search|resultados|centro|prata|catole|catole|liberdade|malvinas|alto branco|jose pinheiro|santa rosa|serrotao|palmeira|cruzeiro|dinamerica|quarenta|monte santo)$/i.test(normalize(value));

const looksLikeCampinaAddress = (value) => {
  const text = String(value || '').trim();
  if (!text) return false;
  if (/update location|send feedback|privacy|terms|footer links|help/i.test(text)) return false;
  return /Campina Grande/i.test(text)
    || /(?:R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|Alameda|Estrada|Pra[cç]a)/i.test(text);
};

const parseLogs = (value) => {
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

const normalizeResult = (result = {}) => {
  const address = String(result.address || '').replace(/\s+/g, ' ').trim();
  return {
    ...result,
    name: String(result.name || result.title || '').replace(/\s+/g, ' ').trim(),
    address,
    rating: result.rating == null ? null : Number(result.rating),
    reviewsCount: result.reviewsCount ?? result.reviews_count ?? result.google_reviews_count ?? null,
    openingHours: result.scheduleIsWeekly ? result.schedule : null,
    currentUrl: result.currentUrl || result.finalUrl || '',
  };
};

const buildUpdate = (restaurant, rawResult) => {
  const result = normalizeResult(rawResult);
  const usableName = result.name && !isGenericSearchName(result.name);
  const addressInCampinaGrandePb = /Campina Grande\s*(?:-\s*PB|,\s*PB|\/PB)?\b/i.test(result.address || '')
    && !/Campina Grande do Sul/i.test(result.address || '');
  const outOfScopeAddress = Boolean(
    result.address
    && !addressInCampinaGrandePb
    && /(?:-\s*[A-Z]{2}\b|,\s*[A-Z]{2}\b|\/[A-Z]{2}\b)/.test(result.address)
  );
  const usableAddress = looksLikeCampinaAddress(result.address) && addressInCampinaGrandePb;
  const hasClosedStatus = result.isPermanentlyClosed || result.isTemporarilyClosed
    || /permanent|permanentemente|temporariamente|temporarily/i.test(`${result.businessStatus || ''} ${result.statusText || ''}`);
  const hasReliableBase = !outOfScopeAddress
    && Boolean(usableAddress || hasClosedStatus || (usableName && (result.phone || result.category || result.rating || result.reviewsCount)));
  const coords = extractCoordsFromUrl(restaurant.google_maps_url || result.currentUrl);
  const parsed = parseGoogleMapsAddress(usableAddress ? result.address : '');
  const previousLogs = parseLogs(restaurant.coleta_logs);
  const reviewsCount = result.reviewsCount == null ? null : Number(String(result.reviewsCount).replace(/[^\d]/g, ''));
  const rating = Number.isFinite(result.rating) && result.rating > 0 ? result.rating : null;
  const issue = outOfScopeAddress
    ? `Google Maps apontou outro municipio/estado: ${result.address}.`
    : hasReliableBase
      ? null
      : 'Google Maps/Search nao retornou painel confiavel; dados exigem revisao manual.';

  const update = {
    google_maps_name: usableName ? result.name : (restaurant.google_maps_name || restaurant.name),
    city: addressInCampinaGrandePb ? 'Campina Grande' : (restaurant.city || 'Campina Grande'),
    state: addressInCampinaGrandePb ? 'PB' : (restaurant.state || 'PB'),
    location_issue_reason: issue,
    coleta_logs: {
      ...previousLogs,
      google_maps_base: {
        collectedAt: new Date().toISOString(),
        success: hasReliableBase,
        source: 'chrome_extension_google_maps_place_info',
        name: result.name || null,
        address: result.address || null,
        rating,
        reviews_count: reviewsCount,
        businessStatus: result.businessStatus || null,
        statusText: result.statusText || null,
        scheduleIsWeekly: Boolean(result.scheduleIsWeekly),
        googleSearchFallbackUsed: Boolean(result.googleSearchFallback),
        currentUrl: result.currentUrl || null,
        finalUrl: result.finalUrl || null,
        error: outOfScopeAddress ? issue : (result.error || null),
      },
    },
  };

  if (usableName) update.name = result.name;
  if (usableAddress) {
    update.address = parsed.street || result.address;
    update.number = parsed.number || null;
    update.neighborhood = parsed.neighborhood || null;
    update.cep = parsed.cep || null;
  }
  if (outOfScopeAddress) {
    update.is_deleted = true;
    update.is_published = false;
    update.ai_validated = false;
    update.menu_status = 'unavailable';
    update.menu_status_reason = issue;
  }
  if (result.phone) update.phone = result.phone;
  if (rating != null || hasReliableBase) update.rating = rating;
  if (reviewsCount != null || hasReliableBase) update.reviews_count = reviewsCount;
  if (result.openingHours) update.opening_hours = result.openingHours;
  if (coords) {
    update.latitude = coords.lat;
    update.longitude = coords.lng;
  }
  return { update, hasReliableBase, result };
};

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const env = readEnv();
  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
  );

  const all = await fetchAll(
    supabase,
    'restaurants',
    'id,created_at,name,google_maps_name,google_maps_url,address,number,neighborhood,city,state,cep,phone,rating,reviews_count,opening_hours,coleta_logs,is_deleted,location_issue_reason',
    (query) => query.not('google_maps_url', 'is', null).order('created_at', { ascending: true }),
  );
  const targets = all.filter(targetPredicate).slice(OFFSET, LIMIT ? OFFSET + LIMIT : undefined);
  const summary = { runId: RUN_ID, offset: OFFSET, limit: LIMIT, total: targets.length, ok: 0, review: 0, failed: 0 };
  console.log(JSON.stringify({ runId: RUN_ID, offset: OFFSET, limit: LIMIT, total: targets.length, apply: APPLY }, null, 2));

  await clearCommandState();
  for (let index = 0; index < targets.length; index += 1) {
    const restaurant = targets[index];
    try {
      const rawResult = await runExtensionCommand(restaurant);
      const { update, hasReliableBase, result } = buildUpdate(restaurant, rawResult);
      if (APPLY) {
        const { error } = await supabase.from('restaurants').update(update).eq('id', restaurant.id);
        if (error) throw error;
      }
      if (hasReliableBase) summary.ok += 1;
      else summary.review += 1;
      const record = {
        index: index + 1,
        globalIndex: OFFSET + index,
        total: targets.length,
        id: restaurant.id,
        name: restaurant.name,
        ok: hasReliableBase,
        extractedName: result.name || null,
        address: result.address || null,
        rating: update.rating ?? null,
        reviewsCount: update.reviews_count ?? null,
        weeklyHours: Boolean(update.opening_hours),
        issue: update.location_issue_reason || null,
      };
      fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(record)}\n`);
      console.log(JSON.stringify(record));
    } catch (error) {
      summary.failed += 1;
      const record = {
        index: index + 1,
        globalIndex: OFFSET + index,
        total: targets.length,
        id: restaurant.id,
        name: restaurant.name,
        ok: false,
        error: error.message,
      };
      fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(record)}\n`);
      console.error(JSON.stringify(record));
    }
  }
  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
