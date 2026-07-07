import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'browserbase-menu-lab', RUN_ID);
const DIRECT_URL = argValue('--url', '');
const DIRECT_NAME = argValue('--restaurant', '');
const PLATFORM = argValue('--platform', '');
const LIMIT = Math.max(1, Math.min(Number(argValue('--limit', '3')) || 3, 20));
const QUEUE_FILE = argValue('--queue-file', '');
const TIMEOUT_MS = Math.max(30000, Math.min(Number(argValue('--timeout-ms', '90000')) || 90000, 240000));
const KEEP_BROWSERBASE_SESSION = hasFlag('--keep-session');

fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalize = (value) => clean(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

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
  if (lower.includes('instadelivery')) return 'instadelivery';
  if (lower.includes('brendi')) return 'brendi';
  if (lower.includes('saipos')) return 'saipos';
  if (lower.includes('ola.click') || lower.includes('olaclick')) return 'olaclick';
  if (lower.includes('goomer')) return 'goomer';
  if (lower.includes('deliverydireto')) return 'deliverydireto';
  if (lower.includes('deliverymuch')) return 'deliverymuch';
  if (lower.includes('menudino')) return 'menudino';
  if (lower.includes('diggy')) return 'diggy';
  if (lower.includes('meucarrinho')) return 'meucarrinho';
  if (lower.includes('yooga')) return 'yooga';
  if (lower.includes('pedir.')) return 'pedir';
  return 'unknown';
}

function loadTargets() {
  if (DIRECT_URL) {
    if (/ifood\.com/i.test(DIRECT_URL)) throw new Error('iFood nao e permitido neste laboratorio.');
    return [{
      restaurantId: argValue('--id', 'direct'),
      restaurantName: DIRECT_NAME || DIRECT_URL,
      sourceUrl: DIRECT_URL,
      platform: platformOf(DIRECT_URL),
    }];
  }

  const queuePath = QUEUE_FILE || latestQueueFile();
  if (!queuePath) throw new Error('Nenhuma fila encontrada; use --url=https://... ou gere a fila.');
  const queuePayload = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const queue = Array.isArray(queuePayload) ? queuePayload : queuePayload.queue || [];
  return queue
    .filter((entry) => entry.tier === 'green')
    .filter((entry) => !PLATFORM || entry.platform === PLATFORM)
    .filter((entry) => !/ifood\.com/i.test(entry.source_url || entry.sourceUrl || ''))
    .slice(0, LIMIT)
    .map((entry) => ({
      restaurantId: entry.restaurant_id || entry.restaurantId,
      restaurantName: entry.name || entry.restaurantName,
      sourceUrl: entry.source_url || entry.sourceUrl,
      platform: entry.platform || platformOf(entry.source_url || entry.sourceUrl),
      reviewsCount: entry.reviews_count ?? entry.reviewsCount ?? null,
      address: entry.address || null,
      phone: entry.phone || null,
    }));
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
    throw new Error(`Browserbase criou sessao sem id/connectUrl: ${JSON.stringify({
      keys: Object.keys(session),
      id: session.id || null,
    })}`);
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

function responseIsInteresting(url, contentType) {
  const text = `${url} ${contentType}`.toLowerCase();
  return /json|api|menu|cardapio|categor|product|produto|item|addon|option|merchant|company|catalog/.test(text);
}

async function extractDomSignals(page) {
  return await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const readStorage = (storage) => {
      const out = {};
      try {
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i);
          out[key] = String(storage.getItem(key) || '').slice(0, 1000);
        }
      } catch (_) {}
      return out;
    };
    const scripts = Array.from(document.scripts || []).map((script) => clean(script.textContent || ''))
      .filter(Boolean)
      .slice(0, 40)
      .map((script) => script.slice(0, 4000));
    const anchors = Array.from(document.querySelectorAll('a[href]')).slice(0, 300).map((anchor) => ({
      text: clean(anchor.innerText || anchor.textContent || ''),
      href: anchor.href,
    }));
    const images = Array.from(document.images || []).slice(0, 200).map((image) => ({
      alt: clean(image.alt || ''),
      src: image.currentSrc || image.src,
      width: image.naturalWidth || image.width || null,
      height: image.naturalHeight || image.height || null,
    }));
    const bodyText = clean(document.body?.innerText || '');
    const blob = [location.href, bodyText, scripts.join('\n')].join('\n');
    const companyId = window.companyId
      || localStorage.getItem('company-id')
      || localStorage.getItem('companyId')
      || localStorage.getItem('@cardapio-web-menu/company_id')
      || (blob.match(/company[-_ ]?id["']?\s*[:=]\s*["']?([0-9]+)/i) || [])[1]
      || '';
    const companySlug = window.companySlug
      || localStorage.getItem('company')
      || localStorage.getItem('companySlug')
      || localStorage.getItem('@cardapio-web-menu/company')
      || (blob.match(/companySlug["']?\s*[:=]\s*["']?([a-z0-9._-]+)/i) || [])[1]
      || location.pathname.split('/').filter(Boolean).pop()
      || '';
    return {
      title: document.title,
      url: location.href,
      bodyTextLength: bodyText.length,
      bodyTextSample: bodyText.slice(0, 12000),
      bodyTextTail: bodyText.slice(-4000),
      anchors,
      images,
      scriptCount: scripts.length,
      scripts,
      localStorage: readStorage(localStorage),
      sessionStorage: readStorage(sessionStorage),
      cardapioWeb: {
        companyId: String(companyId || ''),
        companySlug: String(companySlug || ''),
      },
      metrics: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollHeight: document.documentElement?.scrollHeight || document.body?.scrollHeight || 0,
        bodyLength: document.body?.innerHTML?.length || 0,
        anchorCount: document.querySelectorAll('a[href]').length,
        imageCount: document.images?.length || 0,
      },
    };
  });
}

function summarizeCardapioWebPayload(payload) {
  const categories = Array.isArray(payload) ? payload : [];
  let itemCount = 0;
  let optionCount = 0;
  let optionGroupCount = 0;
  let realOptionCount = 0;
  let realOptionGroupCount = 0;
  let requiredOptionGroupCount = 0;
  let optionalOptionGroupCount = 0;
  let groupsWithExplicitRuleCount = 0;
  let groupsWithInferredRuleCount = 0;
  const operational = [];
  const groupSamples = [];
  const samples = [];

  const inferGroupRule = (group, children) => {
    const groupName = clean(group.name || group.title || '');
    const minRaw = group.min ?? group.minimum ?? group.min_quantity ?? group.min_qty ?? group.min_items;
    const maxRaw = group.max ?? group.maximum ?? group.max_quantity ?? group.max_qty ?? group.max_items;
    const requiredRaw = group.required ?? group.is_required ?? group.mandatory ?? group.obligatory;
    let min = Number.isFinite(Number(minRaw)) ? Number(minRaw) : null;
    let max = Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : null;
    let required = typeof requiredRaw === 'boolean'
      ? requiredRaw
      : requiredRaw != null
        ? ['true', '1', 'yes', 'sim', 'required', 'obrigatorio'].includes(String(requiredRaw).toLowerCase())
        : null;
    let inferred = false;
    const normalized = normalize(groupName);
    const chooseMatch = normalized.match(/(?:escolha|selecione|obrigatorio|obrigatoria)\s*(?:ate|at[eé])?\s*(\d+)/);
    const atMostMatch = normalized.match(/(?:ate|at[eé])\s*(\d+)/);
    if (min == null && /obrigator|escolha\s+\d+/.test(normalized)) {
      min = chooseMatch ? Number(chooseMatch[1]) : 1;
      inferred = true;
    }
    if (max == null && chooseMatch) {
      max = Number(chooseMatch[1]);
      inferred = true;
    } else if (max == null && atMostMatch) {
      max = Number(atMostMatch[1]);
      inferred = true;
    }
    if (required == null && min != null) {
      required = min > 0;
      inferred = true;
    }
    if (max == null && children.length === 1 && min === 1) {
      max = 1;
      inferred = true;
    }
    return {
      name: groupName || 'Opcionais',
      min,
      max,
      required: Boolean(required),
      hasExplicitRule: minRaw != null || maxRaw != null || requiredRaw != null,
      hasInferredRule: inferred,
    };
  };

  for (const category of categories) {
    const items = Array.isArray(category.items) ? category.items : [];
    itemCount += items.length;
    const categorySample = { name: category.name || category.title || '', items: [] };
    for (const [itemIndex, item] of items.entries()) {
      const groups = item.add_ons || item.addons || item.options || [];
      const itemOptions = [];
      for (const group of groups || []) {
        const children = group.subitems || group.items || group.options || [];
        if (!children.length) continue;
        optionGroupCount += 1;
        const rule = inferGroupRule(group, children);
        if (rule.required) requiredOptionGroupCount += 1;
        else optionalOptionGroupCount += 1;
        if (rule.hasExplicitRule) groupsWithExplicitRuleCount += 1;
        if (rule.hasInferredRule) groupsWithInferredRuleCount += 1;

        let groupOperationalCount = 0;
        const optionSample = [];
        optionCount += children.length;
        for (const option of children) {
          const text = normalize(`${group.name || group.title || ''} ${option.name || option.title || ''}`);
          if (/\b(ketchup|catchup|talher|talheres|guardanapo|descartavel|descartaveis|sacola|embalagem|cpf|troco)\b/.test(text)) {
            groupOperationalCount += 1;
            operational.push({
              item: item.name || item.title || '',
              group: group.name || group.title || '',
              option: option.name || option.title || '',
              price: option.price ?? null,
            });
          } else {
            realOptionCount += 1;
          }
          if (optionSample.length < 8) optionSample.push({
            name: option.name || option.title || '',
            price: option.price ?? null,
            status: option.status || null,
          });
          itemOptions.push({
            group: group.name || group.title || '',
            name: option.name || option.title || '',
            price: option.price ?? null,
          });
        }
        if (groupOperationalCount < children.length) realOptionGroupCount += 1;
        if (groupSamples.length < 30) {
          groupSamples.push({
            category: category.name || category.title || '',
            item: item.name || item.title || '',
            group: rule.name,
            min: rule.min,
            max: rule.max,
            required: rule.required,
            hasExplicitRule: rule.hasExplicitRule,
            hasInferredRule: rule.hasInferredRule,
            optionCount: children.length,
            operationalOptionCount: groupOperationalCount,
            optionSample,
          });
        }
      }
      if (itemIndex < 8) {
        categorySample.items.push({
          name: item.name || item.title || '',
          price: item.price ?? item.promotional_price ?? null,
          optionSample: itemOptions.slice(0, 8),
        });
      }
    }
    if (categorySample.items.length) samples.push(categorySample);
  }
  return {
    categoryCount: categories.length,
    itemCount,
    optionCount,
    optionGroupCount,
    realOptionCount,
    realOptionGroupCount,
    requiredOptionGroupCount,
    optionalOptionGroupCount,
    groupsWithExplicitRuleCount,
    groupsWithInferredRuleCount,
    detailCompleteness: {
      hasItems: itemCount > 0,
      hasOptionGroups: optionGroupCount > 0,
      hasRealOptions: realOptionCount > 0,
      hasRules: groupsWithExplicitRuleCount > 0 || groupsWithInferredRuleCount > 0,
      hasOperationalCleanupNeed: operational.length > 0,
    },
    operationalOptionCount: operational.length,
    operationalSample: operational.slice(0, 40),
    groupSamples,
    samples: samples.slice(0, 6),
  };
}

async function directPlatformProbe(target, domSignals, targetDir) {
  const platform = target.platform || platformOf(target.sourceUrl);
  if (platform === 'cardapioweb') {
    const details = domSignals.cardapioWeb || {};
    if (!details.companyId || !details.companySlug) {
      return { platform, success: false, reason: 'cardapioweb_company_details_missing', details };
    }
    const endpoint = 'https://integracao.cardapioweb.com/api/menu/company/categories?only_available_for=delivery&origin=catalogo';
    const response = await fetch(endpoint, {
      headers: {
        company: details.companySlug,
        'company-id': String(details.companyId),
        sessionid: `bb_${Math.random().toString(36).slice(2, 12)}`,
      },
    });
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {}
    fs.writeFileSync(path.join(targetDir, 'direct-cardapioweb-response.json'), JSON.stringify({
      endpoint,
      status: response.status,
      ok: response.ok,
      details,
      payload,
      textSample: payload ? undefined : text.slice(0, 4000),
    }, null, 2), 'utf8');
    if (!response.ok || !payload) {
      return { platform, success: false, reason: `cardapioweb_api_${response.status}`, details };
    }
    return {
      platform,
      success: true,
      source: 'cardapioweb_native_api',
      endpoint,
      details,
      ...summarizeCardapioWebPayload(payload),
      lesson: 'CardapioWeb exposes structured categories/items/add-ons through integracao.cardapioweb.com when company/company-id are known.',
    };
  }

  if (platform === 'anota_ai') {
    const parsed = new URL(target.sourceUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const slug = parts[0] === 'loja' ? parts[1] : parts.pop();
    if (!slug) return { platform, success: false, reason: 'anota_slug_missing' };
    const endpoint = `https://api.anota.ai/v1/menu/merchant?slug=${encodeURIComponent(slug)}`;
    const response = await fetch(endpoint);
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {}
    fs.writeFileSync(path.join(targetDir, 'direct-anota-ai-response.json'), JSON.stringify({
      endpoint,
      status: response.status,
      ok: response.ok,
      payload,
      textSample: payload ? undefined : text.slice(0, 4000),
    }, null, 2), 'utf8');
    return {
      platform,
      success: response.ok && Boolean(payload),
      source: 'anota_ai_native_api',
      endpoint,
      payloadKeys: payload ? Object.keys(payload) : [],
      lesson: response.ok && payload
        ? 'AnotaAI can often be learned from the public merchant menu endpoint.'
        : 'AnotaAI endpoint was not available for this slug; use Browserbase network/DOM fallback.',
    };
  }

  return { platform, success: false, reason: 'no_direct_probe_for_platform_yet' };
}

async function collectTarget(browser, target, index) {
  const targetDir = path.join(OUT_DIR, `${String(index + 1).padStart(3, '0')}-${safeSlug(target.restaurantName)}`);
  fs.mkdirSync(targetDir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });

  const network = [];
  const failedRequests = [];
  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      resourceType: request.resourceType(),
      failure: request.failure()?.errorText || '',
    });
  });
  page.on('response', async (response) => {
    const request = response.request();
    const url = response.url();
    const headers = response.headers();
    const contentType = headers['content-type'] || '';
    if (!responseIsInteresting(url, contentType)) return;
    const entry = {
      url,
      status: response.status(),
      contentType,
      resourceType: request.resourceType(),
      method: request.method(),
    };
    try {
      const text = await response.text();
      entry.textLength = text.length;
      entry.textSample = text.slice(0, 12000);
      if (/json/i.test(contentType) || /^[\s[{]/.test(text)) {
        try {
          const json = JSON.parse(text);
          entry.jsonKeys = Array.isArray(json) ? ['array', String(json.length)] : Object.keys(json || {}).slice(0, 40);
          if (text.length <= 600000) {
            const file = `network-${String(network.length + 1).padStart(3, '0')}.json`;
            fs.writeFileSync(path.join(targetDir, file), JSON.stringify({ ...entry, json }, null, 2), 'utf8');
            entry.savedJsonFile = file;
          }
        } catch {}
      }
    } catch (error) {
      entry.readError = error.message || String(error);
    }
    network.push(entry);
  });

  const startedAt = new Date().toISOString();
  let domSignals = null;
  let directProbe = null;
  let error = null;
  try {
    await page.goto(target.sourceUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await page.waitForNetworkIdle({ idleTime: 1500, timeout: TIMEOUT_MS }).catch(() => null);
    await sleep(2500);
    domSignals = await extractDomSignals(page);
    fs.writeFileSync(path.join(targetDir, 'dom-signals.json'), JSON.stringify(domSignals, null, 2), 'utf8');

    await page.screenshot({
      path: path.join(targetDir, 'full-page.jpg'),
      type: 'jpeg',
      quality: 72,
      fullPage: true,
    }).catch(() => null);
    for (const ratio of [0, 0.35, 0.7, 1]) {
      await page.evaluate((targetRatio) => {
        const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: Math.round(maxScrollTop * targetRatio), behavior: 'instant' });
      }, ratio);
      await sleep(500);
      await page.screenshot({
        path: path.join(targetDir, `viewport-${String(Math.round(ratio * 100)).padStart(3, '0')}.jpg`),
        type: 'jpeg',
        quality: 72,
        fullPage: false,
      }).catch(() => null);
    }

    directProbe = await directPlatformProbe(target, domSignals, targetDir).catch((probeError) => ({
      success: false,
      error: probeError.message || String(probeError),
    }));
  } catch (caught) {
    error = caught.message || String(caught);
  } finally {
    fs.writeFileSync(path.join(targetDir, 'network.json'), JSON.stringify({ network, failedRequests }, null, 2), 'utf8');
    await page.close().catch(() => null);
  }

  const priceCount = (domSignals?.bodyTextSample?.match(/(?:R\$\s*)?\d{1,3}[,.]\d{2}/g) || []).length;
  const menuWords = ['cardapio', 'cardápio', 'menu', 'pedido', 'delivery', 'adicional', 'combo', 'pizza', 'lanche', 'bebida']
    .filter((word) => normalize(domSignals?.bodyTextSample || '').includes(normalize(word)));
  const lessonFlags = [];
  if (directProbe?.success) lessonFlags.push('structured_api_available');
  if (directProbe?.operationalOptionCount > 0) lessonFlags.push('operational_cleanup_required');
  if (domSignals?.metrics?.scrollHeight && domSignals.metrics.scrollHeight < 1200) lessonFlags.push('short_fullpage_snapshot_should_be_valid');
  if (!directProbe?.success && priceCount >= 10) lessonFlags.push('visible_text_fallback_possible');

  const result = {
    ...target,
    startedAt,
    finishedAt: new Date().toISOString(),
    targetDir,
    finalUrl: domSignals?.url || null,
    title: domSignals?.title || null,
    domMetrics: domSignals?.metrics || null,
    priceCountInVisibleText: priceCount,
    menuWords,
    networkInterestingCount: network.length,
    failedRequestCount: failedRequests.length,
    directProbe,
    lessonFlags,
    error,
  };
  fs.writeFileSync(path.join(targetDir, 'result.json'), JSON.stringify(result, null, 2), 'utf8');
  return result;
}

function writeLearningMarkdown(summary) {
  const lines = [
    `# Browserbase Menu Lab ${summary.runId}`,
    '',
    `Targets: ${summary.targets.length}`,
    `Session: ${summary.browserbase?.sessionId || 'n/a'}`,
    '',
    '## Findings',
  ];
  for (const result of summary.results) {
    lines.push('');
    lines.push(`### ${result.restaurantName}`);
    lines.push(`- Platform: ${result.platform}`);
    lines.push(`- URL: ${result.sourceUrl}`);
    lines.push(`- Direct probe: ${result.directProbe?.success ? 'success' : 'failed'} (${result.directProbe?.source || result.directProbe?.reason || result.directProbe?.error || 'n/a'})`);
    lines.push(`- Items/options: ${result.directProbe?.itemCount ?? 'n/a'} / ${result.directProbe?.optionCount ?? 'n/a'}`);
    lines.push(`- Option groups: ${result.directProbe?.optionGroupCount ?? 'n/a'} total; ${result.directProbe?.realOptionGroupCount ?? 'n/a'} real; ${result.directProbe?.requiredOptionGroupCount ?? 'n/a'} required; ${result.directProbe?.optionalOptionGroupCount ?? 'n/a'} optional`);
    lines.push(`- Rules: ${result.directProbe?.groupsWithExplicitRuleCount ?? 'n/a'} explicit; ${result.directProbe?.groupsWithInferredRuleCount ?? 'n/a'} inferred`);
    lines.push(`- Operational options: ${result.directProbe?.operationalOptionCount ?? 'n/a'}`);
    const firstGroups = (result.directProbe?.groupSamples || []).slice(0, 5)
      .map((group) => `${group.item} > ${group.group} min=${group.min ?? 'n/a'} max=${group.max ?? 'n/a'} required=${group.required} options=${group.optionCount}`)
      .join(' | ');
    if (firstGroups) lines.push(`- Group samples: ${firstGroups}`);
    lines.push(`- Lesson flags: ${(result.lessonFlags || []).join(', ') || 'none'}`);
    lines.push(`- Evidence: ${result.targetDir}`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'learning.md'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const env = readEnv();
  const targets = loadTargets();
  if (!targets.length) throw new Error('Nenhum alvo para Browserbase Lab.');

  const browserbase = await createBrowserbaseSession(env);
  const browser = await puppeteer.connect({
    browserWSEndpoint: browserbase.connectUrl,
    defaultViewport: null,
    protocolTimeout: TIMEOUT_MS + 60000,
  });

  const summary = {
    runId: RUN_ID,
    outDir: OUT_DIR,
    mode: DIRECT_URL ? 'direct-url' : 'queue',
    platform: PLATFORM || null,
    limit: LIMIT,
    targets,
    browserbase: {
      sessionId: browserbase.session.id,
      status: browserbase.session.status || null,
      keepSession: KEEP_BROWSERBASE_SESSION,
    },
    results: [],
    release: null,
  };

  try {
    for (let index = 0; index < targets.length; index += 1) {
      console.log(`[${index + 1}/${targets.length}] ${targets[index].restaurantName}`);
      const result = await collectTarget(browser, targets[index], index);
      summary.results.push(result);
      fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
      console.log(`  probe: ${result.directProbe?.success ? 'ok' : 'falhou'} | items=${result.directProbe?.itemCount ?? 'n/a'} options=${result.directProbe?.optionCount ?? 'n/a'} flags=${(result.lessonFlags || []).join(',') || 'none'}`);
    }
  } finally {
    await browser.disconnect().catch(() => null);
    summary.release = await releaseBrowserbaseSession(browserbase.apiKey, browserbase.session.id);
    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    writeLearningMarkdown(summary);
  }

  console.log(JSON.stringify({
    success: true,
    runId: RUN_ID,
    outDir: OUT_DIR,
    processed: summary.results.length,
    directProbeSuccess: summary.results.filter((result) => result.directProbe?.success).length,
    learning: path.join(OUT_DIR, 'learning.md'),
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ success: false, runId: RUN_ID, outDir: OUT_DIR, error: error.message || String(error) }, null, 2));
  process.exitCode = 1;
});
