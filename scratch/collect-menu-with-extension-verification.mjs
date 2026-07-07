import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const QUEUE_ONLY = hasFlag('--queue-only') || hasFlag('--plan-only');
const LIMIT_ARG = argValue('--limit', '');
const LIMIT = LIMIT_ARG ? (Number(LIMIT_ARG) || 1) : (QUEUE_ONLY ? 10000 : 1);
const PLATFORM = argValue('--platform', '');
const ONLY_ID = argValue('--id', '');
const IDS_ARG = argValue('--ids', '');
const IDS_FILE = argValue('--ids-file', '');
const STATUS = argValue('--status', 'needs_recollection');
const CITY = argValue('--city', 'Campina Grande');
const STATE = argValue('--state', 'PB');
const LANE_ID = argValue('--lane', process.env.FF_LANE_ID || process.env.FILTERFOOD_LANE_ID || 'default');
const APPLY = hasFlag('--apply');
const COMMAND_BASE = 'http://127.0.0.1:8080/api/local-collector';
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const EXTENSION_ID = process.env.FF_EXTENSION_ID || 'kehbedmdplkodjgfiohgnebicblmhghe';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'menu-extraction-verification', RUN_ID);
const LANE_LOCK_DIR = path.join('scratch', 'menu-orchestrator', 'lane-locks');
const LANE_LOCK_PATH = path.join(LANE_LOCK_DIR, `${LANE_ID.replace(/[^A-Za-z0-9_.:-]+/g, '-')}.json`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const laneParam = () => `laneId=${encodeURIComponent(LANE_ID)}`;
const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

function readTargetIds() {
  const inlineIds = IDS_ARG
    ? IDS_ARG.split(/[,\s]+/).map((id) => id.trim()).filter(Boolean)
    : [];
  const fileIds = IDS_FILE && fs.existsSync(IDS_FILE)
    ? fs.readFileSync(IDS_FILE, 'utf8').split(/\r?\n|,/).map((id) => id.trim()).filter(Boolean)
    : [];
  return [...new Set([...inlineIds, ...fileIds])];
}

const TARGET_IDS = readTargetIds();
const TARGET_ID_ORDER = new Map(TARGET_IDS.map((id, index) => [id, index]));

function isPidAlive(pid) {
  const safePid = Number(pid);
  if (!Number.isInteger(safePid) || safePid <= 0) return false;
  try {
    process.kill(safePid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLaneLock() {
  fs.mkdirSync(LANE_LOCK_DIR, { recursive: true });
  if (fs.existsSync(LANE_LOCK_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(LANE_LOCK_PATH, 'utf8'));
      if (isPidAlive(existing.pid)) {
        throw new Error(
          `Lane ${LANE_ID} ja esta em uso pelo PID ${existing.pid} desde ${existing.startedAt || 'data desconhecida'}. `
          + 'Nao mate processo manualmente; use outra lane ou peça ao chat-mae para coordenar a parada.'
        );
      }
    } catch (error) {
      if (/ja esta em uso/.test(error.message || '')) throw error;
    }
    fs.rmSync(LANE_LOCK_PATH, { force: true });
  }

  const lock = {
    laneId: LANE_ID,
    pid: process.pid,
    runId: RUN_ID,
    outDir: OUT_DIR,
    browserURL: BROWSER_URL,
    startedAt: new Date().toISOString(),
    args,
  };
  fs.writeFileSync(LANE_LOCK_PATH, JSON.stringify(lock, null, 2), 'utf8');

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      const current = fs.existsSync(LANE_LOCK_PATH)
        ? JSON.parse(fs.readFileSync(LANE_LOCK_PATH, 'utf8'))
        : null;
      if (!current || Number(current.pid) === process.pid) {
        fs.rmSync(LANE_LOCK_PATH, { force: true });
      }
    } catch (_) {}
  };
  process.on('exit', release);
  process.on('SIGINT', () => {
    release();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    release();
    process.exit(143);
  });
  return release;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function platformOf(url) {
  const host = hostOf(url);
  if (/cardapioweb/.test(host)) return 'cardapioweb';
  if (/anota\.ai/.test(host)) return 'anota_ai';
  if (/instadelivery/.test(host)) return 'instadelivery';
  if (/brendi/.test(host)) return 'brendi';
  if (/saipos/.test(host)) return 'saipos';
  if (/ola\.click/.test(host)) return 'olaclick';
  if (/goomer/.test(host)) return 'goomer';
  if (/livemenu/.test(host)) return 'livemenu';
  if (/deliverydireto|deliverymuch/.test(host)) return 'deliverydireto';
  if (/menudino|dino/.test(host)) return 'menudino';
  if (/cardapiodigital/.test(host)) return 'cardapiodigital';
  if (/cardapio\.ai/.test(host)) return 'cardapio_ai';
  if (/whatsmenu/.test(host)) return 'whatsmenu';
  if (/accon\.ai/.test(host)) return 'accon';
  if (/diggy\.menu/.test(host)) return 'diggy';
  if (/meucarrinho\.delivery/.test(host)) return 'meucarrinho';
  if (/yooga\.app/.test(host)) return 'yooga';
  if (/pedir\.(to|delivery)/.test(host)) return 'pedir';
  return host || 'unknown';
}

const PLATFORM_PRIORITY = new Map([
  ['cardapioweb', 10],
  ['anota_ai', 20],
  ['instadelivery', 30],
  ['brendi', 35],
  ['goomer', 40],
  ['saipos', 45],
  ['olaclick', 50],
  ['livemenu', 55],
  ['deliverydireto', 60],
  ['menudino', 65],
  ['diggy', 70],
  ['meucarrinho', 75],
  ['yooga', 80],
  ['pedir', 85],
  ['cardapio_ai', 95],
  ['whatsmenu', 105],
  ['cardapiodigital', 115],
  ['accon', 120],
  ['unknown', 150],
]);

const APPLY_BLOCK_SOURCE_FLAGS = new Set([
  'ifood_rejected',
  'no_source_url',
  'unknown_platform',
  'non_menu_or_unstable_source',
  'direct_asset_not_structured_menu',
  'previous_visual_rejection',
]);

function logsOf(row) {
  if (!row?.coleta_logs) return {};
  if (typeof row.coleta_logs === 'object') return row.coleta_logs;
  try {
    return JSON.parse(row.coleta_logs);
  } catch {
    return {};
  }
}

function sourceRiskFlags(row, sourceUrl) {
  const flags = [];
  const platform = platformOf(sourceUrl);
  const host = hostOf(sourceUrl);
  const logs = logsOf(row);

  if (!sourceUrl) flags.push('no_source_url');
  if (/ifood\.com\.br/i.test(sourceUrl)) flags.push('ifood_rejected');
  if (platform === host || platform === 'unknown') flags.push('unknown_platform');
  if (['cardapio_ai', 'whatsmenu', 'cardapiodigital', 'accon'].includes(platform)) flags.push('needs_extra_visual_strategy');
  if (/doutorpizza\.com\.br/.test(host)) flags.push('multi_unit_selector');
  if (/canva\.com|share\.google|threads\.(com|net)/i.test(sourceUrl)) flags.push('non_menu_or_unstable_source');
  if (/\.(png|jpe?g|webp|gif|svg|pdf)(?:[?#].*)?$/i.test(sourceUrl)) flags.push('direct_asset_not_structured_menu');
  if (logs?.campina_menu_visual_audit_v1?.status === 'rejected') flags.push('previous_visual_rejection');
  if (logs?.campina_google_menu_search_v1?.status === 'google_no_verified_menu_source') flags.push('google_search_already_failed');
  return [...new Set(flags)];
}

function rankTarget(row) {
  const sourceUrl = menuUrl(row);
  const platform = platformOf(sourceUrl);
  const flags = sourceRiskFlags(row, sourceUrl);
  const priorityBase = PLATFORM_PRIORITY.get(platform) ?? PLATFORM_PRIORITY.get('unknown');
  let score = priorityBase + (flags.length * 15);
  if (row.instagram) score -= 2;
  if (row.phone) score -= 1;
  if (flags.includes('previous_visual_rejection')) score += 60;
  if (flags.includes('non_menu_or_unstable_source')) score += 120;
  const tier = flags.includes('ifood_rejected')
    || flags.includes('no_source_url')
    || flags.includes('non_menu_or_unstable_source')
    || flags.includes('direct_asset_not_structured_menu')
    ? 'red'
    : flags.length || priorityBase >= 95
      ? 'yellow'
      : 'green';
  return {
    score,
    tier,
    platform,
    flags,
    sourceUrl,
    nextAction: tier === 'green'
      ? 'fast_visual_review_then_import'
      : tier === 'yellow'
        ? 'visual_review_with_platform_specific_checks'
        : 'reject_or_rediscover_source',
  };
}

function queueEntry(row) {
  const rank = rankTarget(row);
  return {
    restaurantId: row.id,
    restaurantName: clean(row.google_maps_name || row.name),
    platform: rank.platform,
    sourceUrl: rank.sourceUrl,
    score: rank.score,
    tier: rank.tier,
    flags: rank.flags,
    nextAction: rank.nextAction,
    category: row.category || null,
    address: row.address || null,
    phone: row.phone || null,
    instagram: row.instagram || null,
  };
}

function csvValue(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeQueueFiles(outDir, fileBase, entries) {
  fs.writeFileSync(path.join(outDir, `${fileBase}.json`), JSON.stringify(entries, null, 2), 'utf8');
  const columns = ['tier', 'score', 'platform', 'restaurantName', 'sourceUrl', 'flags', 'nextAction', 'restaurantId'];
  const csv = [
    columns.join(','),
    ...entries.map((entry) => columns.map((column) => csvValue(entry[column])).join(',')),
  ].join('\n');
  fs.writeFileSync(path.join(outDir, `${fileBase}.csv`), csv, 'utf8');
}

function menuUrl(row) {
  const url = row.other_url || row.external_url || '';
  if (!/^https?:\/\//i.test(url)) return '';
  if (/ifood\.com\.br/i.test(url)) return '';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'anota.ai' && parsed.pathname.startsWith('/loja/')) {
      parsed.hostname = 'pedido.anota.ai';
      return parsed.toString();
    }
  } catch {}
  return url;
}

function safeSlug(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'restaurante';
}

async function fetchTargets() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,address,phone,instagram,other_url,external_url,menu_status,is_deleted,city,state,coleta_logs')
      .eq('city', CITY)
      .eq('state', STATE)
      .eq('is_deleted', false)
      .range(from, from + 999);
    if (STATUS !== 'any') query = query.eq('menu_status', STATUS);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows
    .filter((row) => !ONLY_ID || row.id === ONLY_ID)
    .filter((row) => !TARGET_IDS.length || TARGET_ID_ORDER.has(row.id))
    .filter((row) => menuUrl(row))
    .filter((row) => !PLATFORM || platformOf(menuUrl(row)) === PLATFORM)
    .sort((left, right) => {
      if (TARGET_IDS.length) {
        return (TARGET_ID_ORDER.get(left.id) ?? 999999) - (TARGET_ID_ORDER.get(right.id) ?? 999999);
      }
      const leftRank = rankTarget(left);
      const rightRank = rankTarget(right);
      return leftRank.score - rightRank.score
        || clean(left.google_maps_name || left.name).localeCompare(clean(right.google_maps_name || right.name));
    })
    .slice(0, LIMIT);
}

async function commandFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${url}: HTTP ${response.status}`);
  return response.json();
}

async function wakeExtension() {
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  try {
    const target = browser.targets().find((candidate) =>
      candidate.type() === 'service_worker'
      && candidate.url().startsWith(`chrome-extension://${EXTENSION_ID}/`)
    );
    if (target) {
      const worker = await target.worker();
      if (worker) {
        await worker.evaluate(async () => {
          if (typeof pollExtensionCommands === 'function') await pollExtensionCommands();
        }).catch(() => {});
        return;
      }
    }

    const page = await browser.newPage();
    try {
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
      if (!clicked) throw new Error(`Nao consegui recarregar a extensao ${EXTENSION_ID}.`);
    } finally {
      await page.close().catch(() => {});
    }
  } finally {
    await browser.disconnect();
  }
}

async function runExtensionCommand(command, timeoutMs = 120000) {
  await commandFetch(`${COMMAND_BASE}/extension-command-result?${laneParam()}`, { method: 'DELETE' }).catch(() => null);
  const posted = await commandFetch(`${COMMAND_BASE}/extension-command`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...command, laneId: LANE_ID }),
  });
  const commandId = posted.command?.id;
  if (!commandId) throw new Error('Extensao nao retornou command id.');
  await wakeExtension();
  const deadline = Date.now() + timeoutMs;
  let lastWake = Date.now();
  while (Date.now() < deadline) {
    const state = await commandFetch(`${COMMAND_BASE}/extension-command-result?${laneParam()}`);
    const hit = (state.results || []).find((entry) => String(entry.commandId) === String(commandId));
    if (hit) return hit;
    if (Date.now() - lastWake > 15000) {
      lastWake = Date.now();
      await wakeExtension().catch(() => {});
    }
    await sleep(1000);
  }
  throw new Error(`Timeout aguardando extensao para ${command.type || command.action}`);
}

async function extractWithExtension(menuSourceUrl) {
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  let page;
  try {
    page = await browser.newPage();
    await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    return await page.evaluate(async ({ extensionId, url }) => {
      return await new Promise((resolve) => {
        if (!globalThis.chrome?.runtime?.sendMessage) {
          resolve({ success: false, error: 'chrome.runtime.sendMessage indisponivel' });
          return;
        }
        const timer = setTimeout(() => resolve({ success: false, error: 'timeout extractMenuPlatform' }), 120000);
        chrome.runtime.sendMessage(extensionId, { action: 'extractMenuPlatform', url }, (response) => {
          clearTimeout(timer);
          const error = chrome.runtime.lastError?.message;
          resolve(error ? { success: false, error } : response);
        });
      });
    }, { extensionId: EXTENSION_ID, url: menuSourceUrl });
  } finally {
    if (page) await page.close().catch(() => {});
    await browser.disconnect();
  }
}

function summarizeCategories(categories = []) {
  const itemCount = categories.reduce((sum, category) => sum + ((category.items || []).length || 0), 0);
  const optionCount = categories.reduce((sum, category) => sum + (category.items || []).reduce((itemSum, item) => itemSum + ((item.options || []).length || 0), 0), 0);
  const operationalOptionCount = categories.reduce((sum, category) => sum + (category.items || []).reduce((itemSum, item) => {
    const count = (item.options || []).filter((option) => /\b(ketchup|talher|talheres|guardanapo|descartavel|descartaveis|sacola|embalagem|cpf|troco)\b/i.test(`${option.group_name || ''} ${option.name || ''}`)).length;
    return itemSum + count;
  }, 0), 0);
  return {
    categoryCount: categories.length,
    itemCount,
    optionCount,
    operationalOptionCount,
    samples: categories.slice(0, 5).map((category) => ({
      name: category.name,
      count: (category.items || []).length,
      items: (category.items || []).slice(0, 5).map((item) => ({
        name: item.name,
        price: item.display_price ?? item.price ?? item.price_min ?? null,
        optionCount: (item.options || []).length,
      })),
    })),
  };
}

function classifyProcessedEntry(entry) {
  const flags = [];
  const itemCount = entry.extractionSummary?.itemCount || 0;
  const optionCount = entry.extractionSummary?.optionCount || 0;
  const operationalOptionCount = entry.extractionSummary?.operationalOptionCount || 0;
  const dryRunApproved = entry.dryRun?.success === true && entry.dryRun?.audit?.approved === true;
  const dryRunIssues = entry.dryRun?.audit?.issues || [];
  const confidence = Number(entry.dryRun?.audit?.confidence ?? entry.extractionSummary?.confidence ?? 0) || 0;
  const pricedRatio = Number(entry.dryRun?.audit?.pricedRatio ?? 0) || 0;
  const unresolvedPriceCount = Number(entry.dryRun?.audit?.unresolvedPriceCount ?? 0) || 0;
  const hasFullSnapshot = Boolean(entry.snapshot?.snapshot?.snapshotPath);
  const hasViewportSnapshots = Boolean(entry.verificationSnapshots?.some((capture) => capture.snapshot?.snapshotPath));
  const capturedHeight = Number(entry.snapshot?.result?.capturedHeight || 0);
  const fullSnapshotOk = hasFullSnapshot && entry.snapshot?.success !== false && entry.snapshot?.result?.truncated !== true;
  const snapshotCoversFullPage = fullSnapshotOk
    && entry.snapshot?.result?.fullPage === true
    && entry.snapshot?.result?.truncated !== true
    && Number(entry.snapshot?.result?.segmentCount || 0) >= 1;
  const visualMenuEvidenceOk = hasViewportSnapshots
    || capturedHeight >= 1200
    || snapshotCoversFullPage;
  const platform = entry.platform || 'unknown';

  if (entry.visualBlock) flags.push(entry.visualBlock.reason || 'visual_block');
  if (entry.error && !entry.visualBlock) flags.push('collector_error');
  if (!hasFullSnapshot && !hasViewportSnapshots) flags.push('no_extension_print');
  if (!entry.extractionSummary?.success || itemCount <= 0) flags.push('no_structured_items');
  if (optionCount === 0 && itemCount >= 8) flags.push('no_options_extracted');
  if (operationalOptionCount > 0) flags.push('operational_options_detected');
  if (entry.dryRun && !dryRunApproved) flags.push('dry_run_not_approved');
  if (dryRunIssues.length) flags.push('dry_run_issues');
  if (entry.verificationSnapshotError && !(fullSnapshotOk && dryRunApproved)) flags.push('viewport_print_partial');
  if (!visualMenuEvidenceOk) flags.push('insufficient_visual_menu_evidence');
  if (unresolvedPriceCount > 0 || pricedRatio < 0.95) flags.push('price_coverage_review');

  const blockingFlags = new Set([
    'visible_page_disabled',
    'no_extension_print',
    'no_structured_items',
  ]);
  const hasBlockingFlag = flags.some((flag) => blockingFlags.has(flag));
  const denseAnotaAi = platform === 'anota_ai'
    && itemCount >= 20
    && optionCount > 100
    && confidence >= 0.97
    && pricedRatio >= 0.95
    && unresolvedPriceCount === 0;
  const strongCardapioWeb = platform === 'cardapioweb'
    && itemCount >= 8
    && confidence >= 0.97
    && pricedRatio >= 0.95
    && unresolvedPriceCount === 0;
  const strongStructured = !['anota_ai', 'cardapioweb'].includes(platform)
    && itemCount >= 12
    && confidence >= 0.95
    && pricedRatio >= 0.95
    && unresolvedPriceCount === 0;
  const greenByRubric = dryRunApproved
    && dryRunIssues.length === 0
    && operationalOptionCount === 0
    && fullSnapshotOk
    && visualMenuEvidenceOk
    && (strongCardapioWeb || denseAnotaAi || strongStructured);

  let tier = greenByRubric ? 'green' : 'yellow';
  let nextAction = 'quick_codex_visual_review_then_import';
  if (hasBlockingFlag) {
    tier = 'red';
    nextAction = 'reject_or_rediscover_source';
  } else if (tier === 'yellow') {
    tier = 'yellow';
    nextAction = 'manual_codex_review_before_import';
  }

  return {
    tier,
    flags: [...new Set(flags)],
    nextAction,
    itemCount,
    optionCount,
    operationalOptionCount,
    dryRunApproved,
    confidence,
    pricedRatio,
    unresolvedPriceCount,
  };
}

function processedReviewEntry(entry) {
  const classification = classifyProcessedEntry(entry);
  return {
    tier: classification.tier,
    restaurantId: entry.restaurantId,
    restaurantName: entry.restaurantName,
    platform: entry.platform,
    sourceUrl: entry.sourceUrl,
    score: entry.queue?.score ?? null,
    sourceTier: entry.queue?.tier || null,
    sourceFlags: entry.queue?.flags || [],
    itemCount: classification.itemCount,
    optionCount: classification.optionCount,
    operationalOptionCount: classification.operationalOptionCount,
    dryRunApproved: classification.dryRunApproved,
    confidence: classification.confidence,
    pricedRatio: classification.pricedRatio,
    unresolvedPriceCount: classification.unresolvedPriceCount,
    committed: entry.committed === true,
    flags: classification.flags,
    nextAction: classification.nextAction,
    snapshotPath: entry.snapshot?.snapshot?.snapshotPath || null,
    viewportSnapshotPaths: (entry.verificationSnapshots || []).map((capture) => capture.snapshot?.snapshotPath).filter(Boolean),
    evidencePath: entry.evidencePath || null,
    error: entry.error || null,
  };
}

function hasApplyBlockingSourceFlag(entry) {
  return (entry.queue?.flags || []).some((flag) => APPLY_BLOCK_SOURCE_FLAGS.has(flag));
}

function reviewCounts(entries) {
  return entries.reduce((acc, entry) => {
    acc[entry.tier] = (acc[entry.tier] || 0) + 1;
    return acc;
  }, { green: 0, yellow: 0, red: 0 });
}

function isVisuallyDisabled(text) {
  const body = normalize(text);
  return /\b(site|loja|cardapio|cardapio digital|menu)\s+desativad[ao]s?\b/.test(body)
    || /\b(cardapio|menu)\s+indisponivel\b/.test(body)
    || /\bestabelecimento\s+indisponivel\b/.test(body);
}

async function getVisiblePageText(sourceUrl) {
  const expectedHost = hostOf(sourceUrl);
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  try {
    const pages = await browser.pages();
    const candidates = pages.filter((page) => {
      const pageUrl = page.url();
      return pageUrl && hostOf(pageUrl) === expectedHost;
    });
    const page = candidates.find((candidate) => candidate.url().startsWith(sourceUrl))
      || candidates.find((candidate) => candidate.url().includes(new URL(sourceUrl).pathname))
      || candidates[0];
    if (!page) return '';
    return await page.evaluate(() => document.body?.innerText || '').catch(() => '');
  } catch {
    return '';
  } finally {
    await browser.disconnect();
  }
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

async function captureVerificationSeries(tabId, restaurantId) {
  const ratios = [0, 0.22, 0.45, 0.68, 0.9, 1];
  const captures = [];
  let lastMaxScrollTop = null;
  let lastScrollTop = null;
  for (let index = 0; index < ratios.length; index += 1) {
    const ratio = ratios[index];
    const scroll = await runExtensionCommand({
      type: 'scroll_largest_container',
      label: `menu-scroll-${restaurantId}-${index}`,
      tabId,
      ratio,
      waitMs: 900,
    }, 90000);
    const scrollResult = scroll.result || {};
    if (lastMaxScrollTop === 0 && index > 0) break;
    if (lastScrollTop != null && Math.abs(Number(scrollResult.scrollTop || 0) - lastScrollTop) < 8 && index > 0 && scrollResult.reachedEnd) break;
    lastMaxScrollTop = Number(scrollResult.maxScrollTop || 0);
    lastScrollTop = Number(scrollResult.scrollTop || 0);

    const snapshot = await runExtensionCommand({
      type: 'snapshot',
      label: `menu-viewport-${restaurantId}-${index}`,
      tabId,
      active: true,
    }, 90000);
    captures.push({
      ratio,
      scroll: scrollResult,
      snapshot: snapshot.snapshot || null,
      result: snapshot.result || null,
      error: snapshot.error || null,
    });
    if (scrollResult.reachedEnd && index >= 2) break;
  }
  return captures;
}

async function captureBrowserScrollVerificationSeries(tabId, restaurantId, sourceUrl) {
  const ratios = [0.18, 0.4, 0.66, 0.9];
  const captures = [];
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  try {
    const expectedHost = hostOf(sourceUrl);
    const pages = await browser.pages();
    const page = pages.find((candidate) => hostOf(candidate.url()) === expectedHost)
      || pages.find((candidate) => candidate.url().startsWith(sourceUrl));
    if (!page) throw new Error(`Nao encontrei aba aberta para ${sourceUrl}`);

    for (let index = 0; index < ratios.length; index += 1) {
      const ratio = ratios[index];
      const scrollResult = await page.evaluate(async (targetRatio) => {
        const candidates = [document.scrollingElement, document.documentElement, document.body, ...document.querySelectorAll('*')]
          .filter(Boolean)
          .map((element) => {
            const scrollHeight = Number(element.scrollHeight || 0);
            const clientHeight = Number(element.clientHeight || 0);
            return {
              element,
              scrollHeight,
              clientHeight,
              maxScrollTop: Math.max(0, scrollHeight - clientHeight),
            };
          })
          .filter((candidate) => candidate.maxScrollTop > 80)
          .sort((left, right) => right.maxScrollTop - left.maxScrollTop);
        const target = candidates[0]?.element || document.scrollingElement || document.documentElement || document.body;
        const maxScrollTop = Math.max(0, Number(target.scrollHeight || 0) - Number(target.clientHeight || 0));
        const scrollTop = Math.round(maxScrollTop * targetRatio);
        target.scrollTo({ top: scrollTop, behavior: 'instant' });
        await new Promise((resolve) => setTimeout(resolve, 900));
        return {
          target: target === document.scrollingElement ? 'document.scrollingElement' : target.tagName?.toLowerCase() || 'element',
          scrollTop: Number(target.scrollTop || 0),
          maxScrollTop,
          reachedEnd: maxScrollTop > 0 && Math.abs(maxScrollTop - Number(target.scrollTop || 0)) < 12,
          fallback: 'puppeteer_scroll_extension_snapshot',
        };
      }, ratio);

      const snapshot = await runExtensionCommand({
        type: 'snapshot',
        label: `menu-fallback-viewport-${restaurantId}-${index}`,
        tabId,
        active: true,
      }, 90000);
      captures.push({
        ratio,
        scroll: scrollResult,
        snapshot: snapshot.snapshot || null,
        result: snapshot.result || null,
        error: snapshot.error || null,
      });
      if (scrollResult.reachedEnd && index >= 1) break;
    }
  } finally {
    await browser.disconnect();
  }
  return captures;
}

async function captureFullPageSnapshot(tabId, restaurantId, sourceUrl, labelSuffix = 'fullpage') {
  const snapshotResult = await runExtensionCommand({
    type: 'full_page_snapshot',
    label: `menu-${labelSuffix}-${restaurantId}`,
    tabId,
    targetUrl: sourceUrl,
    active: true,
    quality: 72,
    maxHeight: 26000,
    maxSegments: 36,
    waitMs: 700,
  }, 180000);
  return {
    success: snapshotResult.success !== false,
    error: snapshotResult.error || null,
    result: snapshotResult.result || null,
    snapshot: snapshotResult.snapshot || null,
  };
}

async function prepareMenuPageForScreenshots(sourceUrl, tabId, restaurantId, restaurant = {}) {
  const actions = [];
  const host = hostOf(sourceUrl);
  if (host === 'doutorpizza.com.br') {
    const locationText = normalize(`${restaurant.address || ''} ${restaurant.neighborhood || ''}`);
    const unitText = locationText.includes('malvinas')
      ? 'DR PIZZA - MALVINAS'
      : locationText.includes('cruzeiro')
        ? 'DR PIZZA - CRUZEIRO'
        : (locationText.includes('alto branco') || locationText.includes('manoel tavares'))
          ? 'DR PIZZA - ALTO BRANCO'
          : '';
    if (unitText) {
      const click = await runExtensionCommand({
        type: 'click_text',
        label: `menu-doutor-pizza-unit-${restaurantId}`,
        tabId,
        text: unitText,
        waitMs: 4000,
      }, 90000).catch((error) => ({ success: false, error: error.message || String(error) }));

      actions.push({
        type: 'click_text',
        text: unitText,
        success: click.success !== false && click.result?.success !== false,
        result: click.result || null,
        error: click.error || click.result?.error || null,
      });

      if (click.success !== false && click.result?.success !== false) await sleep(4000);
    }
    return { actions, profileSnapshot: null };
  }

  if (host === 'accon.ai') {
    for (const text of ['Retirar na loja', 'Receber em casa']) {
      const click = await runExtensionCommand({
        type: 'click_text',
        label: `menu-accon-open-${restaurantId}-${safeSlug(text)}`,
        tabId,
        text,
        waitMs: 3500,
      }, 90000).catch((error) => ({ success: false, error: error.message || String(error) }));

      actions.push({
        type: 'click_text',
        text,
        success: click.success !== false && click.result?.success !== false,
        result: click.result || null,
        error: click.error || click.result?.error || null,
      });

      if (click.success !== false && click.result?.success !== false) {
        await sleep(3500);
        break;
      }
    }
    return { actions, profileSnapshot: null };
  }

  if (host !== 'cardapio.ai') return { actions, profileSnapshot: null };

  const profileSnapshot = await captureFullPageSnapshot(tabId, restaurantId, sourceUrl, 'cardapio-ai-profile');
  const click = await runExtensionCommand({
    type: 'click_text',
    label: `menu-cardapio-ai-open-${restaurantId}`,
    tabId,
    text: 'Ver cardapio',
    waitMs: 2500,
  }, 90000).catch((error) => ({ success: false, error: error.message || String(error) }));

  actions.push({
    type: 'click_text',
    text: 'Ver cardapio',
    success: click.success !== false && click.result?.success !== false,
    result: click.result || null,
    error: click.error || click.result?.error || null,
  });

  if (click.success !== false && click.result?.success !== false) await sleep(2500);
  return { actions, profileSnapshot };
}

async function closeTab(tabId) {
  if (!tabId) return;
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  try {
    let target = browser.targets().find((candidate) =>
      candidate.type() === 'service_worker'
      && candidate.url().startsWith(`chrome-extension://${EXTENSION_ID}/`)
    );
    if (!target) {
      await browser.newPage().then(async (page) => {
        try {
          await page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded', timeout: 15000 });
        } finally {
          await page.close().catch(() => {});
        }
      }).catch(() => {});
      await sleep(1200);
      target = browser.targets().find((candidate) =>
        candidate.type() === 'service_worker'
        && candidate.url().startsWith(`chrome-extension://${EXTENSION_ID}/`)
      );
    }
    const worker = target ? await target.worker() : null;
    if (worker) {
      await worker.evaluate(async (id) => {
        try {
          await chrome.tabs.remove(Number(id));
          return true;
        } catch (_) {
          return false;
        }
      }, tabId).catch(() => {});
    }
  } finally {
    await browser.disconnect();
  }
}

const targets = await fetchTargets();
const targetQueue = targets.map(queueEntry);
writeQueueFiles(OUT_DIR, 'target-queue', targetQueue);

if (QUEUE_ONLY) {
  const counts = reviewCounts(targetQueue);
  const byPlatform = targetQueue.reduce((acc, entry) => {
    acc[entry.platform] = (acc[entry.platform] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({
    runId: RUN_ID,
    outDir: OUT_DIR,
    mode: 'queue-only',
    status: STATUS,
    laneId: LANE_ID,
    limit: LIMIT,
    platform: PLATFORM || null,
    targetCount: targetQueue.length,
    counts,
    byPlatform: Object.fromEntries(Object.entries(byPlatform).sort((a, b) => b[1] - a[1])),
    nextGreen: targetQueue.filter((entry) => entry.tier === 'green').slice(0, 20),
    files: {
      json: path.join(OUT_DIR, 'target-queue.json'),
      csv: path.join(OUT_DIR, 'target-queue.csv'),
    },
  }, null, 2));
  process.exit(0);
}

const releaseLaneLock = acquireLaneLock();

const summary = {
  runId: RUN_ID,
  laneId: LANE_ID,
  apply: APPLY,
  limit: LIMIT,
  platform: PLATFORM || null,
  status: STATUS,
  targetCount: targets.length,
  targetQueueCounts: reviewCounts(targetQueue),
  processed: [],
};

for (let index = 0; index < targets.length; index += 1) {
  const restaurant = targets[index];
  const sourceUrl = menuUrl(restaurant);
  const restaurantName = clean(restaurant.google_maps_name || restaurant.name);
  const slug = `${String(index + 1).padStart(3, '0')}-${safeSlug(restaurantName)}`;
  const dir = path.join(OUT_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`[${index + 1}/${targets.length}] ${restaurantName}`);
  console.log(`  fonte: ${sourceUrl}`);

  const entry = {
    restaurantId: restaurant.id,
    restaurantName,
    sourceUrl,
    platform: platformOf(sourceUrl),
    queue: queueEntry(restaurant),
    review: null,
    evidenceDir: dir,
    openedTabId: null,
    profileSnapshot: null,
    preCaptureActions: [],
    snapshot: null,
    verificationSnapshots: [],
    verificationSnapshotError: null,
    extractionSummary: null,
    dryRun: null,
    committed: false,
    visualBlock: null,
    error: null,
  };

  try {
    const openResult = await runExtensionCommand({
      type: 'open_url',
      label: `menu-open-${restaurant.id}`,
      url: sourceUrl,
      newTab: true,
      active: true,
    }, 90000);
    entry.openedTabId = openResult.result?.tabId || openResult.result?.result?.tabId || null;
    await sleep(2500);

    const prepared = await prepareMenuPageForScreenshots(sourceUrl, entry.openedTabId, restaurant.id, restaurant);
    entry.profileSnapshot = prepared.profileSnapshot;
    entry.preCaptureActions = prepared.actions;
    entry.snapshot = await captureFullPageSnapshot(entry.openedTabId, restaurant.id, sourceUrl);

    try {
      entry.verificationSnapshots = await captureVerificationSeries(entry.openedTabId, restaurant.id);
    } catch (error) {
      entry.verificationSnapshotError = error.message || String(error);
      entry.verificationSnapshots = await captureBrowserScrollVerificationSeries(entry.openedTabId, restaurant.id, sourceUrl)
        .catch((fallbackError) => {
          entry.verificationSnapshotFallbackError = fallbackError.message || String(fallbackError);
          return [];
        });
    }

    const visibleText = await getVisiblePageText(sourceUrl);
    const visuallyDisabled = isVisuallyDisabled(visibleText);
    if (visuallyDisabled) {
      entry.visualBlock = {
        reason: 'visible_page_disabled',
        textSample: clean(visibleText).slice(0, 500),
      };
      entry.extractionSummary = {
        success: false,
        platform: platformOf(sourceUrl),
        error: 'Pagina publica mostra menu/site desativado nos prints.',
        confidence: 0,
        extractionLevel: null,
        categoryCount: 0,
        itemCount: 0,
        optionCount: 0,
        operationalOptionCount: 0,
        samples: [],
      };

      const evidence = {
        success: false,
        sourceUrl,
        finalUrl: sourceUrl,
        platform: platformOf(sourceUrl),
        extractionLevel: 0,
        confidence: 0,
        categories: [],
        visualBlock: entry.visualBlock,
        visualVerification: {
          status: 'blocked_visible_page_disabled',
          profileSnapshotPath: entry.profileSnapshot?.snapshot?.snapshotPath || null,
          profileSnapshotFile: entry.profileSnapshot?.snapshot?.snapshotFile || null,
          preCaptureActions: entry.preCaptureActions || [],
          verificationSnapshotError: entry.verificationSnapshotError || null,
          verificationSnapshotFallbackError: entry.verificationSnapshotFallbackError || null,
          snapshotPath: entry.snapshot?.snapshot?.snapshotPath || null,
          snapshotFile: entry.snapshot?.snapshot?.snapshotFile || null,
          viewportSnapshots: entry.verificationSnapshots.map((capture) => ({
            ratio: capture.ratio,
            target: capture.scroll?.target || null,
            scrollTop: capture.scroll?.scrollTop ?? null,
            maxScrollTop: capture.scroll?.maxScrollTop ?? null,
            reachedEnd: capture.scroll?.reachedEnd ?? null,
            snapshotPath: capture.snapshot?.snapshotPath || null,
            snapshotFile: capture.snapshot?.snapshotFile || null,
          })),
          fullPage: entry.snapshot?.result?.fullPage || false,
          segmentCount: entry.snapshot?.result?.segmentCount || null,
          capturedHeight: entry.snapshot?.result?.capturedHeight || null,
          truncated: entry.snapshot?.result?.truncated || null,
        },
        restaurant: {
          id: restaurant.id,
          name: restaurantName,
          category: restaurant.category || null,
          address: restaurant.address || null,
          phone: restaurant.phone || null,
          instagram: restaurant.instagram || null,
        },
      };
      const evidencePath = path.join(dir, 'menu-evidence.json');
      fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');
      entry.evidencePath = evidencePath;
      entry.dryRun = { success: false, error: entry.extractionSummary.error };
      fs.writeFileSync(path.join(dir, 'dry-run.json'), JSON.stringify({
        code: null,
        result: entry.dryRun,
        stdoutTail: '',
        stderrTail: '',
      }, null, 2), 'utf8');
      console.log('  visual: bloqueado (pagina publica desativada)');
      throw new Error(entry.extractionSummary.error);
    }

    const extraction = await extractWithExtension(sourceUrl);
    const categories = Array.isArray(extraction.categories) ? extraction.categories : [];
    entry.extractionSummary = {
      success: extraction.success !== false && categories.length > 0,
      platform: extraction.platform || null,
      error: extraction.error || null,
      confidence: extraction.confidence || null,
      extractionLevel: extraction.extractionLevel ?? null,
      ...summarizeCategories(categories),
    };

    const evidence = {
      success: extraction.success !== false && categories.length > 0,
      sourceUrl,
      finalUrl: extraction.finalUrl || extraction.sourceUrl || sourceUrl,
      platform: extraction.platform || platformOf(sourceUrl),
      extractionLevel: extraction.extractionLevel ?? 0,
      confidence: extraction.confidence || 0.95,
      categories,
      visualVerification: {
        status: 'pending_manual_codex_review',
        profileSnapshotPath: entry.profileSnapshot?.snapshot?.snapshotPath || null,
        profileSnapshotFile: entry.profileSnapshot?.snapshot?.snapshotFile || null,
        preCaptureActions: entry.preCaptureActions || [],
        verificationSnapshotError: entry.verificationSnapshotError || null,
        verificationSnapshotFallbackError: entry.verificationSnapshotFallbackError || null,
        snapshotPath: entry.snapshot?.snapshot?.snapshotPath || null,
        snapshotFile: entry.snapshot?.snapshot?.snapshotFile || null,
        viewportSnapshots: entry.verificationSnapshots.map((capture) => ({
          ratio: capture.ratio,
          target: capture.scroll?.target || null,
          scrollTop: capture.scroll?.scrollTop ?? null,
          maxScrollTop: capture.scroll?.maxScrollTop ?? null,
          reachedEnd: capture.scroll?.reachedEnd ?? null,
          snapshotPath: capture.snapshot?.snapshotPath || null,
          snapshotFile: capture.snapshot?.snapshotFile || null,
        })),
        fullPage: entry.snapshot?.result?.fullPage || false,
        segmentCount: entry.snapshot?.result?.segmentCount || null,
        capturedHeight: entry.snapshot?.result?.capturedHeight || null,
        truncated: entry.snapshot?.result?.truncated || null,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurantName,
        category: restaurant.category || null,
        address: restaurant.address || null,
        phone: restaurant.phone || null,
        instagram: restaurant.instagram || null,
      },
    };

    const evidencePath = path.join(dir, 'menu-evidence.json');
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');
    entry.evidencePath = evidencePath;

    const dryRun = await runImporter(restaurant.id, evidencePath, true);
    entry.dryRun = dryRun.result || { success: false, error: 'Sem RESULT do importador', code: dryRun.code, stderrTail: dryRun.stderrTail };
    fs.writeFileSync(path.join(dir, 'dry-run.json'), JSON.stringify({
      code: dryRun.code,
      result: dryRun.result,
      stdoutTail: dryRun.stdoutTail,
      stderrTail: dryRun.stderrTail,
    }, null, 2), 'utf8');

    const dryRunApproved = entry.dryRun?.success === true && entry.dryRun?.audit?.approved === true;
    const provisionalReview = processedReviewEntry(entry);
    entry.review = provisionalReview;
    const canApply = entry.extractionSummary.success
      && dryRunApproved
      && provisionalReview.tier === 'green'
      && !hasApplyBlockingSourceFlag(entry);
    if (APPLY && canApply) {
      const commit = await runImporter(restaurant.id, evidencePath, false);
      entry.commit = commit.result || { success: false, error: 'Sem RESULT do commit', code: commit.code, stderrTail: commit.stderrTail };
      entry.committed = entry.commit?.success === true;
      fs.writeFileSync(path.join(dir, 'commit.json'), JSON.stringify({
        code: commit.code,
        result: commit.result,
        stdoutTail: commit.stdoutTail,
        stderrTail: commit.stderrTail,
      }, null, 2), 'utf8');
    } else if (APPLY) {
      entry.commitSkippedReason = provisionalReview.tier !== 'green'
        ? `review_tier_${provisionalReview.tier}`
        : hasApplyBlockingSourceFlag(entry)
          ? 'source_flag_blocks_apply'
          : 'dry_run_or_extraction_not_approved';
    }
  } catch (error) {
    entry.error = error.message || String(error);
  } finally {
    await closeTab(entry.openedTabId).catch(() => {});
  }

  entry.review = processedReviewEntry(entry);
  summary.processed.push(entry);
  const reviewQueue = summary.processed.map(processedReviewEntry);
  summary.reviewCounts = reviewCounts(reviewQueue);
  writeQueueFiles(OUT_DIR, 'review-queue', reviewQueue);
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(`  extraido: ${entry.extractionSummary?.itemCount || 0} itens / ${entry.extractionSummary?.optionCount || 0} opcoes`);
  console.log(`  pre-auditoria: ${entry.review.tier} (${entry.review.flags.join(', ') || 'sem alertas'})`);
  console.log(`  dry-run: ${entry.dryRun?.success ? 'ok' : 'falhou'}${entry.error ? ` | erro: ${entry.error}` : ''}`);
  if (entry.snapshot?.snapshot?.snapshotPath) console.log(`  print: ${entry.snapshot.snapshot.snapshotPath}`);
  if (entry.verificationSnapshots?.length) {
    console.log(`  prints-faixas: ${entry.verificationSnapshots.map((capture) => capture.snapshot?.snapshotPath).filter(Boolean).join(' | ')}`);
  }
}

console.log(JSON.stringify({
  runId: RUN_ID,
  laneId: LANE_ID,
  outDir: OUT_DIR,
  targetCount: targets.length,
  targetQueueCounts: reviewCounts(targetQueue),
  reviewCounts: reviewCounts(summary.processed.map(processedReviewEntry)),
  processed: summary.processed.map((entry) => ({
    restaurantId: entry.restaurantId,
    restaurantName: entry.restaurantName,
    platform: entry.platform,
    reviewTier: entry.review?.tier || null,
    reviewFlags: entry.review?.flags || [],
    nextAction: entry.review?.nextAction || null,
    itemCount: entry.extractionSummary?.itemCount || 0,
    optionCount: entry.extractionSummary?.optionCount || 0,
    operationalOptionCount: entry.extractionSummary?.operationalOptionCount || 0,
    dryRunSuccess: entry.dryRun?.success === true,
    dryRunApproved: entry.dryRun?.success === true && entry.dryRun?.audit?.approved === true,
    snapshotPath: entry.snapshot?.snapshot?.snapshotPath || null,
    viewportSnapshotPaths: (entry.verificationSnapshots || []).map((capture) => capture.snapshot?.snapshotPath).filter(Boolean),
    evidencePath: entry.evidencePath || null,
    error: entry.error,
  })),
}, null, 2));

releaseLaneLock();
