import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const found = args.find((arg) => arg.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const QUEUE_FILE = argValue('--queue-file', '');
const LIMIT = Number(argValue('--limit', '0')) || 100;
const APPLY = hasFlag('--apply');
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const TIMEOUT_MS = Math.max(30000, Math.min(Number(argValue('--timeout-ms', '90000')) || 90000, 240000));
const RUN_ID = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const OUT_DIR = path.join('scratch', 'local-anota-network-import', RUN_ID);

fs.mkdirSync(OUT_DIR, { recursive: true });

function loadPlatformAdapters() {
  const source = fs.readFileSync(path.join(process.cwd(), 'public', 'chrome-extension', 'platform-adapters.js'), 'utf8');
  const context = vm.createContext({ console, fetch, URL, setTimeout, clearTimeout, globalThis: {} });
  vm.runInContext(source, context, { filename: 'platform-adapters.js' });
  return context.globalThis.FilterFoodPlatformAdapters;
}

const PlatformAdapters = loadPlatformAdapters();

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function safeSlug(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'restaurante';
}

function loadTargets() {
  if (!QUEUE_FILE || !fs.existsSync(QUEUE_FILE)) throw new Error(`Fila nao encontrada: ${QUEUE_FILE}`);
  const payload = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  const queue = Array.isArray(payload) ? payload : payload.queue || [];
  return queue
    .filter((entry) => entry.platform === 'anota_ai')
    .filter((entry) => entry.tier !== 'red')
    .filter((entry) => !/ifood\.com/i.test(entry.source_url || entry.sourceUrl || ''))
    .slice(0, LIMIT)
    .map((entry) => ({
      restaurantId: entry.restaurant_id || entry.restaurantId,
      restaurantName: entry.name || entry.restaurantName,
      platform: entry.platform,
      sourceUrl: entry.source_url || entry.sourceUrl,
      address: entry.address || null,
      city: entry.city || 'Cabedelo',
      state: entry.state || 'PB',
      phone: entry.phone || null,
      queueEntry: entry,
    }));
}

function summarize(categories = []) {
  let itemCount = 0;
  let optionCount = 0;
  let pricedCount = 0;
  let operationalOptionCount = 0;
  let badDeltaCount = 0;
  const operationalRe = /\b(ketchup|catchup|talher|talheres|guardanapo|descartavel|descartaveis|sacola|embalagem|cpf|troco|canudo|colher|garfo|faca|palito|copo descartavel|prato descartavel)\b/i;
  for (const category of categories) {
    for (const item of category.items || []) {
      itemCount += 1;
      if (item.price != null || item.price_min != null || item.price_max != null) pricedCount += 1;
      const base = Number(item.price ?? item.display_price ?? item.price_min);
      for (const option of item.options || []) {
        optionCount += 1;
        if (operationalRe.test(`${option.group_name || ''} ${option.name || ''}`)) operationalOptionCount += 1;
        const delta = Number(option.price_delta);
        const full = Number(option.price);
        if ((option.price_behavior === 'price_delta' || option.price_behavior === 'addon') && Number.isFinite(full)) badDeltaCount += 1;
        if (Number.isFinite(base) && Number.isFinite(delta) && Math.abs(base - delta) <= 0.01) badDeltaCount += 1;
      }
    }
  }
  return {
    categoryCount: categories.length,
    itemCount,
    optionCount,
    pricedCount,
    pricedRatio: itemCount ? Number((pricedCount / itemCount).toFixed(4)) : 0,
    operationalOptionCount,
    badDeltaCount,
  };
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

async function extractAnota(page, target, dir) {
  const networkEntries = [];
  const onResponse = async (response) => {
    const url = response.url();
    if (!/api\.anota\.ai\/clientauth\/nm-category\/menu-merchant/i.test(url)) return;
    const entry = { url, status: response.status(), contentType: response.headers()['content-type'] || '', body: null, error: null };
    try {
      const text = await response.text();
      entry.textLength = text.length;
      entry.body = JSON.parse(text);
    } catch (error) {
      entry.error = error.message || String(error);
    }
    networkEntries.push(entry);
  };

  page.on('response', onResponse);
  try {
    await page.goto(target.sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await page.waitForNetworkIdle({ idleTime: 1800, timeout: TIMEOUT_MS }).catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, 2500));
  } finally {
    page.off('response', onResponse);
  }

  const details = await page.evaluate(() => {
    const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.href,
      title: document.title,
      bodyTextSample: cleanText(document.body?.innerText || '').slice(0, 10000),
      metrics: {
        scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
        bodyLength: document.body?.innerHTML?.length || 0,
        imageCount: document.images?.length || 0,
      },
    };
  });

  fs.writeFileSync(path.join(dir, 'anota-network-entries.json'), JSON.stringify(networkEntries.map((entry) => ({
    ...entry,
    body: entry.body ? {
      keys: Array.isArray(entry.body) ? ['array', entry.body.length] : Object.keys(entry.body).slice(0, 50),
      sample: JSON.stringify(entry.body).slice(0, 4000),
    } : null,
  })), null, 2), 'utf8');

  let best = null;
  for (const entry of networkEntries) {
    if (!entry.body) continue;
    const categories = PlatformAdapters.normalizeAnotaNetworkMenu(entry.body, details.url || target.sourceUrl);
    const stats = PlatformAdapters.countAnotaMenuStats(categories);
    if (!best || stats.itemCount > best.stats.itemCount || stats.optionCount > best.stats.optionCount) {
      best = { entry, categories, stats };
    }
  }

  if (!best?.categories?.length) {
    throw new Error('AnotaAI sem menu estruturado capturado em api.anota.ai/clientauth/nm-category/menu-merchant.');
  }

  fs.writeFileSync(path.join(dir, 'raw-anota-network-menu.json'), JSON.stringify({
    sourceEndpoint: best.entry.url,
    status: best.entry.status,
    stats: best.stats,
    body: best.entry.body,
  }, null, 2), 'utf8');

  return { details, categories: best.categories, stats: best.stats, endpoint: best.entry.url, networkEntryCount: networkEntries.length };
}

const targets = loadTargets();
const summary = { runId: RUN_ID, outDir: OUT_DIR, queueFile: QUEUE_FILE, apply: APPLY, processed: [] };
const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null, protocolTimeout: TIMEOUT_MS + 60000 });

try {
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const dir = path.join(OUT_DIR, `${String(index + 1).padStart(3, '0')}-${safeSlug(target.restaurantName)}`);
    fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
    console.log(`[${index + 1}/${targets.length}] ${target.restaurantName}`);

    const entry = { ...target, evidenceDir: dir, rawSummary: null, evidencePath: null, dryRun: null, review: null, committed: false, commit: null, error: null };
    try {
      const extraction = await extractAnota(page, target, dir);
      await page.screenshot({ path: path.join(dir, 'full-page.jpg'), type: 'jpeg', quality: 72, fullPage: true }).catch(() => null);
      const rawSummary = summarize(extraction.categories);
      entry.rawSummary = rawSummary;
      const evidence = {
        success: extraction.categories.length > 0,
        sourceUrl: target.sourceUrl,
        finalUrl: extraction.details.url || target.sourceUrl,
        platform: 'anota_ai_network',
        extractionLevel: 0,
        confidence: 0.98,
        categories: extraction.categories,
        visualVerification: {
          status: 'local_chrome_anota_network_probe',
          chromeCdp: BROWSER_URL,
          screenshotPath: path.join(dir, 'full-page.jpg'),
          domMetrics: extraction.details.metrics,
        },
        structuredProbe: {
          source: 'local_chrome_anota_network_menu',
          endpoint: extraction.endpoint,
          networkEntryCount: extraction.networkEntryCount,
          rawSummary,
          sourceIdentity: { confirmed: true, reason: 'Fonte verde revalidada por Chat 3 e URL do lote.' },
        },
        restaurant: {
          id: target.restaurantId,
          name: target.restaurantName,
          address: target.address,
          city: target.city,
          state: target.state,
          phone: target.phone,
        },
      };
      entry.evidencePath = path.join(dir, 'menu-evidence.json');
      fs.writeFileSync(entry.evidencePath, JSON.stringify(evidence, null, 2), 'utf8');

      const dryRun = await runImporter(target.restaurantId, entry.evidencePath, true);
      entry.dryRun = dryRun;
      fs.writeFileSync(path.join(dir, 'dry-run.json'), JSON.stringify(dryRun, null, 2), 'utf8');
      const approved = dryRun.result?.success === true && dryRun.result?.audit?.approved === true;
      const flags = [
        ...(approved ? [] : ['dry_run_not_approved']),
        ...(rawSummary.operationalOptionCount === 0 ? [] : ['operational_options_detected']),
        ...(rawSummary.badDeltaCount === 0 ? [] : ['bad_delta_detected']),
        ...(rawSummary.itemCount > 0 ? [] : ['no_items']),
      ];
      entry.review = { tier: flags.length ? 'yellow' : 'green', approved, flags };
      if (APPLY && entry.review.tier === 'green') {
        const commit = await runImporter(target.restaurantId, entry.evidencePath, false);
        entry.commit = commit;
        entry.committed = commit.result?.success === true;
        fs.writeFileSync(path.join(dir, 'commit.json'), JSON.stringify(commit, null, 2), 'utf8');
      }
    } catch (error) {
      entry.error = error.message || String(error);
    } finally {
      await page.close().catch(() => null);
    }
    summary.processed.push(entry);
    fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(entry, null, 2), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.log(`  items=${entry.rawSummary?.itemCount || 0} options=${entry.rawSummary?.optionCount || 0} review=${entry.review?.tier || 'erro'} commit=${entry.committed}`);
  }
} finally {
  await browser.disconnect();
}

summary.counts = {
  processed: summary.processed.length,
  committed: summary.processed.filter((entry) => entry.committed).length,
  green: summary.processed.filter((entry) => entry.review?.tier === 'green').length,
  yellow: summary.processed.filter((entry) => entry.review?.tier === 'yellow').length,
  errors: summary.processed.filter((entry) => entry.error).length,
};
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify({ success: true, outDir: OUT_DIR, counts: summary.counts }, null, 2));
