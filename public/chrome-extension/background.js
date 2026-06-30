
try {
  importScripts(
    'universal-agent.js?v=1.10.42',
    'platform-adapters.js?v=1.10.42',
    'hybrid-audit.js?v=1.10.42'
  );
} catch (error) {
  console.warn('[FilterFood Extension] optional helper scripts failed to load', error);
}

const FF_TELEMETRY_LIMIT = 500;
const FF_LOCAL_TELEMETRY_ENDPOINT = 'http://localhost:8080/api/local-collector/extension-telemetry';
const FF_COMMAND_ENDPOINT = 'http://localhost:8080/api/local-collector/extension-command';
const FF_COMMAND_RESULT_ENDPOINT = 'http://localhost:8080/api/local-collector/extension-command-result';
const FF_COMMAND_POLL_INTERVAL_MS = 1400;
const FF_DEFAULT_WORK_TAB_PATTERNS = [
  'http://localhost:8080/admin/expansion',
  'http://127.0.0.1:8080/admin/expansion',
  'http://localhost:8080/restaurant/',
  'http://127.0.0.1:8080/restaurant/'
];
const ffTelemetryEvents = [];
let ffCommandPollingStarted = false;
let ffCommandInFlight = false;
let ffLastWorkTabId = null;

function redactTelemetryUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    const sensitiveParams = new Set([
      'code',
      'token',
      'access_token',
      'id_token',
      'auth',
      'password',
      'passwd',
      'session',
      'key',
      'api_key',
      'fbclid',
      'gclid',
      '_ga'
    ]);
    for (const param of [...url.searchParams.keys()]) {
      const lower = param.toLowerCase();
      if (sensitiveParams.has(lower) || lower.startsWith('utm_')) {
        url.searchParams.delete(param);
      }
    }
    return url.toString();
  } catch (_) {
    return rawUrl.split('#')[0].slice(0, 500);
  }
}

function pushExtensionTelemetry(event) {
  const payload = {
    ts: new Date().toISOString(),
    version: chrome.runtime.getManifest().version,
    ...event
  };
  ffTelemetryEvents.push(payload);
  if (ffTelemetryEvents.length > FF_TELEMETRY_LIMIT) {
    ffTelemetryEvents.splice(0, ffTelemetryEvents.length - FF_TELEMETRY_LIMIT);
  }
  fetch(FF_LOCAL_TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

function setupExtensionTelemetryListeners() {
  try {
    if (!chrome?.tabs) return;

    chrome.runtime.onInstalled.addListener((details) => {
      pushExtensionTelemetry({ type: 'runtime.installed', reason: details.reason });
    });

    chrome.runtime.onStartup.addListener(() => {
      pushExtensionTelemetry({ type: 'runtime.startup' });
    });

    chrome.tabs.onCreated.addListener((tab) => {
      pushExtensionTelemetry({
        type: 'tab.created',
        tabId: tab.id,
        windowId: tab.windowId,
        active: tab.active,
        url: redactTelemetryUrl(tab.url || tab.pendingUrl),
        title: tab.title || ''
      });
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (!changeInfo.url && !changeInfo.status && !changeInfo.title) return;
      pushExtensionTelemetry({
        type: 'tab.updated',
        tabId,
        windowId: tab.windowId,
        active: tab.active,
        status: changeInfo.status,
        url: redactTelemetryUrl(changeInfo.url || tab.url || tab.pendingUrl),
        title: changeInfo.title || tab.title || ''
      });
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
      pushExtensionTelemetry({
        type: 'tab.activated',
        tabId: activeInfo.tabId,
        windowId: activeInfo.windowId
      });
    });

    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      pushExtensionTelemetry({
        type: 'tab.removed',
        tabId,
        windowId: removeInfo.windowId,
        isWindowClosing: removeInfo.isWindowClosing
      });
    });

    pushExtensionTelemetry({ type: 'telemetry.ready' });
  } catch (error) {
    console.warn('[FilterFood Extension] visual telemetry failed to start', error?.message || error);
  }
}

setupExtensionTelemetryListeners();

async function fetchLocalJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (_) {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

async function postExtensionCommandResult(command, payload) {
  const resultPayload = {
    commandId: command?.id || null,
    command,
    ...payload
  };
  await fetchLocalJson(FF_COMMAND_RESULT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resultPayload)
  });
}

async function getCommandTargetTab(command = {}) {
  if (typeof command.tabId === 'number') {
    try {
      const tab = await chrome.tabs.get(command.tabId);
      if (tab?.id) {
        ffLastWorkTabId = tab.id;
        return tab;
      }
    } catch (_) {}
  }

  if (typeof ffLastWorkTabId === 'number') {
    try {
      const tab = await chrome.tabs.get(ffLastWorkTabId);
      const tabUrl = String(tab?.url || tab?.pendingUrl || '');
      if (tab?.id && !tabUrl.startsWith('chrome://')) return tab;
    } catch (_) {
      ffLastWorkTabId = null;
    }
  }

  const explicitPatterns = [
    command.targetUrl,
    command.urlPrefix,
    command.matchUrl,
    command.url
  ]
    .filter(Boolean)
    .map(value => String(value));

  const patterns = explicitPatterns.length ? explicitPatterns : FF_DEFAULT_WORK_TAB_PATTERNS;
  const allTabs = await chrome.tabs.query({});
  const matchingTab = allTabs
    .filter(tab => typeof tab.id === 'number')
    .find(tab => {
      const tabUrl = String(tab.url || tab.pendingUrl || '');
      return patterns.some(pattern => tabUrl.startsWith(pattern) || tabUrl.includes(pattern));
    });

  if (matchingTab?.id) {
    ffLastWorkTabId = matchingTab.id;
    return matchingTab;
  }

  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTabs[0]?.id) {
    ffLastWorkTabId = activeTabs[0].id;
    return activeTabs[0];
  }

  const fallbackTab = allTabs
    .filter(tab => typeof tab.id === 'number')
    .sort((a, b) => Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0))[0] || null;
  if (fallbackTab?.id) ffLastWorkTabId = fallbackTab.id;
  return fallbackTab;
}

async function executeOnCommandTab(tabId, func, args = []) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args
  });
  return result?.result;
}

function getVisibleDomSummaryInPage(limit = 90) {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const isVisible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const serializeRect = (rect) => ({
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  });
  const interactiveSelector = [
    'button',
    'a[href]',
    '[role="button"]',
    'input',
    'textarea',
    'select',
    '[onclick]'
  ].join(',');
  const elements = Array.from(document.querySelectorAll(interactiveSelector))
    .filter(isVisible)
    .slice(0, Math.max(1, Number(limit) || 90))
    .map((el, index) => {
      const rect = el.getBoundingClientRect();
      return {
        index,
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        text: normalize(el.innerText || el.textContent || el.value || '').slice(0, 220),
        aria: normalize(el.getAttribute('aria-label')).slice(0, 220),
        title: normalize(el.getAttribute('title')).slice(0, 220),
        href: el.href || el.getAttribute('href') || '',
        placeholder: normalize(el.getAttribute('placeholder')).slice(0, 220),
        rect: serializeRect(rect)
      };
    });
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,[role="heading"]'))
    .filter(isVisible)
    .slice(0, 40)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: normalize(el.innerText || el.textContent).slice(0, 220),
      rect: serializeRect(el.getBoundingClientRect())
    }));
  return {
    title: document.title,
    url: location.href,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollY: Math.round(window.scrollY),
      scrollHeight: Math.round(document.documentElement.scrollHeight || document.body.scrollHeight || 0)
    },
    headings,
    elements,
    textExcerpt: normalize(document.body?.innerText || '').slice(0, 5000)
  };
}

function clickTextInPage(targetText) {
  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const target = normalize(targetText);
  if (!target) return { success: false, error: 'Texto vazio.' };
  const candidates = Array.from(document.querySelectorAll('button,a[href],[role="button"],[onclick],input[type="button"],input[type="submit"]'));
  let best = null;
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none') continue;
    const value = normalize(el.innerText || el.textContent || el.getAttribute('aria-label') || el.value || el.title || '');
    if (!value) continue;
    if (value === target || value.includes(target) || target.includes(value)) {
      best = { el, value };
      break;
    }
  }
  if (!best) return { success: false, error: `Texto clicavel nao encontrado: ${targetText}` };
  best.el.scrollIntoView({ block: 'center', inline: 'center' });
  best.el.click();
  return {
    success: true,
    clickedText: (best.el.innerText || best.el.textContent || best.el.value || '').trim().slice(0, 240),
    matched: best.value,
    tag: best.el.tagName
  };
}

function clickSelectorInPage(selector) {
  const el = document.querySelector(selector);
  if (!el) return { success: false, error: `Selector nao encontrado: ${selector}` };
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.click();
  return {
    success: true,
    clickedText: (el.innerText || el.textContent || el.value || '').trim().slice(0, 240),
    tag: el.tagName
  };
}

function scrollInPage(deltaY) {
  window.scrollBy({ top: Number(deltaY) || 600, left: 0, behavior: 'smooth' });
  return {
    success: true,
    scrollY: Math.round(window.scrollY),
    scrollHeight: Math.round(document.documentElement.scrollHeight || document.body.scrollHeight || 0)
  };
}

async function executeVisualCommand(command) {
  const type = String(command?.type || command?.action || '').trim();
  if (!type) throw new Error('Comando sem tipo.');

  if (type === 'open_url') {
    const url = String(command.url || '');
    if (!/^https?:\/\/|^http:\/\/localhost|^http:\/\/127\.0\.0\.1/i.test(url)) {
      throw new Error(`URL nao permitida para open_url: ${url}`);
    }
    const targetTab = await getCommandTargetTab(command);
    const tab = command.newTab || !targetTab?.id
      ? await chrome.tabs.create({ url, active: command.active !== false })
      : await chrome.tabs.update(targetTab.id, { url, active: command.active !== false });
    if (tab?.id) ffLastWorkTabId = tab.id;
    return { opened: true, tabId: tab.id, url: redactTelemetryUrl(url) };
  }

  const tab = await getCommandTargetTab(command);
  if (!tab?.id) throw new Error('Nenhuma aba do Chrome disponivel para executar o comando.');

  if (type === 'activate_tab') {
    await chrome.tabs.update(tab.id, { active: true });
    return { activated: true, tabId: tab.id, url: redactTelemetryUrl(tab.url || tab.pendingUrl), title: tab.title || '' };
  }

  if (type === 'snapshot') {
    const captured = await handleCaptureTab(tab.id);
    return {
      ...captured,
      tabId: tab.id,
      url: redactTelemetryUrl(tab.url || tab.pendingUrl),
      title: tab.title || ''
    };
  }

  if (type === 'dom_summary') {
    const summary = await executeOnCommandTab(tab.id, getVisibleDomSummaryInPage, [command.limit || 90]);
    return { tabId: tab.id, ...summary };
  }

  if (type === 'click_text') {
    const result = await executeOnCommandTab(tab.id, clickTextInPage, [command.text || command.label || '']);
    await new Promise(resolve => setTimeout(resolve, Number(command.waitMs) || 500));
    return { tabId: tab.id, ...result };
  }

  if (type === 'click_selector') {
    const result = await executeOnCommandTab(tab.id, clickSelectorInPage, [command.selector || '']);
    await new Promise(resolve => setTimeout(resolve, Number(command.waitMs) || 500));
    return { tabId: tab.id, ...result };
  }

  if (type === 'scroll') {
    const result = await executeOnCommandTab(tab.id, scrollInPage, [command.deltaY || command.y || 600]);
    return { tabId: tab.id, ...result };
  }

  if (type === 'wait') {
    await new Promise(resolve => setTimeout(resolve, Math.min(Number(command.ms) || 1000, 30000)));
    return { waited: true, ms: Math.min(Number(command.ms) || 1000, 30000) };
  }

  throw new Error(`Comando nao suportado: ${type}`);
}

function scheduleExtensionCommandPoll(delay = FF_COMMAND_POLL_INTERVAL_MS) {
  setTimeout(pollExtensionCommands, delay);
}

async function pollExtensionCommands() {
  if (ffCommandInFlight) {
    scheduleExtensionCommandPoll(FF_COMMAND_POLL_INTERVAL_MS);
    return;
  }
  ffCommandInFlight = true;
  try {
    const version = encodeURIComponent(chrome.runtime.getManifest().version);
    const pulled = await fetchLocalJson(`${FF_COMMAND_ENDPOINT}?client=chrome-extension&version=${version}`);
    const command = pulled?.command;
    if (command) {
      pushExtensionTelemetry({
        type: 'command.received',
        commandId: command.id,
        commandType: command.type || command.action
      });
      try {
        const result = await executeVisualCommand(command);
        await postExtensionCommandResult(command, { success: result?.success !== false, result });
        pushExtensionTelemetry({
          type: 'command.completed',
          commandId: command.id,
          commandType: command.type || command.action,
          success: result?.success !== false
        });
      } catch (error) {
        await postExtensionCommandResult(command, {
          success: false,
          error: error?.message || String(error),
          result: null
        }).catch(() => {});
        pushExtensionTelemetry({
          type: 'command.failed',
          commandId: command.id,
          commandType: command.type || command.action,
          error: error?.message || String(error)
        });
      }
    }
  } catch (error) {
    pushExtensionTelemetry({
      type: 'command.poll.error',
      error: error?.message || String(error)
    });
  } finally {
    ffCommandInFlight = false;
    scheduleExtensionCommandPoll(FF_COMMAND_POLL_INTERVAL_MS);
  }
}

function startExtensionCommandPolling() {
  if (ffCommandPollingStarted) return;
  ffCommandPollingStarted = true;
  pushExtensionTelemetry({ type: 'command.polling.ready' });
  scheduleExtensionCommandPoll(1000);
}

startExtensionCommandPolling();

const isTabLockError = e => e && e.message && (
  e.message.toLowerCase().includes('cannot be edited') ||
  e.message.toLowerCase().includes('locked') ||
  e.message.toLowerCase().includes('dragging')
);

const ffRecentTabKeys = new Map();
const ffTabCreationLocks = new Map();
let ffMapsLeadSearchTabId = null;

function isMapsLeadSearchTab(tab) {
  const rawUrl = String(tab?.pendingUrl || tab?.url || '');
  if (!/^https?:\/\//i.test(rawUrl)) return false;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    return /^google\./i.test(host) && /^\/maps\/(search|place)\b/i.test(parsed.pathname);
  } catch (_) {
    return /google\.[^/]+\/maps\/(search|place)\b/i.test(rawUrl);
  }
}

async function findReusableMapsLeadSearchTab() {
  const tabs = await chrome.tabs.query({});
  const mapsTabs = tabs.filter(isMapsLeadSearchTab);
  if (mapsTabs.length === 0) return null;
  return mapsTabs
    .sort((a, b) => {
      const activeScore = Number(Boolean(b.active)) - Number(Boolean(a.active));
      if (activeScore) return activeScore;
      return Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0);
    })[0] || null;
}

async function closeStaleMapsLeadSearchTabs(keepTabId) {
  if (typeof keepTabId !== 'number') return;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const tabs = await chrome.tabs.query({});
    const staleIds = tabs
      .filter(tab => tab.id !== keepTabId && isMapsLeadSearchTab(tab))
      .map(tab => tab.id)
      .filter(id => typeof id === 'number');
    if (staleIds.length === 0) return;
    try {
      await chrome.tabs.remove(staleIds);
    } catch (_) {
      await Promise.all(staleIds.map(tabId => removeTabWithRetry(tabId).catch(() => {})));
    }
    await new Promise(resolve => setTimeout(resolve, 350));
  }
}

function normalizeTabUrlForDedupe(rawUrl) {
  try {
    let current = String(rawUrl || '');
    for (let i = 0; i < 4; i++) {
      const parsed = new URL(current);
      const wrapped = parsed.searchParams.get('u') || parsed.searchParams.get('url') || parsed.searchParams.get('redirect_uri');
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (!wrapped || !/(instagram\.com|facebook\.com|l\.instagram\.com)$/i.test(host)) break;
      current = decodeURIComponent(wrapped);
    }
    const parsed = new URL(current);
    parsed.hash = '';
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (/^(utm_|fbclid|gclid|igsh|mc_|ref$|source$)/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    return parsed.toString();
  } catch (_) {
    return String(rawUrl || '').replace(/[#?].*$/, '').toLowerCase();
  }
}
async function findExistingTabByDedupeKey(key) {
  if (!key) return null;
  const tabs = await chrome.tabs.query({});
  return tabs.find(tab => normalizeTabUrlForDedupe(tab.pendingUrl || tab.url || '') === key) || null;
}

async function createTabWithRetry(options, maxRetries = 10) {
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('options must be an object');
  }
  const dedupeKey = normalizeTabUrlForDedupe(options.url || '');
  if (dedupeKey && /^https?:\/\//i.test(dedupeKey)) {
    const existingLock = ffTabCreationLocks.get(dedupeKey);
    if (existingLock) {
      try {
        const existing = await existingLock;
        if (existing?.id) return existing;
      } catch (_) {}
    }
    const recent = ffRecentTabKeys.get(dedupeKey);
    if (recent && Date.now() - recent.createdAt < 45000) {
      const existing = await findExistingTabByDedupeKey(dedupeKey);
      if (existing?.id) {
        try { await chrome.tabs.update(existing.id, { active: options.active === true }); } catch (_) {}
        return existing;
      }
    }
  }
  let creationResolve;
  let creationReject;
  const creationPromise = dedupeKey ? new Promise((resolve, reject) => { creationResolve = resolve; creationReject = reject; }) : null;
  if (dedupeKey && creationPromise) ffTabCreationLocks.set(dedupeKey, creationPromise);
  for (let i = 0; i < maxRetries; i++) {
    try {
      const created = await chrome.tabs.create(options);
      if (dedupeKey) {
        ffRecentTabKeys.set(dedupeKey, { tabId: created.id, createdAt: Date.now() });
        creationResolve?.(created);
        ffTabCreationLocks.delete(dedupeKey);
        setTimeout(() => ffRecentTabKeys.delete(dedupeKey), 90000);
      }
      return created;
    } catch (e) {
      if (isTabLockError(e)) {
        console.warn('Chrome is locked. Retrying tab creation...', i);
        const delay = 200 * Math.pow(1.5, i);
        await new Promise(r => setTimeout(r, delay));
      } else {
        creationReject?.(e);
        if (dedupeKey) ffTabCreationLocks.delete(dedupeKey);
        throw e;
      }
    }
  }
  const timeoutError = new Error('Timeout: Chrome tabs locked for too long.');
  creationReject?.(timeoutError);
  if (dedupeKey) ffTabCreationLocks.delete(dedupeKey);
  throw timeoutError;
}

async function removeTabWithRetry(tabId, maxRetries = 10) {
  if (typeof tabId !== 'number') {
    throw new TypeError('tabId must be a number');
  }
  try {
    await new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          reject(new Error('Tab does not exist'));
        } else {
          resolve();
        }
      });
    });
  } catch (e) {
    return;
  }
  for (let i = 0; i < maxRetries; i++) {
    try {
      await chrome.tabs.remove(tabId);
      return;
    } catch (e) {
      if (isTabLockError(e)) {
        console.warn('Chrome is locked. Retrying tab remove...', i);
        const delay = 200 * Math.pow(1.5, i);
        await new Promise(r => setTimeout(r, delay));
      } else {
        return;
      }
    }
  }
}

async function updateTabWithRetry(tabId, options, maxRetries = 10) {
  if (typeof tabId !== 'number') {
    throw new TypeError('tabId must be a number');
  }
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('options must be an object');
  }
  try {
    await new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          reject(new Error('Tab does not exist'));
        } else {
          resolve();
        }
      });
    });
  } catch (e) {
    throw new Error(`Tab ${tabId} does not exist: ${e.message}`);
  }
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await chrome.tabs.update(tabId, options);
    } catch (e) {
      if (isTabLockError(e)) {
        console.warn('Chrome is locked. Retrying tab update...', i);
        const delay = 200 * Math.pow(1.5, i);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  throw new Error('Timeout: Chrome tabs locked for too long.');
}

async function getOrCreateMapsLeadSearchTab(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    throw new Error('URL inválida para busca no Maps.');
  }

  if (typeof ffMapsLeadSearchTabId === 'number') {
    try {
      const updated = await updateTabWithRetry(ffMapsLeadSearchTabId, { url, active: true });
      await closeStaleMapsLeadSearchTabs(ffMapsLeadSearchTabId);
      return updated || { id: ffMapsLeadSearchTabId };
    } catch (error) {
      ffMapsLeadSearchTabId = null;
    }
  }

  const reusableTab = await findReusableMapsLeadSearchTab();
  if (reusableTab?.id) {
    ffMapsLeadSearchTabId = reusableTab.id;
    const updated = await updateTabWithRetry(reusableTab.id, { url, active: true });
    await closeStaleMapsLeadSearchTabs(reusableTab.id);
    return updated || { id: reusableTab.id };
  }

  const tab = await createTabWithRetry({ url, active: true });
  ffMapsLeadSearchTabId = tab.id;
  await closeStaleMapsLeadSearchTabs(tab.id);
  return tab;
}

async function waitForTabToComplete(tabId, timeoutMs = 30000) {
  if (typeof tabId !== 'number') {
    throw new TypeError('tabId must be a number');
  }
  try {
    const tab = await new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (t) => {
        if (chrome.runtime.lastError || !t) {
          reject(new Error('Tab does not exist'));
        } else {
          resolve(t);
        }
      });
    });
    if (tab.status === 'complete') {
      return;
    }
  } catch (e) {
    throw new Error(`Tab ${tabId} does not exist: ${e.message}`);
  }
  return new Promise((resolve, reject) => {
    let timer = null;
    const cleanUp = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(removedListener);
      if (timer) clearTimeout(timer);
    };
    const listener = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        cleanUp();
        resolve();
      }
    };
    const removedListener = (removedTabId) => {
      if (removedTabId === tabId) {
        cleanUp();
        reject(new Error(`Tab ${tabId} was closed while waiting to load.`));
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.onRemoved.addListener(removedListener);
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        cleanUp();
        reject(new Error(`Timeout waiting for tab ${tabId} to complete loading.`));
      }, timeoutMs);
    }
  });
}


// Service worker for the Chrome Extension

function handleExtensionMessage(message, sender, sendResponse) {
  console.log("Recebida mensagem da extensão:", message, sender);

  if (message.action === "getExtensionTelemetry") {
    const limit = Math.min(Math.max(Number(message.limit) || 200, 1), FF_TELEMETRY_LIMIT);
    sendResponse({
      success: true,
      version: chrome.runtime.getManifest().version,
      count: ffTelemetryEvents.length,
      events: ffTelemetryEvents.slice(-limit)
    });
    return true;
  }

  if (message.action === "clearExtensionTelemetry") {
    ffTelemetryEvents.length = 0;
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === "navigateWithAI") {
    let origin = '';
    try { origin = new URL(sender.url).origin; } catch (_) {}
    if (!globalThis.FilterFoodUniversalAgent) {
      sendResponse({ success: false, error: 'Navegador GPT não carregado.' });
      return true;
    }
    globalThis.FilterFoodUniversalAgent.run({ url: message.url, goal: message.goal, context: message.context || {}, origin, maxSteps: message.maxSteps || 8 })
      .then(sendResponse)
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "ping") {
    sendResponse({
      success: true,
      version: chrome.runtime.getManifest().version,
      capabilities: {
        nativePlatformAdapters: !!(globalThis.FilterFoodPlatformAdapters && typeof globalThis.FilterFoodPlatformAdapters.extract === 'function'),
        universalAgent: !!(globalThis.FilterFoodUniversalAgent && typeof globalThis.FilterFoodUniversalAgent.run === 'function'),
        visualTelemetry: true,
        commandBridge: true
      }
    });
    return true;
  }
  
  if (message.action === "downloadImage") {
    const { url } = message;
    fetch(url)
      .then(async res => {
        if (res.ok) {
          const blob = await res.blob();
          const contentType = blob.type || 'image/jpeg';
          const base64 = await blobToBase64(blob);
          sendResponse({ success: true, logoDataUrl: `data:${contentType};base64,${base64}` });
        } else {
          sendResponse({ success: false, error: "HTTP error: " + res.status });
        }
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Mantém o canal aberto para resposta assíncrona
  }
  
  if (message.action === "scrapeInstagram") {
    const { instagramUrl } = message;
    
    handleInstagramScrape(instagramUrl, {
      lightweight: message.lightweight === true,
      collectImages: message.collectImages !== false && message.lightweight !== true,
      feedImageLimit: message.feedImageLimit,
      highlightImageLimit: message.highlightImageLimit
    })
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      
    return true; // Mantém o canal de mensagem aberto para resposta assíncrona
  }
  
  if (message.action === "scrapeInstagramPost") {
    const { url } = message;
    
    handleInstagramPostScrape(url)
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      
    return true; // Mantém o canal de mensagem aberto para resposta assíncrona
  }
  
  if (message.action === "discoverInstagramMenuLinks") {
    const { instagramUrl, url, restaurantName, city, neighborhood } = message;
    let responded = false;
    const safeSend = payload => { if (!responded) { responded = true; try { sendResponse(payload); } catch (error) { console.error('[Extension] Falha ao responder discoverInstagramMenuLinks:', error); } } };
    handleInstagramMenuLinkDiscovery(instagramUrl || url, restaurantName || '', city || '', neighborhood || '')
      .then(result => safeSend(result || { success: false, error: 'Descoberta sem resultado.' }))
      .catch(err => safeSend({ success: false, error: err?.message || String(err) }));
    return true;
  }

  if (message.action === "scrapeMenuFromInstagram") {
    const { instagramUrl, url, restaurantName, city, neighborhood } = message;
    let responded = false;
    const safeSend = (payload) => {
      if (responded) return;
      responded = true;
      try { sendResponse(payload); } catch (error) { console.error('[Extension] Falha ao responder scrapeMenuFromInstagram:', error); }
    };
    const timer = setTimeout(() => safeSend({ success: false, error: 'Timeout interno na descoberta de cardápio via Instagram.' }), 170000);
    Promise.resolve()
      .then(() => handleMenuScrapeFromInstagram(instagramUrl || url, restaurantName || '', city || '', neighborhood || '', sender))
      .then(result => { clearTimeout(timer); safeSend(result || { success: false, error: 'Descoberta de cardápio sem resultado.' }); })
      .catch(err => { clearTimeout(timer); safeSend({ success: false, error: err?.message || String(err) }); });
    return true;
  }

  if (message.action === "scrapeMenu") {
    const { url } = message;
    
    handleMenuScrape(url, sender)
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      
    return true; // Mantém o canal de mensagem aberto para resposta assíncrona
  }
  
  if (message.action === "scrapeGoogleHours") {
    const { query, mapUrl } = message;
    handleGoogleHoursScrape(query, mapUrl)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.action === "searchGoogleForMenu") {
    const { query } = message;
    handleSearchGoogleForMenu(query)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.action === "scrapeWebContext") {
    const { url } = message;
    handleWebContextScrape(url)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.action === "getAgentSnapshot") {
    handleAgentSnapshot(message.url)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.action === "clickAgentElement") {
    handleClickAgentElement(message.targetId)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "closeAgentTab") {
    handleAgentClose()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "searchGoogleForInstagram") {
    const { query, blocklist } = message;
    handleSearchGoogleForInstagram(query, blocklist || [])
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "searchBingForInstagram") {
    const { query, blocklist } = message;
    handleSearchBingForInstagram(query, blocklist || [])
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "searchGoogleNative") {
    const { query } = message;
    handleSearchGoogleNative(query)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "searchGoogleMapsLeads") {
    const { query, city, state, maxResults } = message;
    handleSearchGoogleMapsLeads(query, city, state, maxResults || 80)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "captureVisibleTab") {
    const { tabId } = message;
    if (!tabId) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          handleCaptureTab(tabs[0].id)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        } else {
          sendResponse({ success: false, error: "Nenhuma aba ativa encontrada." });
        }
      });
    } else {
      handleCaptureTab(tabId)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
    }
    return true;
  }
}

chrome.runtime.onMessageExternal.addListener(handleExtensionMessage);
chrome.runtime.onMessage.addListener(handleExtensionMessage);

chrome.runtime.onConnectExternal.addListener((port) => {
  console.log("[Extension] Conexão externa via port estabelecida:", port.name);
  
  port.onMessage.addListener(async (message) => {
    console.log("[Extension] Mensagem recebida via port:", message);
    
    if (message && message.action === "scrapeMenuFromInstagram") {
      const { instagramUrl, restaurantName, city, neighborhood } = message;
      try {
        const result = await handleMenuScrapeFromInstagram(instagramUrl, restaurantName, city, neighborhood, port.sender);
        port.postMessage(result);
      } catch (err) {
        console.error("Erro ao processar scrapeMenuFromInstagram via port:", err);
        port.postMessage({ success: false, error: err.message });
      }
    }
  });
});

async function handleSearchGoogleNative(query) {
  console.log("Iniciando busca nativa no Google para:", query);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const tab = await createTabWithRetry({ url: searchUrl, active: false });
  const tabId = tab.id;
  
  try {
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba foi fechada prematuramente."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 30) {
              reject(new Error("Tempo limite na busca do Google."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    const waitForGoogleSearchReady = async () => {
      let captchaSeen = false;
      const deadline = Date.now() + 45 * 1000;
      while (Date.now() < deadline) {
        const stateResult = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            const bodyText = (document.body?.innerText || '').toLowerCase();
            const html = document.documentElement?.innerHTML || '';
            const href = location.href.toLowerCase();
            const hasCaptcha = href.includes('/sorry/')
              || /captcha|recaptcha|unusual traffic|trafego incomum|tráfego incomum|not a robot|nao sou um robo|não sou um robô/i.test(bodyText)
              || Boolean(document.querySelector('iframe[src*="recaptcha"], form[action*="/sorry/"], input[name="captcha"]'));
            const hasSearchContent = Boolean(document.querySelector('#search a[href], a[href*="instagram.com"]'))
              || /instagram\.com/i.test(html);
            return { hasCaptcha, hasSearchContent, href: location.href, title: document.title };
          }
        });
        const state = stateResult && stateResult[0] && stateResult[0].result;
        if (!state?.hasCaptcha && state?.hasSearchContent) return { success: true };
        if (state?.hasCaptcha) captchaSeen = true;
        try {
          const currentTab = await chrome.tabs.get(tabId);
          await chrome.tabs.update(tabId, { active: true });
          if (currentTab?.windowId) await chrome.windows.update(currentTab.windowId, { focused: true });
        } catch(e) {}
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
      return captchaSeen
        ? { success: false, requiresHuman: true, blocker: 'google_captcha_instagram_search', error: 'Google pediu captcha na busca de Instagram. Resolva a aba aberta e rode Validar IA novamente.' }
        : { success: false, requiresHuman: true, blocker: 'google_search_unreadable', error: 'Google nao renderizou resultados de busca. Abra a aba/entre no perfil correto e rode Validar IA novamente.' };
    };

    const readiness = await waitForGoogleSearchReady();
    if (readiness?.requiresHuman) return readiness;

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // Extrai Título, Link e Snippet (resumo) dos resultados
        const items = Array.from(document.querySelectorAll('.g'));
        const scraped = [];
        for (const item of items) {
          const titleEl = item.querySelector('h3');
          const linkEl = item.querySelector('a');
          const snippetEl = item.querySelector('.VwiC3b, .IsZvec'); // Classes comuns de snippet no Google
          
          if (titleEl && linkEl) {
            scraped.push({
              title: titleEl.innerText || titleEl.textContent,
              link: linkEl.href,
              snippet: snippetEl ? (snippetEl.innerText || snippetEl.textContent) : ''
            });
          }
        }
        return scraped;
      }
    });

    const foundResults = results && results[0] && results[0].result;
    if (foundResults && foundResults.length > 0) {
      return { success: true, results: foundResults };
    } else {
      return { success: false, error: "Nenhum resultado encontrado no Google." };
    }
  } catch (err) {
    console.error("Erro na busca nativa do Google:", err);
    return { success: false, error: err.message };
  } finally {
    try {
      await removeTabWithRetry(tabId);
    } catch(e) {}
  }
}

async function handleSearchGoogleForInstagram(query, blocklist) {
  console.log("Iniciando busca por Instagram para:", query);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent('site:instagram.com ' + query)}`;
  const tab = await createTabWithRetry({ url: searchUrl, active: false });
  const tabId = tab.id;
  let keepTabOpenForHuman = false;
  
  try {
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba foi fechada prematuramente."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 30) {
              reject(new Error("Tempo limite na busca do Google."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    const waitForGoogleInstagramSearchReady = async () => {
      let captchaSeen = false;
      const deadline = Date.now() + 45 * 1000;

      while (Date.now() < deadline) {
        const stateResult = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            const bodyText = (document.body?.innerText || '').toLowerCase();
            const html = document.documentElement?.innerHTML || document.body?.innerHTML || '';
            const href = location.href.toLowerCase();
            const hasCaptcha = href.includes('/sorry/')
              || /captcha|recaptcha|unusual traffic|trafego incomum|tráfego incomum|not a robot|nao sou um robo|não sou um robô/i.test(bodyText)
              || Boolean(document.querySelector('iframe[src*="recaptcha"], form[action*="/sorry/"], input[name="captcha"]'));
            const hasSearchContent = Boolean(document.querySelector('#search a[href], a[href*="instagram.com"]'))
              || /instagram\.com/i.test(html);
            return { hasCaptcha, hasSearchContent, href: location.href, title: document.title };
          }
        });
        const state = stateResult && stateResult[0] && stateResult[0].result;

        if (!state?.hasCaptcha && state?.hasSearchContent) return { success: true };
        if (state?.hasCaptcha) captchaSeen = true;

        try {
          const currentTab = await chrome.tabs.get(tabId);
          await chrome.tabs.update(tabId, { active: true });
          if (currentTab?.windowId) await chrome.windows.update(currentTab.windowId, { focused: true });
        } catch(e) {}

        await new Promise(resolve => setTimeout(resolve, 2500));
      }

      return captchaSeen
        ? { success: false, requiresHuman: true, blocker: 'google_captcha_instagram_search', error: 'Google pediu captcha na busca de Instagram. Resolva a aba aberta e rode Validar IA novamente.' }
        : { success: false, requiresHuman: true, blocker: 'google_search_unreadable', error: 'Google nao renderizou resultados de busca. Abra a aba/entre no perfil correto e rode Validar IA novamente.' };
    };

    const readiness = await waitForGoogleInstagramSearchReady();
    if (readiness?.requiresHuman) {
      keepTabOpenForHuman = true;
      return readiness;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (blist) => {
        // Extrai os links do Google
        const anchors = Array.from(document.querySelectorAll('#search a'));
        const links = [];
        for (const a of anchors) {
          if (a.href && a.href.includes('instagram.com')) links.push(a.href);
        }
        if (links.length === 0) {
          for (const a of Array.from(document.querySelectorAll('a[href]'))) {
            if (a.href && a.href.includes('instagram.com')) links.push(a.href);
          }
        }
        if (links.length === 0) {
          const html = document.documentElement.innerHTML || document.body.innerHTML || document.body.innerText || '';
          const rawMatches = html.match(/https?:\\?\/\\?\/(?:www\\?\.)?instagram\.com\\?\/[a-zA-Z0-9._]+/gi) || [];
          for (const raw of rawMatches) {
            links.push(raw.replace(/\\\//g, '/').replace(/\\/g, ''));
          }
        }
        if (links.length === 0) {
          const visibleText = document.body?.innerText || '';
          const handleMatches = visibleText.match(/@([a-zA-Z0-9._]{3,30})/g) || [];
          const ignored = new Set(['@instagram', '@google', '@gmail', '@maps']);
          for (const raw of handleMatches) {
            const handle = raw.replace(/^@/, '').replace(/[.\s]+$/g, '');
            if (!handle || ignored.has(`@${handle.toLowerCase()}`)) continue;
            links.push(`https://www.instagram.com/${handle}/`);
          }
        }
        
        // Regex para extrair só perfil
        const validProfiles = [];
        for (const link of links) {
          let normalizedLink = link;
          try { normalizedLink = decodeURIComponent(link); } catch(e) {}
          try {
            const parsedLink = new URL(normalizedLink, location.href);
            const target = parsedLink.searchParams.get('url') || parsedLink.searchParams.get('q') || parsedLink.searchParams.get('u');
            if (target && target.includes('instagram.com')) normalizedLink = decodeURIComponent(target);
          } catch(e) {}
          const m = normalizedLink.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?/);
          if (m && m[1] && m[1] !== 'p' && m[1] !== 'reel' && m[1] !== 'explore' && !m[1].includes('?')) {
            const cleanUrl = `https://www.instagram.com/${m[1]}/`;
            if (!blist.includes(cleanUrl)) {
              validProfiles.push(cleanUrl);
            }
          }
        }
        // Retorna até 3 candidatos únicos
        const unique = [...new Set(validProfiles)];
        return unique.length > 0 ? unique.slice(0, 3) : null;
      },
      args: [blocklist]
    });

    const foundUrls = results && results[0] && results[0].result;
    if (foundUrls && foundUrls.length > 0) {
      return { success: true, candidates: foundUrls, urls: foundUrls, url: foundUrls[0] };
    } else {
      return { success: false, error: "Nenhum link encontrado." };
    }
  } catch (err) {
    console.error("Erro na busca de Instagram:", err);
    return { success: false, error: err.message };
  } finally {
    if (!keepTabOpenForHuman) {
      try {
        await removeTabWithRetry(tabId);
      } catch(e) {}
    }
  }
}

async function handleSearchBingForInstagram(query, blocklist) {
  console.log("Iniciando busca alternativa por Instagram no Bing para:", query);
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent('site:instagram.com ' + query)}`;
  const tab = await createTabWithRetry({ url: searchUrl, active: false });
  const tabId = tab.id;
  let keepTabOpenForHuman = false;

  try {
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba foi fechada prematuramente."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 30) reject(new Error("Tempo limite na busca do Bing."));
            else setTimeout(checkStatus, 500);
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    const readiness = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const bodyText = (document.body?.innerText || '').toLowerCase();
        const html = document.documentElement?.innerHTML || document.body?.innerHTML || '';
        const hasCaptcha = /captcha|recaptcha|unusual traffic|not a robot|nao sou um robo|não sou um robô|tráfego incomum|trafego incomum/i.test(bodyText)
          || Boolean(document.querySelector('iframe[src*="recaptcha"], input[name="captcha"]'));
        const hasSearchContent = Boolean(document.querySelector('a[href*="instagram.com"], #b_results a[href]'))
          || /instagram\.com/i.test(html);
        return { hasCaptcha, hasSearchContent };
      }
    });
    const searchState = readiness && readiness[0] && readiness[0].result;
    if (searchState?.hasCaptcha) {
      keepTabOpenForHuman = true;
      return { success: false, requiresHuman: true, blocker: 'bing_captcha_instagram_search', error: 'Bing pediu captcha na busca de Instagram. Resolva a aba aberta e rode Validar IA novamente.' };
    }
    if (!searchState?.hasSearchContent) {
      return { success: false, error: 'Bing nao retornou candidatos de Instagram.' };
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (blist) => {
        const links = [];
        for (const a of Array.from(document.querySelectorAll('#b_results a[href], a[href]'))) {
          if (a.href && a.href.includes('instagram.com')) links.push(a.href);
        }
        if (links.length === 0) {
          const html = document.documentElement.innerHTML || document.body.innerHTML || document.body.innerText || '';
          const rawMatches = html.match(/https?:\\?\/\\?\/(?:www\\?\.)?instagram\.com\\?\/[a-zA-Z0-9._]+/gi) || [];
          for (const raw of rawMatches) {
            links.push(raw.replace(/\\\//g, '/').replace(/\\/g, ''));
          }
        }
        if (links.length === 0) {
          const visibleText = document.body?.innerText || '';
          const handleMatches = visibleText.match(/@([a-zA-Z0-9._]{3,30})/g) || [];
          const ignored = new Set(['@instagram', '@google', '@gmail', '@maps', '@bing']);
          for (const raw of handleMatches) {
            const handle = raw.replace(/^@/, '').replace(/[.\s]+$/g, '');
            if (!handle || ignored.has(`@${handle.toLowerCase()}`)) continue;
            links.push(`https://www.instagram.com/${handle}/`);
          }
        }

        const validProfiles = [];
        for (const link of links) {
          let normalizedLink = link;
          try { normalizedLink = decodeURIComponent(link); } catch(e) {}
          try {
            const parsedLink = new URL(normalizedLink, location.href);
            const target = parsedLink.searchParams.get('url') || parsedLink.searchParams.get('q') || parsedLink.searchParams.get('u');
            if (target && target.includes('instagram.com')) normalizedLink = decodeURIComponent(target);
          } catch(e) {}
          const m = normalizedLink.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?/);
          if (m && m[1] && m[1] !== 'p' && m[1] !== 'reel' && m[1] !== 'explore' && !m[1].includes('?')) {
            const cleanUrl = `https://www.instagram.com/${m[1]}/`;
            if (!blist.includes(cleanUrl)) validProfiles.push(cleanUrl);
          }
        }
        const unique = [...new Set(validProfiles)];
        return unique.length > 0 ? unique.slice(0, 3) : null;
      },
      args: [blocklist]
    });

    const foundUrls = results && results[0] && results[0].result;
    if (foundUrls && foundUrls.length > 0) {
      return { success: true, candidates: foundUrls, urls: foundUrls, url: foundUrls[0], source: 'bing' };
    }
    return { success: false, error: "Nenhum link encontrado no Bing." };
  } catch (err) {
    console.error("Erro na busca alternativa de Instagram:", err);
    return { success: false, error: err.message };
  } finally {
    if (!keepTabOpenForHuman) {
      try {
        await removeTabWithRetry(tabId);
      } catch(e) {}
    }
  }
}


async function handleInstagramScrape(instagramUrl, options = {}) {
  console.log("Iniciando raspagem para:", instagramUrl);
  const collectImages = options.collectImages !== false && options.lightweight !== true;
  const maxHighlightImages = Number.isFinite(Number(options.highlightImageLimit))
    ? Math.max(0, Math.min(6, Number(options.highlightImageLimit)))
    : 3;
  const maxFeedImages = Number.isFinite(Number(options.feedImageLimit))
    ? Math.max(0, Math.min(12, Number(options.feedImageLimit)))
    : 6;
  // 1. Cria a aba (ativa para evitar o bloqueio de throttling do Chrome)
  const tab = await createTabWithRetry({ url: instagramUrl, active: true });
  const tabId = tab.id;
  
  try {
    // 2. Aguarda o carregamento completo da aba
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba do Instagram foi fechada."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 60) { // 30 segundos de timeout
              reject(new Error("Tempo limite esgotado esperando o perfil do Instagram carregar."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    // Executa a lógica de raspagem na página em um loop com tentativas (máx 6 segundos)
    // para lidar de forma robusta com computadores lentos ou carregamentos demorados do JS
    let scrapeData = null;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      // Pequeno intervalo entre tentativas
      await new Promise(r => setTimeout(r, 500));
      attempts++;
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: scrapePageLogic
        });
        
        if (results && results[0] && results[0].result) {
          const res = results[0].result;
          
          // Se for login obrigatório, interrompe imediatamente
          if (res.isLoginRequired) {
            scrapeData = res;
            break;
          }
          
          // Se encontrou a URL da foto de perfil, consideramos sucesso,
          // mas aguardamos alguns ciclos para permitir que os links da bio/modal carreguem.
          if (res.profilePicUrl && ((Array.isArray(res.linkCandidates) && res.linkCandidates.length > 0) || attempts >= 6)) {
            scrapeData = res;
            break;
          }
          
          // Caso contrário, guarda o último resultado para fallback
          scrapeData = res;
        }
      } catch (err) {
        console.warn(`Tentativa ${attempts} de execução de script falhou:`, err.message);
      }
    }
    
    if (!scrapeData) {
      throw new Error("Não foi possível ler os dados da aba do Instagram após várias tentativas.");
    }
    
    if (scrapeData.isLoginRequired) {
      // Abre a aba em foco para o usuário fazer login
      await updateTabWithRetry(tabId, { active: true });
      return {
        success: false,
        isLoginRequired: true,
        error: "Login do Instagram necessário. A aba foi aberta para você fazer login manualmente."
      };
    }
    
    if (!scrapeData.success) {
      throw new Error(scrapeData.error || "Erro desconhecido ao raspar o Instagram.");
    }

    if (!collectImages) {
      await removeTabWithRetry(tabId);
      return {
        success: true,
        followers: scrapeData.followers,
        bio: scrapeData.bio,
        logoDataUrl: null,
        rawLogoUrl: scrapeData.profilePicUrl,
        linkCandidates: scrapeData.linkCandidates || [],
        bioLinks: scrapeData.linkCandidates || [],
        highlightImages: [],
        feedImages: [],
        rawFeedImages: []
      };
    }
    
    // 4. Faz download da imagem e converte para base64
    let base64 = null;
    let contentType = 'image/jpeg';
    if (scrapeData.profilePicUrl) {
      try {
        console.log("Fazendo download da imagem:", scrapeData.profilePicUrl);
        const fetchRes = await fetch(scrapeData.profilePicUrl);
        if (fetchRes.ok) {
          const blob = await fetchRes.blob();
          contentType = blob.type || 'image/jpeg';
          base64 = await blobToBase64(blob);
          console.log("Download e conversão base64 bem-sucedidos!");
        } else {
          console.warn("Falha no download da imagem. Status HTTP:", fetchRes.status);
        }
      } catch (err) {
        console.error("Falha ao baixar imagem no service worker:", err);
      }
    }

    let base64Highlights = [];
    if (scrapeData.highlightImages && scrapeData.highlightImages.length > 0) {
      for (const imgUrl of scrapeData.highlightImages.slice(0, maxHighlightImages)) {
        try {
          const fetchRes = await fetch(imgUrl);
          if (fetchRes.ok) {
            const blob = await fetchRes.blob();
            const b64 = await blobToBase64(blob);
            base64Highlights.push(`data:${blob.type || 'image/jpeg'};base64,${b64}`);
          }
        } catch (e) {
          console.error("Erro ao baixar imagem de destaque:", e);
        }
      }
    }

    let base64Feed = [];
    if (scrapeData.feedImages && scrapeData.feedImages.length > 0) {
      for (const imgUrl of scrapeData.feedImages.slice(0, maxFeedImages)) {
        try {
          const fetchRes = await fetch(imgUrl);
          if (fetchRes.ok) {
            const blob = await fetchRes.blob();
            const b64 = await blobToBase64(blob);
            base64Feed.push(`data:${blob.type || 'image/jpeg'};base64,${b64}`);
          }
        } catch (e) {
          console.error("Erro ao baixar imagem do feed:", e);
        }
      }
    }
    
    // 5. Fecha a aba temporária (pois a raspagem deu certo)
    await removeTabWithRetry(tabId);
    
    return {
      success: true,
      followers: scrapeData.followers,
      bio: scrapeData.bio,
      logoDataUrl: base64 ? `data:${contentType};base64,${base64}` : null,
      rawLogoUrl: scrapeData.profilePicUrl,
      linkCandidates: scrapeData.linkCandidates || [],
      bioLinks: scrapeData.linkCandidates || [],
      highlightImages: base64Highlights,
      feedImages: base64Feed,
      rawFeedImages: scrapeData.feedImages || []
    };
    
  } catch (err) {
    console.error("Erro no fluxo do scraper:", err);
    // Tenta limpar a aba em caso de erro
    try {
      chrome.tabs.get(tabId, (currentTab) => {
        if (!chrome.runtime.lastError && currentTab) {
          removeTabWithRetry(tabId);
        }
      });
    } catch (_) {}
    
    return {
      success: false,
      error: err.message
    };
  }
}

// Converte Blob para Base64 em ambiente de Service Worker (onde não existe FileReader)
async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

// Esta função roda diretamente no contexto da página do Instagram
async function scrapePageLogic() {
  const isLogin = window.location.href.includes('accounts/login') || !!document.querySelector('input[name="username"]');
  if (isLogin) {
    return { success: false, isLoginRequired: true, error: "Login do Instagram necessário." };
  }
  
  // 1. Localiza a URL da imagem de perfil de forma robusta e inteligente
  let profilePicUrl = null;
  const allImgs = Array.from(document.querySelectorAll('img'));
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const username = pathParts[0] ? pathParts[0].toLowerCase() : '';

  // Passo A: Tenta localizar a imagem pelo alt contendo o username da conta (evitando destaques)
  if (username) {
    for (const img of allImgs) {
      const alt = (img.alt || '').toLowerCase();
      const src = img.src || '';
      
      const isProfileAlt = alt.includes('perfil') || alt.includes('profile') || alt.includes('avatar');
      const hasUsername = alt.includes(username);
      const isInsideHighlight = !!img.closest('a[href*="/stories/highlights/"]');
      
      if (isProfileAlt && hasUsername && !isInsideHighlight && src.startsWith('http')) {
        profilePicUrl = src;
        break;
      }
    }
  }

  // Passo B: Fallback seletor clássico restringindo a elementos do header
  if (!profilePicUrl) {
    const imgSelectors = [
      'header img[src*="cdninstagram"]',
      'header img[src*="fbcdn"]',
      'header img',
      'img[alt*="Foto de perfil"]:not(a[href*="/stories/"] img)',
      'img[alt*="Foto do perfil"]:not(a[href*="/stories/"] img)',
      'img[alt*="profile picture"]:not(a[href*="/stories/"] img)',
      'img[alt*="Foto del perfil"]:not(a[href*="/stories/"] img)',
      'img[src*="cdninstagram"]:not(a[href*="/stories/"] img)',
      'img[src*="fbcdn"]:not(a[href*="/stories/"] img)'
    ];
    
    for (const sel of imgSelectors) {
      const el = document.querySelector(sel);
      if (el && el.src && el.src.startsWith('http')) {
        profilePicUrl = el.src;
        break;
      }
    }
  }
  
  // Passo C: Fallback programático geral excluindo links de stories/highlights
  if (!profilePicUrl) {
    for (const img of allImgs) {
      const alt = (img.alt || '').toLowerCase();
      const src = img.src || '';
      const isInsideHighlight = !!img.closest('a[href*="/stories/"]');
      
      if ((alt.includes('perfil') || alt.includes('profile') || alt.includes('avatar')) && !isInsideHighlight) {
        if (src.startsWith('http')) {
          profilePicUrl = src;
          break;
        }
      }
    }
  }
  
  // 2. Extrai seguidores
  let followersCount = null;
  
  // Função auxiliar para interpretar os valores (ex: 10k -> 10000, 1,2mil -> 1200)
  function parseFollowersValue(numberStr, multiplierStr) {
    let clean = numberStr.trim();
    if (multiplierStr) {
      clean = clean.replace(',', '.');
      let val = parseFloat(clean);
      if (isNaN(val)) return null;
      
      const mult = multiplierStr.toLowerCase().trim();
      if (mult === 'k' || mult === 'mil') {
        val = val * 1000;
      } else if (mult === 'm' || mult === 'mi' || mult === 'milões' || mult === 'mili') {
        val = val * 1000000;
      }
      return Math.round(val);
    } else {
      if (clean.includes('.') && clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (clean.includes('.')) {
        const parts = clean.split('.');
        if (parts[parts.length - 1].length === 3) {
          clean = clean.replace(/\./g, '');
        } else {
          clean = clean.replace(/\./g, '.');
        }
      } else if (clean.includes(',')) {
        const parts = clean.split(',');
        if (parts[parts.length - 1].length === 3) {
          clean = clean.replace(/,/g, '');
        } else {
          clean = clean.replace(/,/g, '.');
        }
      }
      let val = parseFloat(clean);
      return isNaN(val) ? null : Math.round(val);
    }
  }
  
  // A. Tenta ler pela tag meta description
  const meta = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
  const metaContent = meta ? meta.getAttribute('content') : null;
  
  if (metaContent) {
    const regexPt = /([\d\.,]+)\s*(mil|mi|milões|m|k)?\s*seguidores/i;
    const regexEn = /([\d\.,]+)\s*(mil|mi|m|k)?\s*followers/i;
    const match = metaContent.match(regexPt) || metaContent.match(regexEn);
    if (match) {
      followersCount = parseFollowersValue(match[1], match[3] || match[2]);
    }
  }
  
  // B. Fallback: Tenta ler direto pelo texto do DOM
  if (followersCount === null) {
    const domSelectors = [
      'a[href*="/followers/"] span',
      'a[href*="/followers/"]',
      'a[href*="/followers"] span',
      'a[href*="/followers"]',
      'header li:nth-child(2) span',
      'header li:nth-child(2)'
    ];
    
    for (const sel of domSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent || el.innerText;
        if (text && (text.toLowerCase().includes('seguidor') || text.toLowerCase().includes('follower') || /\d/.test(text))) {
          const cleanText = text.replace(/seguidores|seguidor|followers|follower/gi, '').trim();
          const match = cleanText.match(/([\d\.,]+)\s*(mil|mi|m|k)?/i);
          if (match) {
            followersCount = parseFollowersValue(match[1], match[2]);
            if (followersCount !== null) break;
          }
        }
      }
    }
  }
  // C. Extrai a BIO da tag meta
  let bioText = metaContent || '';

  // C.1. Extrai links de cardápio/bio sem navegar para fora do Instagram.
  // Importante: isto só lê anchors e abre, no máximo, o modal interno de "Links".
  // Não clica em URLs externas, então não cria enxurrada de abas.
  const linkCandidates = [];
  const seenLinks = new Set();

  function normalizeInstagramOutgoingUrl(rawUrl) {
    try {
      const url = new URL(rawUrl, window.location.href);
      if (url.hostname === 'l.instagram.com' || url.hostname.endsWith('.l.instagram.com')) {
        const target = url.searchParams.get('u');
        if (target) return decodeURIComponent(target);
      }
      return url.href;
    } catch (_) {
      return '';
    }
  }

  function isUsefulExternalLink(rawUrl) {
    try {
      const url = new URL(rawUrl);
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      const pathAndSearch = `${url.pathname || ''} ${url.search || ''}`.toLowerCase();
      if (!/^https?:$/.test(url.protocol)) return false;
      if (
        host === 'instagram.com' || host.endsWith('.instagram.com') ||
        host === 'facebook.com' || host.endsWith('.facebook.com') ||
        host === 'threads.net' || host.endsWith('.threads.net') ||
        host === 'tiktok.com' || host.endsWith('.tiktok.com') ||
        host === 'youtube.com' || host.endsWith('.youtube.com') ||
        host === 'meta.ai' || host.endsWith('.meta.ai') ||
        host === 'meta.com' || host.endsWith('.meta.com')
      ) return false;
      if (/casino|poker|bonus|bono|bet\b|betting|aposta|apostas|slot|slots|gambling|holdem|reward\s*code|viagra|forex|crypto|binary|adult|escort|seo-spam/i.test(`${host} ${pathAndSearch}`)) return false;
      if (/\/(?:promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty|pagamento|payment|wallet|orders?|checkout|cart)(?:\/|$|\?)/i.test(pathAndSearch)) return false;
      if (/[?&](?:tab|origin)=[^&]*(?:cashback|promo|cupom|coupon|fidelidade|payment|pagamento)/i.test(url.search || '')) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  function scoreExternalLink(url, label) {
    const text = `${url || ''} ${label || ''}`.toLowerCase();
    let score = 0;
    if (/card[aá]pio|menu|pedido|pe[çc]a|delivery|loja|comprar|order/.test(text)) score += 45;
    if (/saipos|livemenu|ola\.click|olaclick|anota|ifood|menudino|deliverymuch|goomer|aiqfome|linklist|linktr\.ee|bio\.link|msha\.ke|beacons\.ai|lnk\.bio|taplink/.test(text)) score += 35;
    if (/jo[aã]o\s*pessoa|pessoa|patos|sousa|campina|recife|fortaleza|natal/.test(text)) score += 15;
    return score;
  }

  function collectExternalLinksFromDom(reason, root = document, sourcePriority = 0) {
    const anchors = Array.from(root.querySelectorAll('a[href]'));
    for (const anchor of anchors) {
      if (anchor.closest('footer, nav, [role="navigation"]')) continue;
      const rawHref = anchor.getAttribute('href') || anchor.href || '';
      const url = normalizeInstagramOutgoingUrl(rawHref);
      if (!url || !isUsefulExternalLink(url)) continue;

      const label =
        (anchor.innerText || anchor.textContent || anchor.getAttribute('aria-label') || anchor.title || '').trim().replace(/\s+/g, ' ') ||
        url;
      const key = url.replace(/#.*$/, '');
      if (seenLinks.has(key)) continue;
      seenLinks.add(key);
      linkCandidates.push({
        url,
        label,
        score: scoreExternalLink(url, label),
        reasons: [reason],
        source: reason,
        sourcePriority
      });
    }
  }

  function collectExternalLinksFromText(rawText, reason, sourcePriority = 0) {
    if (!rawText) return;
    const decodedText = String(rawText)
      .replace(/&amp;/g, '&')
      .replace(/\\u0026/g, '&')
      .replace(/\\\//g, '/')
      .replace(/%3A/gi, ':')
      .replace(/%2F/gi, '/');
    const matches = decodedText.match(/https?:\/\/[^"'<>\s)]+/gi) || [];
    for (const raw of matches) {
      const trimmed = raw.replace(/[\\),.;]+$/g, '');
      const url = normalizeInstagramOutgoingUrl(trimmed);
      if (!url || !isUsefulExternalLink(url)) continue;
      const key = url.replace(/#.*$/, '');
      if (seenLinks.has(key)) continue;
      seenLinks.add(key);
      linkCandidates.push({
        url,
        label: url,
        score: scoreExternalLink(url, url),
        reasons: [reason],
        source: reason,
        sourcePriority
      });
    }
  }

  const bioRoots = [
    document.querySelector('header'),
    document.querySelector('main'),
    document.querySelector('article')
  ].filter(Boolean);
  for (const root of bioRoots) collectExternalLinksFromDom('instagram_bio_dom', root, 80);
  collectExternalLinksFromText(metaContent || bioText || '', 'instagram_bio_text', 70);

  try {
    const clickableElements = Array.from(document.querySelectorAll('button, [role="button"], a, div, span'))
      .filter((el) => {
        const text = `${el.textContent || ''} ${el.getAttribute?.('aria-label') || ''}`.trim().toLowerCase();
        const rect = el.getBoundingClientRect?.();
        const visible = rect && rect.width > 0 && rect.height > 0;
        return visible && /links?|link na bio|ver links|bio/.test(text) && text.length <= 120;
      });
    const linkOpener = clickableElements[0];
    if (linkOpener) {
      linkOpener.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      await new Promise(r => setTimeout(r, 1200));
      const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], [aria-modal="true"]'));
      if (dialogs.length > 0) {
        for (const dialog of dialogs) collectExternalLinksFromDom('instagram_links_modal', dialog, 120);
      } else {
        collectExternalLinksFromDom('instagram_links_modal', document, 100);
      }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (linkErr) {
    console.warn('Falha ao coletar links da bio/modal:', linkErr);
  }

  // 3. Raspagem de Destaques (Highlights) do Instagram
  const highlightImages = [];
  try {
    let menuHighlight = null;
    const highlightLinks = Array.from(document.querySelectorAll('a[href*="/stories/highlights/"]'));
    menuHighlight = highlightLinks.find(link => {
      const text = link.textContent.trim().toLowerCase();
      return text.includes('cardapio') || text.includes('cardápio') || text.includes('menu') || text.includes('preço') || text.includes('preco') || text.includes('valores') || text.includes('prato');
    });

    if (!menuHighlight) {
      const keywords = ['cardapio', 'cardápio', 'menu', 'preço', 'preco', 'valores', 'prato'];
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        if (el.children.length === 0) {
          const text = el.textContent.trim().toLowerCase();
          if (keywords.some(kw => text.includes(kw))) {
            const link = el.closest('a[href*="/stories/highlights/"]');
            if (link) {
              menuHighlight = link;
              break;
            }
          }
        }
      }
    }

    if (menuHighlight) {
      menuHighlight.click();
      
      const getActiveStoryImg = () => {
        const section = document.querySelector('section');
        if (section) {
          const imgs = Array.from(section.querySelectorAll('img'));
          for (const img of imgs) {
            const rect = img.getBoundingClientRect();
            const isAvatar = img.closest('header') || rect.width < 100 || rect.height < 100;
            if (!isAvatar && img.src && img.src.startsWith('http')) {
              return img.src;
            }
          }
          const img = section.querySelector('img[decoding="sync"]') || section.querySelector('img');
          if (img && img.src && img.src.startsWith('http')) return img.src;
        }
        return null;
      };

      for (let slide = 0; slide < 8; slide++) {
        // Aguarda carregar o slide
        await new Promise(r => setTimeout(r, 2000));
        
        if (!document.querySelector('section')) {
          break;
        }
        
        const imgUrl = getActiveStoryImg();
        if (imgUrl && !highlightImages.includes(imgUrl)) {
          highlightImages.push(imgUrl);
        }
        
        // Clica para ir ao próximo slide
        const nextBtn = document.querySelector('button[aria-label="Avançar"], button[aria-label="Next"], .coreSpriteRightChevron');
        if (nextBtn) {
          nextBtn.click();
        } else {
          const sec = document.querySelector('section');
          if (sec) {
            const rect = sec.getBoundingClientRect();
            const clickX = rect.left + rect.width * 0.75;
            const clickY = rect.top + rect.height * 0.5;
            const evt = new MouseEvent('click', { clientX: clickX, clientY: clickY, bubbles: true });
            sec.dispatchEvent(evt);
          } else {
            break;
          }
        }
      }
    }
  } catch (highlightErr) {
    console.error("Erro ao raspar destaques:", highlightErr);
  }

  // 4. Raspagem de até 12 imagens do feed do Instagram
  const feedImages = [];
  try {
    const isInvalidImage = (img) => {
      if (!img.src || !img.src.startsWith('http')) return true;
      if (profilePicUrl && img.src === profilePicUrl) return true;
      
      // Filter out small icons < 150px
      const rect = img.getBoundingClientRect ? img.getBoundingClientRect() : null;
      const width = img.naturalWidth || img.width || (rect ? rect.width : 0);
      const height = img.naturalHeight || img.height || (rect ? rect.height : 0);
      
      if ((width > 0 && width < 150) || (height > 0 && height < 150)) {
        return true;
      }
      return false;
    };

    const feedImgs = Array.from(document.querySelectorAll('a[href*="/p/"] img, a[href*="/reel/"] img'));
    for (const img of feedImgs) {
      if (!isInvalidImage(img) && !feedImages.includes(img.src)) {
        feedImages.push(img.src);
        if (feedImages.length >= 12) break;
      }
    }

    if (feedImages.length < 12) {
      const articleImgs = Array.from(document.querySelectorAll('article img'));
      for (const img of articleImgs) {
        if (!isInvalidImage(img) && !feedImages.includes(img.src)) {
          feedImages.push(img.src);
          if (feedImages.length >= 12) break;
        }
      }
    }
  } catch (feedErr) {
    console.error("Erro ao raspar feed:", feedErr);
  }
  
  return {
    success: true,
    profilePicUrl: profilePicUrl,
    followers: followersCount,
    bio: bioText,
    linkCandidates: linkCandidates.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20),
    highlightImages: highlightImages,
    feedImages: feedImages
  };
}

async function handleInstagramPostScrape(url) {
  console.log("Iniciando raspagem de post para:", url);
  // 1. Cria a aba (ativa para evitar throttling do Chrome)
  const tab = await createTabWithRetry({ url: url, active: false });
  const tabId = tab.id;
  
  try {
    // 2. Aguarda o carregamento completo da aba
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba do Instagram foi fechada."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 60) { // 30 segundos de timeout
              reject(new Error("Tempo limite esgotado esperando o post do Instagram carregar."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    // Executa a lógica de raspagem na página em um loop com tentativas (máx 6 segundos)
    // para lidar de forma robusta com computadores lentos ou carregamentos demorados do JS
    let scrapeData = null;
    let attempts = 0;
    const maxAttempts = 12;
    
    while (attempts < maxAttempts) {
      // Pequeno intervalo entre tentativas
      await new Promise(r => setTimeout(r, 500));
      attempts++;
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: scrapePostPageLogic
        });
        
        if (results && results[0] && results[0].result) {
          const res = results[0].result;
          
          // Se for login obrigatório, interrompe imediatamente
          if (res.isLoginRequired) {
            scrapeData = res;
            break;
          }
          
          // Se encontrou a URL da imagem do post, consideramos sucesso e interrompemos
          if (res.imageUrl) {
            scrapeData = res;
            break;
          }
          
          // Caso contrário, guarda o último resultado para fallback
          scrapeData = res;
        }
      } catch (err) {
        console.warn(`Tentativa ${attempts} de execução de script de post falhou:`, err.message);
      }
    }
    
    if (!scrapeData) {
      throw new Error("Não foi possível ler os dados da aba do post do Instagram após várias tentativas.");
    }
    
    if (scrapeData.isLoginRequired) {
      // Abre a aba em foco para o usuário fazer login
      await updateTabWithRetry(tabId, { active: true });
      return {
        success: false,
        isLoginRequired: true,
        error: "Login do Instagram necessário. A aba foi aberta para você fazer login manualmente."
      };
    }
    
    if (!scrapeData.success) {
      throw new Error(scrapeData.error || "Erro desconhecido ao raspar o post do Instagram.");
    }
    
    // 4. Faz download da imagem e converte para base64
    let base64 = null;
    let contentType = 'image/jpeg';
    if (scrapeData.imageUrl) {
      try {
        console.log("Fazendo download da imagem do post:", scrapeData.imageUrl);
        const fetchRes = await fetch(scrapeData.imageUrl);
        if (fetchRes.ok) {
          const blob = await fetchRes.blob();
          contentType = blob.type || 'image/jpeg';
          base64 = await blobToBase64(blob);
          console.log("Download e conversão base64 do post bem-sucedidos!");
        } else {
          console.warn("Falha no download da imagem do post. Status HTTP:", fetchRes.status);
        }
      } catch (err) {
        console.error("Falha ao baixar imagem do post no service worker:", err);
      }
    }
    
    // 5. Fecha a aba temporária (pois a raspagem deu certo)
    await removeTabWithRetry(tabId);
    
    if (!base64) {
      throw new Error("Não foi possível fazer download da imagem extraída do post.");
    }
    
    return {
      success: true,
      logoDataUrl: `data:${contentType};base64,${base64}`
    };
    
  } catch (err) {
    console.error("Erro no fluxo do scraper de post:", err);
    // Tenta limpar a aba em caso de erro
    try {
      chrome.tabs.get(tabId, (currentTab) => {
        if (!chrome.runtime.lastError && currentTab) {
          removeTabWithRetry(tabId);
        }
      });
    } catch (_) {}
    
    return {
      success: false,
      error: err.message
    };
  }
}

function scrapePostPageLogic() {
  const isLogin = window.location.href.includes('accounts/login') || !!document.querySelector('input[name="username"]');
  if (isLogin) {
    return { success: false, isLoginRequired: true, error: "Login do Instagram necessário." };
  }
  
  // 1. Tenta pelas tags meta (OpenGraph)
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                  document.querySelector('meta[property="twitter:image"]')?.getAttribute('content');
  if (ogImage && ogImage.startsWith('http')) {
    return { success: true, imageUrl: ogImage };
  }
  
  // 2. Fallback para as tags img no DOM
  // Busca imagens que pareçam ser do post
  const imgs = Array.from(document.querySelectorAll('img'));
  const candidates = [];
  
  for (const img of imgs) {
    const src = img.src;
    if (!src || !src.startsWith('http')) continue;
    
    // Ignora fotos de perfil ou ícones comuns do Instagram
    const alt = (img.alt || '').toLowerCase();
    if (alt.includes('foto do perfil') || alt.includes('profile picture') || alt.includes('avatar')) {
      continue;
    }
    
    // Deve ser hospedado nos CDNs do Instagram/Facebook
    if (!src.includes('cdninstagram.com') && !src.includes('fbcdn.net')) {
      continue;
    }
    
    // Verifica dimensões
    const rect = img.getBoundingClientRect();
    const width = rect.width || img.naturalWidth || 0;
    const height = rect.height || img.naturalHeight || 0;
    
    // Se a imagem for muito pequena (ex: ícone de curtir ou foto de comentário), ignora
    if (width > 0 && width < 150) continue;
    
    // Prioriza imagens dentro de tags <article>
    const isInsideArticle = !!img.closest('article');
    
    candidates.push({
      src,
      isInsideArticle,
      area: width * height,
      width,
      height
    });
  }
  
  if (candidates.length > 0) {
    // Ordena de forma a priorizar imagens dentro de article e depois por área (tamanho)
    candidates.sort((a, b) => {
      if (a.isInsideArticle && !b.isInsideArticle) return -1;
      if (!a.isInsideArticle && b.isInsideArticle) return 1;
      return b.area - a.area;
    });
    
    return { success: true, imageUrl: candidates[0].src };
  }
  
  return { success: false, error: "Nenhuma imagem do post encontrada no DOM." };
}

async function handleMenuScrape(url, sender) {
  console.log("Iniciando raspagem de cardápio para:", url);
  
  const shouldUseNativePlatformAdapterFirst = (value) => {
    try {
      const parsed = new URL(value);
      const hostPath = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
      return /anota\.ai|saipos\.com|livemenu\.app|cardapioweb|cardapio-web|ola\.click|goomer|menudino|aiqfome/.test(hostPath);
    } catch (_) {
      return false;
    }
  };

  // Caminho unificado: se a plataforma tem adaptador profundo, usa ele antes do
  // scraper legado. Isso evita o caso Anota AI em que a vitrine tem links
  // /product/... e os adicionais só aparecem ao abrir item por item.
  if (
    shouldUseNativePlatformAdapterFirst(url)
    && globalThis.FilterFoodPlatformAdapters
    && typeof globalThis.FilterFoodPlatformAdapters.extract === 'function'
  ) {
    try {
      console.log("[Extension] Usando adaptador nativo/profundo antes do scraper legado:", url);
      const platformResult = await globalThis.FilterFoodPlatformAdapters.extract(url);
      const itemCount = Array.isArray(platformResult?.categories)
        ? platformResult.categories.reduce((sum, category) => sum + ((category.items || []).length || 0), 0)
        : 0;
      const optionCount = Array.isArray(platformResult?.categories)
        ? platformResult.categories.reduce((sum, category) => {
            return sum + (category.items || []).reduce((inner, item) => {
              const flatOptions = Array.isArray(item.options) ? item.options.length : 0;
              const groupedOptions = Array.isArray(item.option_groups)
                ? item.option_groups.reduce((groupSum, group) => groupSum + ((group.items || []).length || 0), 0)
                : 0;
              return inner + Math.max(flatOptions, groupedOptions);
            }, 0);
          }, 0)
        : 0;

      if (platformResult?.success && itemCount > 0) {
        console.log(`[Extension] Adaptador nativo retornou ${itemCount} item(ns) e ${optionCount} opção(ões).`);
        return {
          success: true,
          parsedMenu: platformResult.categories,
          platform: platformResult.platform || 'native_platform_adapter',
          extractionLevel: platformResult.extractionLevel ?? 0,
          confidence: platformResult.confidence ?? 0.95,
          sourceUrl: platformResult.sourceUrl || url,
          finalUrl: platformResult.finalUrl || platformResult.sourceUrl || url,
          metrics: {
            ...(platformResult.metrics || {}),
            itemCount,
            optionCount
          },
          rawText: platformResult.rawText || ''
        };
      }

      if (
        platformResult?.requiresHuman
        || platformResult?.metrics?.optionExtractionMissed
        || Number(platformResult?.metrics?.detailGroupHintMissCount || 0) > 0
        || /option_group|adicionais|escolhas|detalhes do anota/i.test(String(platformResult?.error || ''))
      ) {
        return {
          success: false,
          requiresHuman: Boolean(platformResult.requiresHuman),
          error: platformResult.error || 'Adaptador nativo não conseguiu confirmar detalhes/opções do cardápio.',
          platform: platformResult.platform || 'native_platform_adapter',
          metrics: platformResult.metrics || null,
          rawText: platformResult.rawText || ''
        };
      }

      console.warn("[Extension] Adaptador nativo não confirmou cardápio; seguindo para scraper legado:", platformResult?.error || platformResult);
    } catch (adapterErr) {
      console.warn("[Extension] Adaptador nativo falhou; seguindo para scraper legado:", adapterErr?.message || adapterErr);
    }
  }

  const originalTabId = sender && sender.tab ? sender.tab.id : null;
  
  // 1. Cria a aba para carregar o cardápio
  const tab = await createTabWithRetry({ url: url, active: false });
  const tabId = tab.id;
  

  
  try {
    // 2. Aguarda o carregamento completo da aba usando listeners (muito mais estável)
    await new Promise((resolve, reject) => {
      // Verifica o status inicial
      chrome.tabs.get(tabId, (currentTab) => {
        if (chrome.runtime.lastError || !currentTab) {
          reject(new Error("A aba do cardápio foi fechada ou não pôde ser lida."));
          return;
        }
        if (currentTab.status === 'complete') {
          resolve();
          return;
        }
        
        // Configura o listener de atualização
        const listener = (changeTabId, changeInfo) => {
          if (changeTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        
        // Timeout de segurança de 15 segundos para prosseguir mesmo se travar o carregamento de imagens/assets lentos
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(); // Resolve para tentar raspar o que já carregou
        }, 15000);
      });
    });

    // Aguarda a renderização dos pratos na página (Vite/React/Vue mount)
    console.log("[Extension] Aguardando renderização do cardápio...");
    await waitForMenuToLoad(tabId);

    // Verificação de Anota AI para extração estruturada direta pela API
    const isAnotaAi = await detectAnotaAiInTab(tabId);
    if (isAnotaAi) {
      console.log("[Extension] Anota AI detectado! Tentando extrair diretamente da API...");
      const slug = await getSlugFromTab(tabId);
      if (slug) {
        try {
          const apiRes = await fetch(`https://api.anota.ai/v1/menu/merchant?slug=${slug}`);
          if (apiRes.ok) {
            const json = await apiRes.json();
            const parsedMenu = parseAnotaAiMenu(json);
            if (parsedMenu && parsedMenu.length > 0) {
              console.log("[Extension] Sucesso ao extrair cardápio da API Anota AI!");
              await removeTabWithRetry(tabId);
              return {
                success: true,
                isAnotaAi: true,
                parsedMenu: parsedMenu
              };
            }
          } else {
            console.warn("[Extension] Falha ao chamar API do Anota AI, status:", apiRes.status);
          }
        } catch (apiErr) {
          console.error("[Extension] Erro ao consumir API do Anota AI:", apiErr);
        }
      }
    }

    // Verificação de Cardápio Web para extração estruturada direta pela API
    const isCardapioWeb = await detectCardapioWebInTab(tabId);
    if (isCardapioWeb) {
      console.log("[Extension] Cardápio Web detectado! Tentando extrair diretamente da API...");
      const details = await getCardapioWebDetailsFromTab(tabId);
      if (details && details.companySlug && details.companyId) {
        try {
          const sessionid = "session_" + Math.random().toString(36).substring(2, 11);
          const apiRes = await fetch(
            `https://integracao.cardapioweb.com/api/menu/company/categories?only_available_for=delivery&origin=catalogo`,
            {
              headers: {
                'company': details.companySlug,
                'company-id': String(details.companyId),
                'sessionid': sessionid
              }
            }
          );
          if (apiRes.ok) {
            const json = await apiRes.json();
            const parsedMenu = parseCardapioWebMenu(json);
            if (parsedMenu && parsedMenu.length > 0) {
              console.log("[Extension] Sucesso ao extrair cardápio da API Cardápio Web!");
              await removeTabWithRetry(tabId);
              return {
                success: true,
                isCardapioWeb: true,
                parsedMenu: parsedMenu
              };
            }
          } else {
            console.warn("[Extension] Falha ao chamar API do Cardápio Web, status:", apiRes.status);
          }
        } catch (apiErr) {
          console.error("[Extension] Erro ao consumir API do Cardápio Web:", apiErr);
        }
      }
    }

    // 3. Executa a lógica de scroll e expansão na página do cardápio
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: expandAndLoadAllContentInPage
      });
    } catch (err) {
      console.warn("Falha ao expandir conteúdo do cardápio:", err.message);
    }

    // Espera mais 1.5s após a expansão para garantir rendering final e imagens
    await new Promise(r => setTimeout(r, 1500));

    // 4. Extrai o HTML limpo/XML para a IA
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: getCleanedHtmlForAIInPage
    });

    if (!results || !results[0] || !results[0].result) {
      throw new Error("Não foi possível extrair o conteúdo do cardápio.");
    }

    const xmlContent = results[0].result;

    // 5. Fecha a aba temporária
    await removeTabWithRetry(tabId);

    return {
      success: true,
      xmlContent: xmlContent
    };

  } catch (err) {
    console.error("Erro no fluxo do scraper de cardápio:", err);
    // Tenta limpar a aba em caso de erro
    try {
      chrome.tabs.get(tabId, (currentTab) => {
        if (!chrome.runtime.lastError && currentTab) {
          removeTabWithRetry(tabId);
        }
      });
    } catch (_) {}
    
    return {
      success: false,
      error: err.message
    };
  }
}

async function expandAndLoadAllContentInPage() {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  // 1. Rola a página progressivamente
  await new Promise((resolve) => {
    let totalHeight = 0;
    const distance = 400;
    const timer = setInterval(() => {
      const scrollHeight = document.body.scrollHeight;
      window.scrollBy(0, distance);
      totalHeight += distance;
      
      if (totalHeight >= scrollHeight || totalHeight > 10000) {
        clearInterval(timer);
        resolve();
      }
    }, 200);
  });
  await delay(800);
  
  // 2. Clica em botões de "Carregar mais"
  let clickedMore = true;
  let clickLimit = 5;
  while (clickedMore && clickLimit > 0) {
    clickedMore = (() => {
      const buttons = Array.from(document.querySelectorAll('button, a, span, div[role="button"]'));
      const loadMoreBtn = buttons.find(b => {
        const text = b.textContent.trim().toLowerCase();
        return (
          (text.includes('carregar') && text.includes('mais')) ||
          (text.includes('ver') && text.includes('mais')) ||
          (text.includes('mostrar') && text.includes('mais')) ||
          (text.includes('load') && text.includes('more')) ||
          (text.includes('show') && text.includes('more')) ||
          text === 'ver mais' ||
          text === 'carregar mais' ||
          text === 'mostrar mais'
        );
      });
      
      if (loadMoreBtn && typeof loadMoreBtn.click === 'function') {
        loadMoreBtn.click();
        return true;
      }
      return false;
    })();
    
    if (clickedMore) {
      await delay(1500);
      clickLimit--;
      window.scrollTo(0, document.body.scrollHeight);
    }
  }

  // 3. Expande acordeões/abas colapsadas
  const accordionCount = (() => {
    document.querySelectorAll('[data-scraper-accordion]').forEach(el => {
      el.removeAttribute('data-scraper-accordion');
    });

    const headers = Array.from(document.querySelectorAll([
      '[class*="header"]', '[class*="heading"]', '[class*="toggle"]', '[class*="trigger"]',
      '.panel-title', '[id*="heading"]', '[id*="toggle"]', '[aria-expanded]',
      'h3', 'h4', 'h2', '.category-card'
    ].join(', ')));
    
    let count = 0;
    headers.forEach(header => {
      if (header.closest('footer') || header.closest('header') || header.closest('nav')) return;

      const ariaExpanded = header.getAttribute('aria-expanded');
      let isCollapsed = false;
      
      if (ariaExpanded === 'false') {
        isCollapsed = true;
      } else if (ariaExpanded === 'true') {
        return;
      } else {
        const parent = header.parentElement;
        if (!parent) return;
        
        const siblings = Array.from(parent.children);
        const headerIdx = siblings.indexOf(header);
        const nextSibling = headerIdx !== -1 ? siblings[headerIdx + 1] : null;
        
        if (nextSibling) {
          const style = window.getComputedStyle(nextSibling);
          const isHidden = style.display === 'none' || style.visibility === 'hidden' || parseInt(style.height || '0') === 0;
          const classNameStr = String(nextSibling.className || '');
          const hasCollapseClass = classNameStr.includes('collapse') || classNameStr.includes('content') || classNameStr.includes('body');
            
          if (isHidden || (hasCollapseClass && nextSibling.clientHeight === 0)) {
            isCollapsed = true;
          }
        }
      }
      
      if (isCollapsed) {
        const target = header.querySelector('button, a, span') || header;
        if (typeof target.click === 'function') {
          target.setAttribute('data-scraper-accordion', String(count));
          count++;
        }
      }
    });
    
    return count;
  })();
  
  if (accordionCount > 0) {
    for (let i = 0; i < accordionCount; i++) {
      try {
        const el = document.querySelector(`[data-scraper-accordion="${i}"]`);
        if (el) {
          el.click();
        }
        await delay(500);
      } catch (clickErr) {
        console.warn("Erro ao clicar no acordeão:", clickErr);
      }
    }
    
    // Rola novamente
    window.scrollTo(0, 0);
    await delay(300);
    window.scrollTo(0, document.body.scrollHeight / 2);
    await delay(300);
    window.scrollTo(0, document.body.scrollHeight);
    await delay(500);
  }

  // 4. Clika em itens individuais (produtos) para abrir modais de opções (ex: Saipos) e extrair os adicionais
  try {
    let clickables = Array.from(document.querySelectorAll('article, .product-card, [class*="product-item"], [class*="ItemCard"], li, .item-content, [class*="item-content"], [class*="ItemContent"], .item-title, [class*="item-title"], [class*="ItemTitle"], [data-qa*="item"], [data-qa*="product"], [class*="product-card"], [class*="ProductCard"], [class*="menu-item"], [class*="MenuItem"], [class*="card-item"], [class*="CardItem"], .item-container, [class*="item-container"], [class*="itemContainer"], .item-wrapper, [class*="item-wrapper"], [class*="itemWrapper"], [class*="product_card"], [class*="item_card"], [class*="card_item"], [class*="menu_item"], [data-testid*="product"], [data-testid*="item"], [data-qa*="card"], [data-testid*="card"], [data-qa="item-desc"]')).filter(el => {
      // Ignora elementos que são claramente links externos ou de navegação
      if (el.tagName === 'A' && el.href && !el.href.includes('#') && !el.href.startsWith('javascript')) return false;
      const a = el.querySelector('a');
      if (a && a.href && !a.href.includes('#') && !a.href.startsWith('javascript')) return false;
      
      // Somente elementos com tamanho razoável (ignora mini-botões)
      // Permite elementos menores que 40px se forem seletores Saipos/plataforma específicos
      const isSpecificSaiposElement = el.matches && el.matches('.item-content, [class*="item-content"], .item-title, [data-qa="item-desc"]');
      if (!isSpecificSaiposElement && el.clientHeight < 40) return false;
      
      // Evita o cabeçalho/menu principal
      if (el.closest('header') || el.closest('nav') || el.closest('footer')) return false;
      
      // Evita checkout e carrinho de compras
      if (el.closest('[class*="cart"]') || el.closest('[class*="checkout"]') || el.closest('[id*="cart"]') || el.closest('[id*="checkout"]')) return false;
      
      // Evita elementos que já estão dentro de modais de diálogo
      if (el.closest('[role="dialog"]') || el.closest('.modal') || el.closest('.dialog') || el.closest('[class*="modal"]') || el.closest('[class*="Dialog"]')) return false;
      
      return true;
    });

    // Remove contêineres que possuem muitos filhos candidatos (evita clicar no grid de produtos como se fosse um único produto)
    clickables = clickables.filter((el, idx) => {
      const descendants = clickables.filter((other, otherIdx) => otherIdx !== idx && el.contains(other));
      // Se contiver mais do que 2 outros candidatos, consideramos que é um container de lista de produtos, não o produto em si
      if (descendants.length > 2) return false;
      return true;
    });

    // Se o elemento pai possui um filho que é um seletor Saipos específico, removemos o pai da lista para priorizar o clique no filho específico
    clickables = clickables.filter((el, idx) => {
      const hasSpecificSaiposDescendant = clickables.some((other, otherIdx) => {
        if (otherIdx === idx) return false;
        const isSpecific = other.matches && other.matches('.item-content, [class*="item-content"], .item-title, [data-qa="item-desc"]');
        return isSpecific && el.contains(other);
      });
      return !hasSpecificSaiposDescendant;
    });

    // Remove elementos aninhados redundantes (se A contém B, clica apenas no card A e não nos seus filhos individuais)
    clickables = clickables.filter((el, idx) => {
      const hasParentInList = clickables.some((other, otherIdx) => otherIdx !== idx && other.contains(el));
      return !hasParentInList;
    });

    let clickedCount = 0;
    for (let i = 0; i < clickables.length; i++) {
      if (clickedCount >= 60) break; // Limite para não travar a extensão
      
      const el = clickables[i];
      
      // Encontra o contêiner original do item para verificar se já possui extração e para injeção posterior
      const container = el.closest('article, .product-card, [class*="product-item"], [class*="ItemCard"], li, [class*="product-card"], [class*="ProductCard"], [class*="menu-item"], [class*="MenuItem"], [class*="card-item"], [class*="CardItem"], .item-container, [class*="item-container"], [class*="itemContainer"], .item-wrapper, [class*="item-wrapper"], [class*="itemWrapper"], .item-content, [class*="item-content"], .item-title, [data-qa="item-desc"]') || el;
      
      // Evita duplo clique se o mesmo contêiner original já foi enriquecido
      if (container.querySelector('.scraper-extracted-modal-text')) {
        continue;
      }
      
      const btn = el.querySelector('button') || el;
      
      try { 
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        btn.click(); 
      } catch(e) {}
      
      const delayPromise = new Promise(resolve => setTimeout(resolve, 500));
      await delayPromise; // aguarda modal ou expansão abrir
      
      // Procura por modal visível
      const modals = Array.from(document.querySelectorAll('[role="dialog"], .modal, .dialog, [class*="modal"], [class*="Dialog"], [class*="Drawer"]')).filter(m => m.offsetParent !== null);
      
      if (modals.length > 0) {
        const modal = modals[modals.length - 1]; // Pega o modal mais no topo
        const modalText = modal.innerText || '';
        
        // Injeta o texto do modal dentro do contêiner original do item (escondido) para ser capturado depois
        if (modalText && modalText.length > 20) {
          const hiddenDiv = document.createElement('div');
          hiddenDiv.style.display = 'none';
          hiddenDiv.className = 'scraper-extracted-modal-text';
          hiddenDiv.innerText = '\\n[OPÇÕES DA IA: ' + modalText.replace(/\\n/g, ' ') + ']\\n';
          container.appendChild(hiddenDiv);
        }
        
        // Fecha o modal
        const closeBtn = modal.querySelector('button[aria-label*="close"], button[aria-label*="Fechar"], .close, [class*="close"], [class*="CloseButton"]');
        if (closeBtn) {
          try { closeBtn.click(); } catch(e) {}
        } else {
          // Tenta ESCAPE
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
          document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', keyCode: 27, bubbles: true }));
          
          // Fallback brutal: clica fora do modal
          const overlay = document.querySelector('.overlay, [class*="overlay"], [class*="backdrop"]');
          if (overlay) try { overlay.click(); } catch(e) {}
        }
        clickedCount++;
        const closePromise = new Promise(resolve => setTimeout(resolve, 300));
        await closePromise; // Aguarda fechar
      }
    }
  } catch(e) {
    console.warn("Erro ao tentar extrair modais de produtos:", e);
  }
}

function getCleanedHtmlForAIInPage() {
  function getAbsoluteUrl(url) {
    if (!url) return '';
    try {
      return new URL(url, window.location.href).href;
    } catch (e) {
      return url;
    }
  }
  
  const imgs = document.querySelectorAll('img');
  imgs.forEach(img => {
    const lazyAttrs = ['data-src', 'data-lazy-src', 'data-lazy', 'lazy-src', 'data-original', 'data-srcset'];
    for (const attrName of lazyAttrs) {
      const val = img.getAttribute(attrName);
      if (val && val.trim()) {
        img.setAttribute('src', getAbsoluteUrl(val.trim()));
        break;
      }
    }
    const currentSrc = img.getAttribute('src');
    if (currentSrc) {
      img.setAttribute('src', getAbsoluteUrl(currentSrc));
    }
  });

  const priceRegex = /(?:R\$\s*)?\d+[\.,]\d{2}/i;
  const allElements = Array.from(document.querySelectorAll('*'));
  
  const candidates = [];
  allElements.forEach(el => {
    const tagName = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'header', 'footer', 'nav'].includes(tagName)) return;
    
    const text = el.textContent || '';
    if (!priceRegex.test(text)) return;
    
    let isItemPattern = false;
    const className = el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '';
    
    if (tagName === 'li' || tagName === 'article') {
      isItemPattern = true;
    } else if (
      className.includes('product') ||
      className.includes('item') ||
      className.includes('card') ||
      className.includes('dish') ||
      className.includes('prato') ||
      className.includes('menu-') ||
      className.includes('opcao') ||
      className.includes('prato-') ||
      className.includes('col-') ||
      className.includes('row')
    ) {
      isItemPattern = true;
    }
    
    if (isItemPattern) {
      candidates.push(el);
    }
  });
  
  const allPriceEls = [];
  allElements.forEach(el => {
    const tagName = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'header', 'footer', 'nav'].includes(tagName)) return;
    
    let hasDirectPrice = false;
    for (let node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && priceRegex.test(node.textContent)) {
        hasDirectPrice = true;
        break;
      }
    }
    if (hasDirectPrice) {
      allPriceEls.push(el);
    }
  });
  
  allPriceEls.forEach(priceEl => {
    const insideCandidate = candidates.some(c => c.contains(priceEl));
    if (!insideCandidate) {
      let current = priceEl;
      for (let i = 0; i < 3; i++) {
        if (!current.parentElement || ['BODY', 'HTML'].includes(current.parentElement.tagName)) {
          break;
        }
        current = current.parentElement;
      }
      if (!candidates.includes(current)) {
        candidates.push(current);
      }
    }
  });
  
  let finalContainers = [];
  candidates.forEach(c => {
    const leafDescendants = candidates.filter(other => other !== c && c.contains(other) && !candidates.some(third => third !== other && other.contains(third)));
    if (leafDescendants.length > 1) {
    } else {
      finalContainers.push(c);
    }
  });
  
  finalContainers = finalContainers.filter(c => {
    const isDescendantOfAnother = finalContainers.some(other => other !== c && other.contains(c));
    return !isDescendantOfAnother;
  });
  
  const categoryElements = [];
  allElements.forEach(el => {
    const tagName = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'header', 'footer', 'nav'].includes(tagName)) return;
    
    const text = (el.textContent || '').trim();
    if (text.length < 2 || text.length > 80) return;
    if (priceRegex.test(text)) return;
    
    const insideItem = finalContainers.some(c => c.contains(el));
    if (insideItem) return;
    
    let isCategory = false;
    const className = el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '';
    
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      isCategory = true;
    } else if (
      className.includes('category-title') ||
      className.includes('category-name') ||
      className.includes('titulo-categoria') ||
      className.includes('categoria-titulo') ||
      className.includes('menu-category-title') ||
      className.includes('menu-section-title') ||
      className.includes('category-header')
    ) {
      isCategory = true;
    }
    
    if (isCategory) {
      categoryElements.push(el);
    }
  });
  
  const allNodes = [...finalContainers, ...categoryElements];
  allNodes.sort((a, b) => {
    if (a === b) return 0;
    const position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });
  
  let xml = '<menu>\n';
  allNodes.forEach(node => {
    if (categoryElements.includes(node)) {
      const catName = node.textContent.replace(/\s+/g, ' ').trim();
      xml += `  <category name="${catName}" />\n`;
    } else {
      let imgUrl = '';
      const imgEl = node.querySelector('img');
      if (imgEl) {
        const lazyAttrs = ['src', 'data-src', 'data-lazy-src', 'data-lazy', 'lazy-src', 'data-original', 'data-srcset'];
        for (const attr of lazyAttrs) {
          const val = imgEl.getAttribute(attr);
          if (val && val.trim() && (val.startsWith('http') || val.startsWith('/') || val.startsWith('.'))) {
            imgUrl = getAbsoluteUrl(val.trim());
            break;
          }
        }
      }
      
      // Fallback para background-image se não encontrou img ou o src do img está vazio
      if (!imgUrl) {
        const bgEls = [node, ...Array.from(node.querySelectorAll('*'))];
        for (const el of bgEls) {
          const style = el.getAttribute('style') || '';
          if (style.includes('background-image')) {
            const match = style.match(/url\(['"]?(https?:\/\/[^'"]+)['"]?\)/i) || style.match(/url\(['"]?([^'"]+)['"]?\)/i);
            if (match && match[1]) {
              imgUrl = getAbsoluteUrl(match[1]);
              break;
            }
          }
          try {
            const compStyle = window.getComputedStyle(el);
            const bgImg = compStyle.backgroundImage;
            if (bgImg && bgImg !== 'none') {
              const match = bgImg.match(/url\(['"]?(https?:\/\/[^'"]+)['"]?\)/i) || bgImg.match(/url\(['"]?([^'"]+)['"]?\)/i);
              if (match && match[1]) {
                imgUrl = getAbsoluteUrl(match[1]);
                break;
              }
            }
          } catch (_) {}
        }
      }
      
      const itemText = node.textContent.replace(/\s+/g, ' ').trim();
      xml += `  <item>\n`;
      xml += `    <text>${itemText}</text>\n`;
      if (imgUrl) {
        xml += `    <image>${imgUrl}</image>\n`;
      }
      xml += `  </item>\n`;
    }
  });
  xml += '</menu>';
  
  return xml;
}

// Funções auxiliares para detecção e raspagem do Anota AI
async function waitForMenuToLoad(tabId) {
  const maxAttempts = 30; // 15 segundos max (500ms * 30)
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          const hasPrice = document.body.textContent.includes('R$') || document.body.textContent.includes('$');
          const hasCards = document.querySelectorAll('button, a, div[class*="item"], div[class*="card"], div[class*="product"]').length > 10;
          const loader = document.getElementById('initial-splash-screen-loader') || document.querySelector('[class*="loader"]');
          const isLoaderHidden = !loader || window.getComputedStyle(loader).display === 'none' || window.getComputedStyle(loader).opacity === '0';
          return hasPrice && hasCards && isLoaderHidden;
        }
      });
      if (results && results[0] && results[0].result) {
        return true;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function detectAnotaAiInTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        const hasAnotaScript = !!document.querySelector('script[src*="anota.ai"]');
        const hasAnotaLink = !!document.querySelector('link[href*="anota.ai"]');
        const isAnotaHost = window.location.hostname.includes('anota.ai');
        const hasAnotaDiv = !!document.querySelector('#anota-app') || !!document.querySelector('.anota-app') || !!document.querySelector('[id*="anota"]') || !!document.querySelector('[class*="anota"]');
        return hasAnotaScript || hasAnotaLink || isAnotaHost || hasAnotaDiv;
      }
    });
    return !!(results && results[0] && results[0].result);
  } catch (e) {
    return false;
  }
}

async function detectCardapioWebInTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        const hasCwScript = !!document.querySelector('script[src*="cardapioweb"]') || !!document.querySelector('script[src*="cardapio-web"]');
        const hasCwLink = !!document.querySelector('link[href*="cardapioweb"]') || !!document.querySelector('link[href*="cardapio-web"]');
        const isCwHost = window.location.hostname.includes('cardapioweb');
        const hasCwWindow = !!window.webpackJsonpcardapio_web_menu || !!window.webpackJsonpcardapio_web_menu_aux || !!window.webpackJsonpcardapio_web || !!Object.keys(window).find(k => k.includes('cardapio-web') || k.includes('cardapioweb'));
        const hasCwStorage = localStorage.getItem('@cardapio-web-menu/session_id') !== null || !!Object.keys(localStorage).find(k => k.includes('cardapio-web') || k.includes('cardapioweb') || k.startsWith('cw.'));
        return hasCwScript || hasCwLink || isCwHost || hasCwWindow || hasCwStorage;
      }
    });
    return !!(results && results[0] && results[0].result);
  } catch (e) {
    return false;
  }
}

async function getCardapioWebDetailsFromTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        return {
          companySlug: window.companySlug || window.location.pathname.split('/').filter(Boolean).pop() || '',
          companyId: window.companyId || ''
        };
      }
    });
    return results && results[0] ? results[0].result : null;
  } catch (e) {
    return null;
  }
}

async function getSlugFromTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        return window.companySlug || window.location.pathname.split('/').filter(Boolean).pop() || '';
      }
    });
    return results && results[0] ? results[0].result : '';
  } catch (e) {
    return '';
  }
}

function parseAnotaAiMenu(json) {
  let menu = json;
  if (json.data && json.data.menu) {
    menu = json.data.menu;
  }
  
  if (!menu || (!menu.menu && !menu.menu_aux)) {
    return null;
  }

  const categories = [];
  const menuAuxMap = new Map();
  
  if (Array.isArray(menu.menu_aux)) {
    menu.menu_aux.forEach(cat => {
      if (cat.category_id) menuAuxMap.set(cat.category_id, cat);
      if (cat._id) menuAuxMap.set(cat._id, cat);
      if (cat.id) menuAuxMap.set(cat.id, cat);
    });
  }

  const asNumber = value => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  };

  const groupSemantic = title => {
    const normalized = String(title || '').toLowerCase();
    if (/sabor|recheio/.test(normalized)) return 'flavor';
    if (/borda|massa|adicional|extra|complemento|molho/.test(normalized)) return 'addon';
    if (/bebida|refri|suco/.test(normalized)) return 'combo_component';
    return 'required_choice';
  };

  const stepQuantities = (step = {}, auxCat = {}) => {
    const min = Number(step.min ?? step.minimum ?? step.min_items ?? auxCat.min ?? 0);
    const max = Number(step.max ?? step.maximum ?? step.max_items ?? auxCat.max ?? 0);
    return {
      min_quantity: Number.isFinite(min) && min > 0 ? min : 0,
      max_quantity: Number.isFinite(max) && max > 0 ? max : null,
      is_required: Boolean(step.required || step.is_required || (Number.isFinite(min) && min > 0)),
    };
  };
  
  function promoteAnotaImageSize(urlValue) {
    try {
      const url = new URL(urlValue);
      ['w', 'width', 'h', 'height'].forEach(key => {
        if (url.searchParams.has(key)) url.searchParams.set(key, '1200');
      });
      if (url.searchParams.has('size')) url.searchParams.set('size', 'large');
      url.pathname = url.pathname
        .replace(/\/(?:thumb|thumbnail|small|medium|mini|preview)\//gi, '/')
        .replace(/_(?:thumb|small|medium|mini|preview)(?=\.)/gi, '');
      return url.toString();
    } catch (_) {
      return urlValue;
    }
  }

  function formatAnotaImage(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return promoteAnotaImageSize(imagePath);
    if (imagePath.startsWith('//')) return promoteAnotaImageSize(`https:${imagePath}`);
    return promoteAnotaImageSize(`https://client-assets.anota.ai/${String(imagePath).replace(/^\/+/, '')}`);
  }

  const normalizeAnotaCategoryKey = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const isGenericAnotaMenuCategory = value => /^(menu|cardapio|cardapio completo|geral)$/i.test(normalizeAnotaCategoryKey(value));
  const anotaMenuItemKey = item => normalizeAnotaCategoryKey(item?.name || item?.title || item?.label || item?.display_name || '');

  function removeGenericAnotaDuplicateCategories(categories = []) {
    if (!Array.isArray(categories) || categories.length <= 1) return categories;
    const realCategories = categories.filter(category => !isGenericAnotaMenuCategory(category?.name));
    if (realCategories.length === 0) return categories;
    return categories.filter(category => !isGenericAnotaMenuCategory(category?.name));
  }

  const buildOptionGroups = item => {
    const groups = [];
    if (!Array.isArray(item.next_steps)) return groups;
    item.next_steps.forEach((step, stepIndex) => {
      const auxCat = menuAuxMap.get(step.category) || menuAuxMap.get(step.category_id) || menuAuxMap.get(step._id) || menuAuxMap.get(step.id);
      if (!auxCat || !Array.isArray(auxCat.itens) || !auxCat.itens.length) return;
      const title = auxCat.title || auxCat.name || `Opções ${stepIndex + 1}`;
      const semantic = groupSemantic(title);
      const quantities = stepQuantities(step, auxCat);
      const optionItems = auxCat.itens
        .filter(option => option && option.out !== true && option.available !== false)
        .map((option, optionIndex) => {
          const price = asNumber(option.price ?? option.price_base ?? option.minimal_price);
          return {
            name: option.title || option.name || '',
            description: option.description || '',
            price,
            price_delta: price,
            image_url: formatAnotaImage(option.image || ''),
            min_quantity: quantities.min_quantity,
            max_quantity: quantities.max_quantity,
            is_required: quantities.is_required,
            semantic_type: semantic,
            price_behavior: price > 0 ? 'price_delta' : 'included',
            is_searchable_variant: semantic === 'flavor',
            search_label: semantic === 'flavor' ? `${item.title || ''} ${option.title || option.name || ''}`.trim() : null,
            order_index: optionIndex,
            raw_data: option,
          };
        })
        .filter(option => option.name);
      if (!optionItems.length) return;
      groups.push({
        name: title,
        group_name: title,
        min_quantity: quantities.min_quantity,
        max_quantity: quantities.max_quantity,
        is_required: quantities.is_required,
        semantic_type: semantic,
        price_behavior: semantic === 'addon' ? 'price_delta' : 'included',
        order_index: stepIndex,
        items: optionItems,
        raw_data: { step, aux_category_id: auxCat.category_id || auxCat._id || auxCat.id },
      });
    });
    return groups;
  };
  
  if (Array.isArray(menu.menu)) {
    menu.menu.forEach(cat => {
      const catName = cat.title || 'Geral';
      const items = [];
      
      if (Array.isArray(cat.itens)) {
        cat.itens.forEach(item => {
          const itemName = item.title || '';
          const itemPrice = item.price || item.minimal_price || 0;
          const itemDesc = item.description || '';
          const itemImage = formatAnotaImage(item.image || '');
          const optionGroups = buildOptionGroups(item);
          const flatOptions = optionGroups.flatMap(group => (group.items || []).map(option => ({
            ...option,
            group_name: group.name,
            min_quantity: group.min_quantity,
            max_quantity: group.max_quantity,
            is_required: group.is_required,
            semantic_type: option.semantic_type || group.semantic_type,
            price_behavior: option.price_behavior || group.price_behavior,
            group_order_index: group.order_index,
          })));
          
          items.push({
            name: itemName,
            price: itemPrice,
            description: itemDesc,
            image_url: itemImage,
            options: flatOptions,
            option_groups: optionGroups,
            price_type: flatOptions.length ? 'starting_at' : 'fixed',
            commercial_type: flatOptions.length ? 'configurable_item' : 'simple_item',
            is_configurable: flatOptions.length > 0,
            raw_data: item,
          });
        });
      }
      
      if (items.length > 0) {
        categories.push({
          name: catName,
          items: items
        });
      }
    });
  }
  
  return removeGenericAnotaDuplicateCategories(categories);
}

function parseCardapioWebMenu(json) {
  if (!Array.isArray(json)) return null;
  
  const categories = [];
  const borderItemsMap = new Map();
  
  json.forEach(cat => {
    if (cat.status !== 'ACTIVE') return;
    
    const catName = cat.name || 'Geral';
    const items = [];
    
    if (Array.isArray(cat.items)) {
      cat.items.forEach(item => {
        if (item.status !== 'ACTIVE') return;
        
        const itemName = item.name || '';
        const itemDesc = item.description || '';
        
        // Calcular preço
        let itemPrice = item.price || 0;
        if (item.promotional_price_active && typeof item.promotional_price === 'number') {
          itemPrice = item.promotional_price;
        }
        
        // URL da imagem
        const itemImage = item.image_url || item.thumbnail_url || '';
        
        // Adicionais / Opcionais
        const optionsList = [];
        if (Array.isArray(item.add_ons)) {
          item.add_ons.forEach(addOn => {
            if (addOn.status === 'ACTIVE' && Array.isArray(addOn.subitems) && addOn.subitems.length > 0) {
              optionsList.push({
                title: addOn.name || 'Opcionais',
                itens: addOn.subitems
                  .filter(sub => sub.status === 'ACTIVE')
                  .map(sub => ({
                    name: sub.name || '',
                    price: sub.price || 0
                  }))
              });
            }
          });
        }
        
        let finalDesc = itemDesc;
        if (optionsList.length > 0) {
          finalDesc = JSON.stringify({
            description: itemDesc,
            options: optionsList
          });
        }
        
        items.push({
          name: itemName,
          price: itemPrice,
          description: finalDesc,
          image_url: itemImage
        });
        
        // Coletar adicionais globalmente
        if (Array.isArray(item.add_ons)) {
          item.add_ons.forEach(addOn => {
            if (addOn.status === 'ACTIVE' && Array.isArray(addOn.subitems)) {
              addOn.subitems.forEach(sub => {
                if (sub.status === 'ACTIVE' && sub.price > 0) {
                  const key = `${sub.name}-${sub.price}`;
                  borderItemsMap.set(key, {
                    name: `Adicional: ${sub.name}`,
                    price: sub.price,
                    description: sub.description || '',
                    image_url: sub.image_url || sub.thumbnail_url || ''
                  });
                }
              });
            }
          });
        }
      });
    }
    
    if (items.length > 0) {
      categories.push({
        name: catName,
        items: items
      });
    }
  });
  
  if (borderItemsMap.size > 0) {
    categories.push({
      name: "Adicionais / Bordas",
      items: Array.from(borderItemsMap.values())
    });
  }
  
  return categories;
}

async function handleWebContextScrape(url) {
  console.log("Iniciando raspagem de contexto web para:", url);
  // O Google Maps precisa estar ativo (active: true) para renderizar o DOM corretamente
  const tab = await createTabWithRetry({ url: url, active: false });
  const tabId = tab.id;
  
  try {
    await new Promise((resolve, reject) => {
      let tries = 0;
      let completeCount = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba foi fechada prematuramente."));
            return;
          }
          if (currentTab.status === 'complete') {
            completeCount++;
            if (completeCount > 6) { // Aguarda cerca de 3 segundos extras após 'complete'
              resolve();
            } else {
              setTimeout(checkStatus, 500);
            }
          } else {
            completeCount = 0; // reseta se não estiver mais complete
            setTimeout(checkStatus, 1000);
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        return new Promise((resolve) => {
          // Scroll page to ensure lazy-loaded elements are mounted
          window.scrollBy(0, 500);
          
          try {
            // Método super confiável para horários do Google Maps
            const hoursContainer = document.querySelector('[data-item-id="oh"]');
            if (hoursContainer) {
              const expandBtn = hoursContainer.querySelector('[aria-expanded="false"]');
              if (expandBtn) expandBtn.click();
              // Fallback: clica na própria linha de horários
              try { hoursContainer.click(); } catch(e) {}
              const innerButtons = hoursContainer.querySelectorAll('button, div[role="button"]');
              innerButtons.forEach(b => { try { b.click(); } catch(e) {} });
            }

            // Fallback genérico para outros botões importantes
            const els = Array.from(document.querySelectorAll('*'));
            els.forEach(b => {
              const clickEl = (el) => {
                try { el.click(); } catch(e) {}
                try { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch(e) {}
                try { el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch(e) {}
                try { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
              };

              if (b.innerText && (b.innerText.toLowerCase() === 'mais' || b.innerText.toLowerCase() === 'more')) clickEl(b);
              if (b.getAttribute('aria-expanded') === 'false' && (b.innerText && (b.innerText.includes('Abre') || b.innerText.includes('Fechado') || b.innerText.includes('horário')))) clickEl(b);
              
              const ariaLabel = b.getAttribute('aria-label') || '';
              const lowerLabel = ariaLabel.toLowerCase();
              if (lowerLabel && (lowerLabel.includes('horário') || lowerLabel.includes('horario') || lowerLabel.includes('hours') || lowerLabel.includes('abre às') || lowerLabel.includes('fechado'))) {
                clickEl(b);
              }
            });
          } catch(e) {}

          setTimeout(() => {
            let metaDesc = '';
            try {
              const meta = document.querySelector('meta[property="og:description"]');
              if (meta) metaDesc = meta.content;
            } catch(e) {}

            let tablesText = '';
            try {
              const tables = document.querySelectorAll('table');
              tables.forEach(t => {
                tablesText += "\nTABLE: " + t.textContent;
              });
            } catch(e) {}
            
            resolve(document.body.innerText + "\n\nMETA DESCRIPTION:\n" + metaDesc + "\n\nHIDDEN TABLES:\n" + tablesText);
          }, 1500); // Aguarda a tabela renderizar após o clique
        });
      }
    });

    if (results && results[0] && results[0].result) {
      return { success: true, text: results[0].result };
    } else {
      return { success: false, error: "Nenhum texto extraído." };
    }
  } catch (err) {
    console.error("Erro na raspagem de contexto:", err);
    return { success: false, error: err.message };
  } finally {
    try {
      await removeTabWithRetry(tabId);
    } catch(e) {}
  }
}

// --- INTERACTIVE WEB AGENT FUNCTIONS ---

let activeAgentTabId = null;

async function handleAgentSnapshot(url) {
  if (!activeAgentTabId && url) {
    const tab = await createTabWithRetry({ url: url, active: false });
    activeAgentTabId = tab.id;
    await new Promise((resolve) => {
      let completeCount = 0;
      const checkStatus = () => {
        chrome.tabs.get(activeAgentTabId, (currentTab) => {
          if (chrome.runtime.lastError) return;
          if (currentTab.status === 'complete') {
            completeCount++;
            if (completeCount > 4) { resolve(); }
            else { setTimeout(checkStatus, 500); }
          } else {
            completeCount = 0;
            setTimeout(checkStatus, 500);
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });
  }

  if (!activeAgentTabId) return { success: false, error: "Nenhuma aba ativa para snapshot." };

  const results = await chrome.scripting.executeScript({
    target: { tabId: activeAgentTabId },
    func: () => {
      window.scrollBy(0, 500);

      // NOVO: Pre-emptive click para expandir horários como na Fase 1
      try {
          const expandBtns = document.querySelectorAll('div[role="button"][jsaction*="pane.openhours"], div.o0Svhf');
          expandBtns.forEach(btn => {
              try { btn.click(); } catch(e) {}
              try { btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch(e) {}
              try { btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch(e) {}
              try { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
          });
      } catch(e) {}

      return new Promise((resolve) => {
        setTimeout(() => {
          let idCounter = 1;
          const interactables = document.querySelectorAll('button, a, [role="button"], input, select, [aria-expanded], [data-item-id="oh"], [data-item-id="oh"] div, div[aria-label], span[aria-label], div.o0Svhf, div[jsaction*="pane.openhours"]');
          interactables.forEach(el => {
             const rect = el.getBoundingClientRect();
             if (rect.width > 0 && rect.height > 0) {
               el.setAttribute('data-ai-id', idCounter.toString());
               idCounter++;
             }
          });
          
          const elementsData = [];
          document.querySelectorAll('[data-ai-id]').forEach(el => {
             const id = el.getAttribute('data-ai-id');
             const text = el.innerText ? el.innerText.trim().substring(0, 100) : el.getAttribute('aria-label') || '';
             if (text) {
                elementsData.push(`[ID: ${id}] ${text.replace(/\n/g, ' ')}`);
             }
          });
          
          const hiddenTables = Array.from(document.querySelectorAll('table, .o0Svhf')).map(t => t.textContent.trim().replace(/\n/g, ' ')).join('\n---\n');
          const bodyText = document.body.innerText;
          const resultText = `PÁGINA TEXTO:\n${bodyText.substring(0, 8000)}\n\nHIDDEN TABLES (IMPORTANT: Check here for opening hours):\n${hiddenTables}\n\nELEMENTOS INTERATIVOS:\n${elementsData.join('\n')}`;
          
          resolve(resultText);
        }, 1500);
      });
    }
  });
  
  return { success: true, text: results[0].result };
}

async function handleClickAgentElement(targetId) {
  if (!activeAgentTabId) throw new Error("Nenhuma aba ativa para clicar.");
  
  await chrome.scripting.executeScript({
    target: { tabId: activeAgentTabId },
    func: (id) => {
       const el = document.querySelector(`[data-ai-id="${id}"]`);
       
       // ESTRATÉGIA DEFINITIVA: Clicar no novo seletor que o usuário encontrou (span com aria-label) e jsaction
       const newArrow = document.querySelector('div[role="button"][jsaction*="pane.openhours"], span[aria-label*="Mostrar horário"], span[aria-label*="Mostrar horários"], div.o0Svhf');
       if (newArrow) {
          try { newArrow.click(); } catch(e) {}
          try { newArrow.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch(e) {}
          try { newArrow.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch(e) {}
          try { newArrow.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
       }
       
       if (el) {
          // Estratégia inspirada na Fase 1 (Robô Antigo Funcional)
          const ohContainer = el.closest('[data-item-id="oh"]') || el.closest('.o0Svhf');
          if (ohContainer) {
              const expandBtn = ohContainer.querySelector('[aria-expanded="false"], span[role="img"]');
              if (expandBtn) {
                 try { expandBtn.click(); } catch(e) {}
                 try { expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
              }
              try { ohContainer.click(); } catch(e) {}
              const innerButtons = ohContainer.querySelectorAll('button, div[role="button"], span[role="img"]');
              innerButtons.forEach(b => { try { b.click(); } catch(e) {} });
          } else {
              // Fallback para elementos fora dos horários
              let curr = el;
              let depth = 0;
              while (curr && depth < 5) {
                 try { curr.click(); } catch(e) {}
                 try { curr.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch(e) {}
                 try { curr.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch(e) {}
                 try { curr.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
                 curr = curr.parentElement;
                 depth++;
              }
          }
       }
    },
    args: [targetId]
  });
  
  await new Promise(r => setTimeout(r, 2500));
  return { success: true };
}

async function handleAgentClose() {
  if (activeAgentTabId) {
    try { await removeTabWithRetry(activeAgentTabId); } catch(e) {}
    activeAgentTabId = null;
  }
  return { success: true };
}

async function waitForTabComplete(tabId, timeoutMs = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const checkStatus = () => {
      chrome.tabs.get(tabId, (currentTab) => {
        if (chrome.runtime.lastError) {
          reject(new Error("A aba foi fechada prematuramente."));
          return;
        }
        if (currentTab.status === 'complete') {
          resolve();
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Tempo limite ao carregar a aba."));
          return;
        }
        setTimeout(checkStatus, 500);
      });
    };
    setTimeout(checkStatus, 500);
  });
}

const ffSleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function attachDebuggerToTab(tabId) {
  if (!chrome.debugger?.attach) {
    throw new Error('chrome.debugger API indisponível; não consigo mandar wheel real no Maps.');
  }
  await new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, '1.3', () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

async function detachDebuggerFromTab(tabId) {
  if (!chrome.debugger?.detach) return;
  await new Promise(resolve => {
    try {
      chrome.debugger.detach({ tabId }, () => resolve());
    } catch (_) {
      resolve();
    }
  });
}

async function sendDebuggerCommand(tabId, method, params = {}) {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout no debugger.${method}`)), 6000);
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      clearTimeout(timer);
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(result);
    });
  });
}

async function readVisibleGoogleMapsLeads(tabId, maxResults, expectedCity, expectedState) {
  const [snapshot] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [Number(maxResults || 80), expectedCity || '', expectedState || ''],
    func: (limit, city, state) => {
      const normalize = (value) => String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const cleanUrl = (href) => {
        try {
          const url = new URL(href);
          url.hash = '';
          ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid', 'gclid', 'entry'].forEach(key => url.searchParams.delete(key));
          return url.href;
        } catch (_) {
          return href || '';
        }
      };
      const isPlaceUrl = (href) => /google\.[^/]+\/maps\/place|\/maps\/place\/|place_id:|!1s0x/i.test(href || '');
      const placeNameFromUrl = (href) => {
        try {
          const match = String(href || '').match(/\/maps\/place\/([^/?#]+)/i) || String(href || '').match(/\/place\/([^/?#]+)/i);
          if (!match) return '';
          const decoded = decodeURIComponent(match[1]).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
          if (!decoded || /^(data=|!|0x|@|search\b|maps\b|place\b)/i.test(decoded) || /![0-9a-z]/i.test(decoded)) return '';
          return decoded;
        } catch (_) {
          return '';
        }
      };
      const isNameNoise = (value) => {
        const sponsoredRaw = String(value || '')
          .replace(/[\uE000-\uF8FF]/g, ' ')
          .replace(/^Ver\s+/i, '')
          .replace(/^[^\p{L}\p{N}]+/gu, '')
          .replace(/[^\p{L}\p{N}\s&'.`´-]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (/^(data=|!|0x|@|https?:|www\.|google maps|maps|place|search)\b/i.test(sponsoredRaw) || /![0-9a-z]/i.test(sponsoredRaw)) return true;
        if (/^(patrocinado|sponsored|an[úu]ncio|anuncio pago|ad)\b/i.test(sponsoredRaw)) return true;
        const text = normalize(sponsoredRaw);
        if (!text) return true;
        return /^(data|patrocinado|sponsored|anuncio|anuncio pago|ad|resultados|direcoes|rotas|salvar|compartilhar|google maps|maps|place|search)\b/.test(text) ||
          /^\d(?:[,.]\d)?\s*\(/.test(text) ||
          /^R\$\s*\d/i.test(text);
      };
      const pickCandidateName = (card, anchor, lines, href) => {
        const heading = compact(card?.querySelector?.('h1,h2,h3,[role="heading"],.qBF1Pd,.fontHeadlineSmall')?.textContent || '');
        const aria = compact(anchor?.getAttribute?.('aria-label') || '');
        const urlName = compact(placeNameFromUrl(href));
        const candidates = [heading, aria, urlName, ...(lines || [])]
          .map(value => compact(String(value || '').replace(/[\uE000-\uF8FF]/g, ' ').replace(/^Ver\s+/i, '')))
          .filter(value => value && value.length >= 2 && !isNameNoise(value));
        return candidates[0] || '';
      };
      const pushLead = (leads, seen, name, href) => {
        const cleanHref = cleanUrl(href || '');
        if (!name || !cleanHref || !isPlaceUrl(cleanHref) || isNameNoise(name)) return;
        if (/\/maps\/place\/(?:data=|!|0x|@)/i.test(cleanHref)) return;
        const key = cleanHref.replace(/[?#].*$/, '') || normalize(name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        leads.push({
          name,
          category: 'Pendente validação',
          address: '',
          phone: '',
          city: city || '',
          state: state || '',
          googleMapsUrl: cleanHref,
          rating: 0,
          reviewsCount: 0,
        });
      };

      const cards = Array.from(document.querySelectorAll('[role="article"], .Nv2PK, .bfdHYd, div[data-result-index]'))
        .filter(el => compact(el.innerText).length > 10);
      const leads = [];
      const seen = new Set();

      for (const card of cards) {
        const anchors = Array.from(card.querySelectorAll('a[href]'));
        const placeAnchor = anchors.find(anchor => isPlaceUrl(anchor.href || ''));
        const href = placeAnchor?.href || '';
        const lines = compact(card.innerText || '').split(/\n+/).map(line => compact(line)).filter(Boolean);
        const name = pickCandidateName(card, placeAnchor, lines, href);
        pushLead(leads, seen, name, href);
        if (leads.length >= limit) break;
      }

      if (leads.length < limit) {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        for (const anchor of anchors) {
          const href = anchor.href || '';
          if (!isPlaceUrl(href)) continue;
          const card = anchor.closest('[role="article"], .Nv2PK, .bfdHYd, div[jsaction], div[data-result-index]') || anchor.parentElement;
          const rawText = compact(card?.innerText || anchor.getAttribute('aria-label') || anchor.textContent || '');
          const lines = rawText.split(/\n+/).map(line => compact(line)).filter(Boolean);
          const name = pickCandidateName(card, anchor, lines, href);
          pushLead(leads, seen, name, href);
          if (leads.length >= limit) break;
        }
      }

      if (leads.length < limit && /\/maps\/place\//i.test(location.href)) {
        const heading = compact(document.querySelector('h1, [role="heading"], .DUwDvf, .fontHeadlineLarge')?.textContent || '');
        const titleName = compact((document.title || '').replace(/\s*[-–]\s*Google Maps\s*$/i, ''));
        const queryName = compact(document.querySelector('input[aria-label], input[role="combobox"]')?.value || '');
        const placeName = [heading, titleName, queryName].find(value => value && !isNameNoise(value));
        if (placeName) {
          pushLead(leads, seen, placeName, location.href);
        }
      }

      const feed = document.querySelector('div[role="feed"]');
      const rect = feed?.getBoundingClientRect?.();
      const pageText = normalize(document.body.innerText || '');
      const loadingVisible = Array.from(document.querySelectorAll('[role="progressbar"], [aria-label*="Carregando"], [aria-label*="Loading"], .loading, .spinner, .HlvSq, .qjESne'))
        .some(el => {
          const box = el.getBoundingClientRect?.();
          if (!box) return false;
          return box.width > 4 && box.height > 4 && box.bottom > 0 && box.top < window.innerHeight;
        });
      const reachedEnd = /you'?ve reached the end|fim da lista|final da lista|nao ha mais resultados|não há mais resultados|sem mais resultados/i.test(pageText);

      return {
        leads,
        count: leads.length,
        cardCount: cards.length,
        url: location.href,
        title: document.title,
        reachedEnd,
        loadingVisible,
        feed: feed ? {
          scrollTop: feed.scrollTop,
          scrollHeight: feed.scrollHeight,
          clientHeight: feed.clientHeight,
          rect: rect ? {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          } : null,
        } : null,
      };
    },
  });
  return snapshot?.result || { leads: [], count: 0 };
}

async function collectGoogleMapsLeadsWithRealWheel(tabId, maxResults, expectedCity, expectedState) {
  const limit = Number(maxResults || 80);
  const collected = new Map();
  const mergeLeads = (leads = []) => {
    let added = 0;
    for (const lead of leads) {
      const key = String(lead?.googleMapsUrl || '').replace(/[?#].*$/, '') || String(lead?.name || '').toLowerCase();
      if (!key || collected.has(key)) continue;
      collected.set(key, lead);
      added += 1;
      if (collected.size >= limit) break;
    }
    return added;
  };

  let attached = false;
  let lastSnapshot = null;
  let lastFingerprint = '';
  let stableRounds = 0;
  let noNewLeadRounds = 0;
  let loadingStallRounds = 0;
  const snapshotFingerprint = (snapshot, collectedSize = collected.size) => {
    const feed = snapshot?.feed || {};
    return [
      collectedSize,
      snapshot?.cardCount || 0,
      Math.round(feed.scrollTop || 0),
      Math.round(feed.scrollHeight || 0),
    ].join(':');
  };
  const waitForMapsFeedProgress = async (beforeFingerprint, deadlineAt) => {
    let latest = null;
    const waitStartedAt = Date.now();
    while (Date.now() < deadlineAt && Date.now() - waitStartedAt < 3600) {
      await ffSleep(450);
      const snapshot = await readVisibleGoogleMapsLeads(tabId, limit, expectedCity, expectedState);
      latest = snapshot;
      const added = mergeLeads(snapshot.leads);
      const fingerprint = snapshotFingerprint(snapshot);
      if (added > 0 || fingerprint !== beforeFingerprint || snapshot.reachedEnd) {
        return { snapshot, progressed: added > 0 || fingerprint !== beforeFingerprint };
      }
    }
    return { snapshot: latest, progressed: false };
  };

  try {
    await attachDebuggerToTab(tabId);
    attached = true;

    const startedAt = Date.now();
    const maxDurationMs = 52000;
    const maxScrollRounds = 22;
    const deadlineAt = startedAt + maxDurationMs;

    for (let step = 0; step < maxScrollRounds && collected.size < limit && stableRounds < 4 && Date.now() < deadlineAt; step += 1) {
      const snapshot = await readVisibleGoogleMapsLeads(tabId, limit, expectedCity, expectedState);
      lastSnapshot = snapshot;
      const added = mergeLeads(snapshot.leads);
      const feed = snapshot.feed || {};
      const fingerprint = snapshotFingerprint(snapshot);

      if (/\/maps\/place\//i.test(snapshot.url || '') && collected.size > 0) break;
      if (added === 0) noNewLeadRounds += 1;
      else noNewLeadRounds = 0;

      if (step > 0 && added === 0 && fingerprint === lastFingerprint) stableRounds += 1;
      else stableRounds = 0;
      lastFingerprint = fingerprint;

      if (collected.size >= limit) break;
      if (snapshot.reachedEnd && stableRounds >= 1) break;
      if (step >= 7 && collected.size >= 45 && noNewLeadRounds >= 3 && !snapshot.loadingVisible) break;
      if (step >= 8 && collected.size >= 12 && noNewLeadRounds >= 5 && !snapshot.loadingVisible) break;
      if (step >= 10 && noNewLeadRounds >= 6 && !snapshot.loadingVisible) break;

      const rect = feed.rect || { x: 72, y: 72, width: 408, height: 565 };
      const x = Math.max(20, Math.round(rect.x + Math.min(rect.width - 20, Math.max(40, rect.width * 0.52))));
      const y = Math.max(20, Math.round(rect.y + Math.min(rect.height - 20, Math.max(80, rect.height * 0.62))));

      await sendDebuggerCommand(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers: 0 });
      for (let wheel = 0; wheel < 4; wheel += 1) {
        await sendDebuggerCommand(tabId, 'Input.dispatchMouseEvent', {
          type: 'mouseWheel',
          x,
          y,
          deltaX: 0,
          deltaY: 1650,
          modifiers: 0,
        });
        await ffSleep(260);
      }
      const afterScroll = await waitForMapsFeedProgress(fingerprint, deadlineAt);
      if (afterScroll.snapshot) {
        lastSnapshot = afterScroll.snapshot;
        lastFingerprint = snapshotFingerprint(afterScroll.snapshot);
      }
      if (/\/maps\/place\//i.test(afterScroll.snapshot?.url || '') && collected.size > 0) break;
      if (!afterScroll.progressed && (snapshot.loadingVisible || afterScroll.snapshot?.loadingVisible)) {
        loadingStallRounds += 1;
        stableRounds += 1;
      } else {
        loadingStallRounds = 0;
      }
      if (loadingStallRounds >= 4 && collected.size > 0 && step >= 6) break;
    }

    const finalSnapshot = await readVisibleGoogleMapsLeads(tabId, limit, expectedCity, expectedState);
    lastSnapshot = finalSnapshot;
    mergeLeads(finalSnapshot.leads);

    return {
        leads: Array.from(collected.values()).slice(0, limit),
        count: collected.size,
        sourceUrl: finalSnapshot?.url || lastSnapshot?.url || '',
        pageTitle: finalSnapshot?.title || lastSnapshot?.title || '',
        reachedEnd: Boolean(finalSnapshot?.reachedEnd || lastSnapshot?.reachedEnd),
        loadingVisible: Boolean(finalSnapshot?.loadingVisible || lastSnapshot?.loadingVisible),
        cardCount: finalSnapshot?.cardCount || lastSnapshot?.cardCount || 0,
        usedRealWheel: true,
      };
  } finally {
    if (attached) await detachDebuggerFromTab(tabId);
  }
}

async function handleSearchGoogleMapsLeads(query, city, state, maxResults = 80) {
  const cleanQuery = String(query || '').trim();
  const cleanCity = String(city || '').trim();
  const cleanState = String(state || '').trim();
  const finalQuery = cleanQuery || `restaurantes em ${cleanCity}${cleanState ? ', ' + cleanState : ''}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(finalQuery)}`;
  const tab = await getOrCreateMapsLeadSearchTab(searchUrl);
  const tabId = tab.id;

  await waitForTabComplete(tabId, 45000);
  await new Promise(resolve => setTimeout(resolve, 3500));
  await closeStaleMapsLeadSearchTabs(tabId);

  const initialSnapshot = await readVisibleGoogleMapsLeads(tabId, maxResults, cleanCity, cleanState);
  const initialLeads = Array.isArray(initialSnapshot?.leads) ? initialSnapshot.leads : [];
  if (/\/maps\/place\//i.test(initialSnapshot?.url || '') && initialLeads.length > 0) {
    return {
      success: true,
      leads: initialLeads,
      count: initialLeads.length,
      query: finalQuery,
      sourceUrl: initialSnapshot.url || searchUrl,
      usedPlaceFastPath: true,
    };
  }

  let bestRealWheelResult = null;
  let realWheelError = null;
  let realWheelAttempts = 0;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    realWheelAttempts = attempt;
    try {
      const realWheelResult = await collectGoogleMapsLeadsWithRealWheel(tabId, maxResults, cleanCity, cleanState);
      const realWheelLeads = Array.isArray(realWheelResult.leads) ? realWheelResult.leads : [];
      const bestCount = Array.isArray(bestRealWheelResult?.leads) ? bestRealWheelResult.leads.length : 0;
      if (realWheelLeads.length > bestCount) bestRealWheelResult = realWheelResult;
      if (/\/maps\/place\//i.test(realWheelResult.sourceUrl || '') && realWheelLeads.length > 0) break;
      if (realWheelLeads.length >= 8 || attempt === 2) break;
      await ffSleep(2200);
    } catch (error) {
      realWheelError = error;
      if (attempt < 2) await ffSleep(2200);
    }
  }

  const realWheelLeads = Array.isArray(bestRealWheelResult?.leads) ? bestRealWheelResult.leads : [];
  const trustedRealWheelCount = Math.min(Number(maxResults || 80), 45);
  const shouldTrustRealWheel =
    realWheelLeads.length >= trustedRealWheelCount ||
    bestRealWheelResult?.reachedEnd === true ||
    /\/maps\/place\//i.test(bestRealWheelResult?.sourceUrl || '');
  if (realWheelLeads.length > 0 && shouldTrustRealWheel) {
    return {
      success: true,
      leads: realWheelLeads,
      count: realWheelLeads.length,
      query: finalQuery,
      sourceUrl: bestRealWheelResult.sourceUrl || searchUrl,
      usedRealWheel: true,
      realWheelAttempts,
      reachedEnd: Boolean(bestRealWheelResult?.reachedEnd),
    };
  }
  if (realWheelError) {
    console.warn('[FilterFood Maps] Real wheel scroll failed after retry; falling back to DOM scroll.', realWheelError);
  }

  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [Number(maxResults || 80), cleanCity, cleanState],
    func: async (limit, expectedCity, expectedState) => {
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const normalize = (value) => String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const cleanUrl = (href) => {
        try {
          const url = new URL(href);
          url.hash = '';
          ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid', 'gclid', 'entry'].forEach(key => url.searchParams.delete(key));
          return url.href;
        } catch (_) {
          return href || '';
        }
      };
      const isPlaceUrl = (href) => /google\.[^/]+\/maps\/place|\/maps\/place\/|place_id:|!1s0x/i.test(href || '');
      const isBadLead = (name, category) => {
        const text = normalize(`${name} ${category}`);
        return /\b(posto|gasolina|farmacia|drogaria|supermercado|hipermercado|mercado|conveniencia|banco|academia|hotel|pousada|hospital|clinica|escola|igreja|oficina|lava jato|barbearia|salao)\b/.test(text);
      };
      const getResultCards = () => Array.from(document.querySelectorAll('[role="article"], .Nv2PK, .bfdHYd, div[data-result-index]'))
        .filter(el => (el.innerText || '').trim().length > 10);
      const findScrollableResultsPanel = () => {
        const preferredFeed = document.querySelector('div[role="feed"]');
        if (preferredFeed && preferredFeed.scrollHeight > preferredFeed.clientHeight + 80) {
          return preferredFeed;
        }

        const cards = getResultCards();
        for (const card of cards) {
          let node = card.parentElement;
          while (node && node !== document.body && node !== document.documentElement) {
            const style = window.getComputedStyle(node);
            const canScroll = node.scrollHeight > node.clientHeight + 80;
            const overflowScroll = /(auto|scroll)/i.test(`${style.overflowY} ${style.overflow}`);
            if (canScroll && (overflowScroll || node.getAttribute('role') === 'feed' || node.className?.toString().includes('m6QErb'))) {
              return node;
            }
            node = node.parentElement;
          }
        }

        const candidates = [
          document.querySelector('div[role="feed"]'),
          ...Array.from(document.querySelectorAll('.m6QErb, .DxyBCb, [aria-label]')),
          document.scrollingElement,
        ].filter(Boolean);

        return candidates
          .filter(el => el.scrollHeight > el.clientHeight + 80)
          .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || document.scrollingElement;
      };
      const pushResultsPanelDown = (panel, lastCard) => {
        const targets = [
          panel,
          document.querySelector('div[role="feed"]'),
          document.scrollingElement,
          document.body,
        ].filter(Boolean);

        for (const target of targets) {
          try { target.focus?.(); } catch (_) {}
          try {
            target.dispatchEvent(new WheelEvent('wheel', {
              bubbles: true,
              cancelable: true,
              deltaY: 6500,
              deltaMode: 0,
            }));
          } catch (_) {}
        }

        if (panel) {
          const nextTop = Math.max(
            panel.scrollTop + Math.max(1800, panel.clientHeight * 2.6),
            panel.scrollHeight - panel.clientHeight - 20,
          );
          panel.scrollTop = Math.min(panel.scrollHeight, nextTop);
        }

        if (lastCard) {
          try {
            lastCard.scrollIntoView({ block: 'end', behavior: 'instant' });
          } catch (_) {
            try { lastCard.scrollIntoView(false); } catch (__) {}
          }
        }

        try {
          document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End', code: 'End' }));
          document.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'End', code: 'End' }));
        } catch (_) {}

        try {
          window.scrollBy(0, Math.max(1400, window.innerHeight * 2));
        } catch (_) {}
      };
      const forceScrollResults = async (limit) => {
        const collected = new Map();
        const leadKey = (lead) => {
          const urlKey = String(lead?.googleMapsUrl || '').replace(/[?#].*$/, '');
          return urlKey || normalize(`${lead?.name || ''} ${lead?.address || ''}`);
        };
        const mergeVisibleLeads = (visibleLeads = []) => {
          let added = 0;
          for (const lead of visibleLeads) {
            const key = leadKey(lead);
            if (!key || collected.has(key)) continue;
            collected.set(key, lead);
            added += 1;
            if (collected.size >= limit) break;
          }
          return added;
        };

        const hasNoResultsMessage = () => {
          const pageText = normalize(document.body.innerText || '');
          return /nenhum resultado|sem resultados|n[aã]o encontramos|não encontramos|no results|couldn'?t find|não há resultados|nao ha resultados/i.test(pageText);
        };
        const hasVisibleLoader = () => Array.from(document.querySelectorAll('[role="progressbar"], [aria-label*="Carregando"], [aria-label*="Loading"], .loading, .spinner, .HlvSq, .qjESne'))
          .some(el => {
            const box = el.getBoundingClientRect?.();
            if (!box) return false;
            return box.width > 4 && box.height > 4 && box.bottom > 0 && box.top < window.innerHeight;
          });
        const startedAt = Date.now();
        const maxDomFallbackMs = 42000;

        for (let warmup = 0; warmup < 8 && getResultCards().length === 0 && !hasNoResultsMessage(); warmup += 1) {
          await sleep(500);
        }

        mergeVisibleLeads(getResults());
        if (collected.size === 0 && getResultCards().length === 0 && hasNoResultsMessage()) {
          return [];
        }

        let leads = Array.from(collected.values()).slice(0, limit);
        let previousCardCount = -1;
        let previousScrollTop = -1;
        let previousScrollHeight = -1;
        let stableRounds = 0;
        let noNewLeadRounds = 0;

        for (let i = 0; i < 26 && collected.size < limit && stableRounds < 7 && Date.now() - startedAt < maxDomFallbackMs; i++) {
          const panel = findScrollableResultsPanel();
          const cards = getResultCards();
          const lastCard = cards[cards.length - 1];
          pushResultsPanelDown(panel, lastCard);

          try {
            document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'PageDown', code: 'PageDown' }));
          } catch (_) {}

          await sleep(900);
          const visibleLeads = getResults();
          const added = mergeVisibleLeads(visibleLeads);
          noNewLeadRounds = added > 0 ? 0 : noNewLeadRounds + 1;
          leads = Array.from(collected.values()).slice(0, limit);

          const nextPanel = findScrollableResultsPanel();
          const cardCount = getResultCards().length;
          const scrollTop = nextPanel?.scrollTop || 0;
          const scrollHeight = nextPanel?.scrollHeight || 0;
          const pageText = normalize(document.body.innerText || '');
          const reachedEnd = /you'?ve reached the end|fim da lista|final da lista|nao ha mais resultados|não há mais resultados|sem mais resultados/i.test(pageText);
          const noResults = hasNoResultsMessage();
          const loadingVisible = hasVisibleLoader();
          const didProgress = added > 0 ||
            cardCount !== previousCardCount ||
            scrollTop !== previousScrollTop ||
            scrollHeight !== previousScrollHeight;

          stableRounds = didProgress && !reachedEnd && !noResults ? 0 : stableRounds + 1;
          previousCardCount = cardCount;
          previousScrollTop = scrollTop;
          previousScrollHeight = scrollHeight;
          if (reachedEnd && stableRounds >= 2) break;
          if (noResults && collected.size === 0) break;
          if (i >= 6 && collected.size > 0 && noNewLeadRounds >= 5 && !loadingVisible) break;
          if (i >= 10 && noNewLeadRounds >= 6 && !loadingVisible) break;
        }

        return Array.from(collected.values()).slice(0, limit);
      };
      const getResults = () => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        const leads = [];
        const seen = new Set();
        const placeNameFromUrl = (href) => {
          try {
            const match = String(href || '').match(/\/maps\/place\/([^/?#]+)/i) || String(href || '').match(/\/place\/([^/?#]+)/i);
            if (!match) return '';
            const decoded = decodeURIComponent(match[1]).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
            if (!decoded || /^(data=|!|0x|@|search\b|maps\b|place\b)/i.test(decoded) || /![0-9a-z]/i.test(decoded)) return '';
            return decoded;
          } catch (_) {
            return '';
          }
        };
        const isNameNoise = (value) => {
          const sponsoredRaw = String(value || '')
            .replace(/[\uE000-\uF8FF]/g, ' ')
            .replace(/^Ver\s+/i, '')
            .replace(/^[^\p{L}\p{N}]+/gu, '')
            .replace(/[^\p{L}\p{N}\s&'.`´-]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (/^(data=|!|0x|@|https?:|www\.|google maps|maps|place|search)\b/i.test(sponsoredRaw) || /![0-9a-z]/i.test(sponsoredRaw)) return true;
          if (/^(patrocinado|sponsored|an[úu]ncio|anuncio pago|ad)\b/i.test(sponsoredRaw)) return true;
          const text = normalize(String(value || '')
            .replace(/^Ver\s+/i, '')
            .replace(/[^\p{L}\p{N}\s&'.`´-]/gu, ' '));
          if (!text) return true;
          return /^(data|patrocinado|sponsored|anuncio|anuncio pago|ad|resultados|direcoes|rotas|salvar|compartilhar|google maps|maps|place|search)\b/.test(text) ||
            /^\d(?:[,.]\d)?\s*\(/.test(text) ||
            /^R\$\s*\d/i.test(text);
        };
        const pickCandidateName = (card, anchor, lines, href) => {
          const heading = card?.querySelector?.('h1,h2,h3,[role="heading"],.qBF1Pd,.fontHeadlineSmall')?.textContent || '';
          const aria = anchor.getAttribute('aria-label') || '';
          const urlName = placeNameFromUrl(href);
          const candidates = [heading, aria, urlName, ...(lines || [])]
            .map(value => String(value || '').replace(/^Ver\s+/i, '').trim())
            .filter(value => value && value.length >= 2 && !isNameNoise(value));
          return candidates[0] || '';
        };
        const categoryPattern = /restaurante|pizzaria|hamburgueria|burger|burguer|lanchonete|lanche|sandu[ií]che|bar\b|caf[eé]|cafeteria|sorveteria|doceria|confeitaria|a[cç]a[ií]|loja de a[cç]a[ií]|churrascaria|esfiharia|sushi|japonesa|chinesa|asi[aá]tica|oriental|marmitaria|self service|buffet|pastelaria|past[eé]is|pastel\b|padaria|bistr[oô]|cantina|frutos do mar|peixaria|comida/i;
        const addressPattern = /\b(r\.|rua|av\.|avenida|pra[cç]a|rod\.|rodovia|br-\d|travessa|tv\.|alameda|estrada|shopping|bairro|centro|catol[eé]|campina grande|pb)\b/i;
        const isRatingOrPriceLine = (line) => {
          const text = String(line || '').trim();
          return /^\d(?:[,.]\d)?\s*\(/.test(text) ||
            /^R\$\s*\d/i.test(text) ||
            (/R\$\s*\d+\s*[–-]\s*\d+/i.test(text) && !categoryPattern.test(text));
        };
        const isNoiseLine = (line) => {
          const text = String(line || '').trim();
          if (!text) return true;
          if (isRatingOrPriceLine(text)) return true;
          if (/^(aberto|fechado|fecha|abre)\b/i.test(text)) return true;
          if (/^(hor[aá]rio|pedir|pedido|delivery|retirada|no local|compartilhar|resultados)$/i.test(text)) return true;
          if (/^["“”].*["“”]$/.test(text)) return true;
          return false;
        };
        const cleanSegment = (segment) => String(segment || '')
          .replace(/[\uE000-\uF8FF]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const resolveCategoryAndAddress = (lines) => {
          let category = '';
          let address = '';
          const detailLines = lines.slice(1).map(cleanSegment).filter(line => line && !isNoiseLine(line));

          for (const line of detailLines) {
            const segments = line
              .split(/\s*·\s*/)
              .map(cleanSegment)
              .filter(segment => segment && !isNoiseLine(segment));

            for (const segment of segments) {
              if (!category && categoryPattern.test(segment) && !addressPattern.test(segment)) category = segment;
              if (!address && addressPattern.test(segment) && !isRatingOrPriceLine(segment)) address = segment;
            }

            if (!category && categoryPattern.test(line) && !addressPattern.test(line)) category = line;
            if (!address && addressPattern.test(line) && !isRatingOrPriceLine(line)) address = line;
            if (category && address) break;
          }

          return {
            category: category || 'Pendente validação',
            address: address || '',
          };
        };
        for (const anchor of anchors) {
          const href = cleanUrl(anchor.href || '');
          if (!isPlaceUrl(href)) continue;
          const card = anchor.closest('[role="article"], .Nv2PK, .bfdHYd, div[jsaction], div[data-result-index]') || anchor.parentElement;
          const rawText = (card?.innerText || anchor.getAttribute('aria-label') || anchor.textContent || '').trim();
          const lines = rawText.split(/\n+/).map(line => line.trim()).filter(Boolean);
          const name = pickCandidateName(card, anchor, lines, href);
          if (!name || name.length < 2) continue;
          if (isNameNoise(name) || /\/maps\/place\/(?:data=|!|0x|@)/i.test(href)) continue;
          const category = 'Pendente validação';
          const address = '';
          const key = href.replace(/[?#].*$/, '') || normalize(name);
          if (seen.has(key)) continue;
          seen.add(key);
          leads.push({
            name,
            category,
            address,
            phone: '',
            city: expectedCity || '',
            state: expectedState || '',
            googleMapsUrl: href,
            rating: 0,
            reviewsCount: 0
          });
          if (leads.length >= limit) break;
        }
        return leads;
      };

      let leads = await forceScrollResults(limit);
      return { leads, pageTitle: document.title, url: location.href };
    }
  });

  const value = result?.result || {};
  const fallbackLeads = Array.isArray(value.leads) ? value.leads : [];
  const mergedLeadsByKey = new Map();
  for (const lead of [...realWheelLeads, ...fallbackLeads]) {
    const key = String(lead?.googleMapsUrl || '').replace(/[?#].*$/, '') || String(lead?.name || '').toLowerCase();
    if (!key || mergedLeadsByKey.has(key)) continue;
    mergedLeadsByKey.set(key, lead);
  }
  const leads = Array.from(mergedLeadsByKey.values()).slice(0, Number(maxResults || 80));
  return {
    success: leads.length > 0,
    leads,
    count: leads.length,
    query: finalQuery,
    sourceUrl: value.url || searchUrl,
    usedRealWheel: realWheelLeads.length > 0,
    usedDomFallback: true,
    realWheelCount: realWheelLeads.length,
    fallbackCount: fallbackLeads.length,
    error: leads.length ? undefined : 'Nenhum lead de restaurante encontrado na página visível do Google Maps.'
  };
}

// ============================================================================
// NOVO FLUXO: Extração de Horários via Google Maps (Aba Física)
// ============================================================================
async function handleGoogleHoursScrape(query, mapUrl) {
  console.log("Iniciando busca de horários no Google Maps para:", query, mapUrl);
  
  // Se tivermos a URL direta do Maps, usamos ela. Caso contrário, usamos a busca de locais do Maps
  const searchUrl = mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  
  // Cria aba ativa para garantir que os scripts de interação do Google rodem
  const tab = await createTabWithRetry({ url: searchUrl, active: true });
  const tabId = tab.id;
  
  try {
    // Aguarda a aba carregar completamente
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba do Google Maps foi fechada."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 60) {
              reject(new Error("Tempo limite ao carregar o Google Maps (30s)."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    // Aguarda mais 3 segundos para garantir a renderização inicial do painel lateral
    await new Promise(resolve => setTimeout(resolve, 3000));

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async () => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const normalizeHoursText = (value) => String(value || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // 1. Rola o painel lateral para trazer os detalhes para o viewport se necessário
        const panel = document.querySelector('div[role="main"]') || document.querySelector('.m6ZQ1b') || document.querySelector('.DxyBCb');
        if (panel) panel.scrollTop = 500;
        await sleep(800);

        // O Maps pode marcar a aba como "complete" antes de hidratar o painel do lugar.
        // Espera ativamente por nome/endereco/controle de horarios antes de tentar ler.
        for (let waitAttempt = 0; waitAttempt < 30; waitAttempt++) {
          const hasPlaceIdentity = Boolean(document.querySelector('h1, [role="heading"], .DUwDvf, .fontHeadlineLarge'));
          const hasHoursSignal = Boolean(
            document.querySelector('[jsaction*="pane.openhours"], [jsaction*="openhours"], [data-item-id^="oh"], table')
          ) || /horario|horário|abre|fecha|aberto|fechado|open|closed/i.test(document.body?.innerText || '');
          if (hasPlaceIdentity && hasHoursSignal) break;
          await sleep(500);
        }

        // Expansao robusta dos horarios: o Google Maps alterna textos, acentos e aria-labels.
        // Se a semana estiver recolhida, normalmente so aparece o dia atual; aqui forcamos
        // os controles relacionados a horario antes do parser legado rodar.
        const readHoursControlText = (el) => String(
          el?.getAttribute?.('aria-label') ||
          el?.getAttribute?.('data-tooltip') ||
          el?.getAttribute?.('data-item-id') ||
          el?.textContent ||
          ''
        ).replace(/\s+/g, ' ').trim();

        const hoursDayKeysForExpansion = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        const robustHoursRowCount = () => {
          const tables = Array.from(document.querySelectorAll('table'));
          let best = 0;
          for (const table of tables) {
            const rows = Array.from(table.querySelectorAll('tr'));
            const count = rows.filter(row => {
              const text = normalizeHoursText(row.getAttribute('aria-label') || row.textContent || '');
              return hoursDayKeysForExpansion.some(day => text.includes(day));
            }).length;
            best = Math.max(best, count);
          }
          return best;
        };

        const isHoursExpansionControl = (el) => {
          const text = normalizeHoursText(readHoursControlText(el));
          const dataItem = normalizeHoursText(el?.getAttribute?.('data-item-id') || '');
          const jsAction = normalizeHoursText(el?.getAttribute?.('jsaction') || '');
          return (
            dataItem.startsWith('oh') ||
            /horario|funcionamento|hours|opening hours|open hours|abre|fecha|aberto|fechado|closed/.test(text) ||
            /openhours|pane\.openhours|hours/.test(jsAction)
          );
        };

        const clickHoursControl = async (el) => {
          const target = el?.closest?.('button, [role="button"], a') || el;
          if (!target) return;
          try { target.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
          await sleep(200);
          try { target.click(); } catch (_) {}
          try {
            target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          } catch (_) {}
          await sleep(900);
        };

        const getHoursExpansionCandidates = () => {
          const seen = new Set();
          const candidates = [];
          const add = (el) => {
            if (!el) return;
            const target = el.closest?.('button, [role="button"], a') || el;
            if (!target || seen.has(target)) return;
            if (!isHoursExpansionControl(target) && !isHoursExpansionControl(el)) return;
            seen.add(target);
            candidates.push(target);
          };
          [
            '*[data-item-id="oh"]',
            '*[data-item-id^="oh"]',
            'button[aria-expanded="false"]',
            '[role="button"][aria-expanded="false"]',
            'button[aria-label]',
            '[role="button"][aria-label]',
            'button[data-tooltip]',
            '[jsaction*="openhours"]',
            '[jsaction*="pane.openhours"]'
          ].forEach(selector => document.querySelectorAll(selector).forEach(add));
          Array.from(document.querySelectorAll('button, [role="button"], a')).forEach(el => {
            if (isHoursExpansionControl(el)) add(el);
          });
          const score = (el) => {
            const text = normalizeHoursText(readHoursControlText(el));
            const dataItem = normalizeHoursText(el?.getAttribute?.('data-item-id') || '');
            const jsAction = normalizeHoursText(el?.getAttribute?.('jsaction') || '');
            const rect = el.getBoundingClientRect?.() || { width: 9999, height: 9999 };
            let value = 0;
            if (/pane\.openhours|openhours/.test(jsAction)) value -= 120;
            if (dataItem.startsWith('oh')) value -= 90;
            if (el.getAttribute('aria-expanded') === 'false') value -= 70;
            if (/mostrar horario|mostrar horário|horario de funcionamento da semana|horário de funcionamento da semana|opening hours/.test(text)) value -= 50;
            if (/sugerir|editar|copy|copiar/.test(text)) value += 80;
            value += Math.min(60, Math.max(0, String(el.textContent || '').length / 8));
            value += Math.min(40, Math.max(0, (rect.width * rect.height) / 25000));
            return value;
          };
          return candidates.sort((a, b) => score(a) - score(b));
        };

        for (let attempt = 0; attempt < 4 && robustHoursRowCount() < 7; attempt++) {
          const candidates = getHoursExpansionCandidates();
          if (!candidates.length) break;
          for (const candidate of candidates.slice(0, 4)) {
            await clickHoursControl(candidate);
            if (robustHoursRowCount() >= 7) break;
          }
          if (panel) {
            try { panel.scrollTop = Math.max(0, panel.scrollTop - 180); } catch (_) {}
            await sleep(250);
            try { panel.scrollTop = panel.scrollTop + 360; } catch (_) {}
            await sleep(450);
          }
        }

        // 2. Tenta expandir a tabela de horários
        const isAlreadyExpanded = (() => {
          const tbl = document.querySelector('table.e25n6b') || document.querySelector('table[class*="hours"]');
          if (!tbl) return false;
          return tbl.querySelectorAll('tr').length > 2;
        })();

        if (!isAlreadyExpanded) {
          // Encontra o botão de expandir horários no Google Maps
          const ohElement = document.querySelector('*[data-item-id="oh"]') || 
                            document.querySelector('*[data-item-id^="oh"]');
          
          let expandBtn = null;
          if (ohElement) {
            expandBtn = ohElement.querySelector('[aria-expanded="false"]') || ohElement;
          } else {
            expandBtn = Array.from(document.querySelectorAll('*')).find(el => {
              const label = el.getAttribute('aria-label') || '';
              return label.toLowerCase().includes('horário de funcionamento da semana') ||
                     label.toLowerCase().includes('mostrar horário') ||
                     label.toLowerCase().includes('ocultar horário') ||
                     (el.className.includes('OazX1c') && el.textContent.trim().length <= 2);
            });
          }

          if (expandBtn) {
            try { expandBtn.click(); } catch(e) {}
            try {
              expandBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              expandBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            } catch(e) {}
            await sleep(1500); // Aguarda animação de dropdown
          }
        }

        // 3. Extrai a tabela de horários
        const findHoursTable = () => {
          const tables = Array.from(document.querySelectorAll('table'));
          const dayMappingKeys = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          for (const tbl of tables) {
            const text = normalizeHoursText(tbl.textContent);
            const hasDay = dayMappingKeys.some(day => text.includes(day));
            if (hasDay) return tbl;
          }
          return null;
        };

        const hoursTable = findHoursTable();
        const schedule = {};
        const dayMap = {
          'terca': 'tuesday',
          'segunda': 'monday', 'terça': 'tuesday', 'quarta': 'wednesday', 'quinta': 'thursday',
          'sexta': 'friday', 'sábado': 'saturday', 'sabado': 'saturday', 'domingo': 'sunday',
          'monday': 'monday', 'tuesday': 'tuesday', 'wednesday': 'wednesday', 'thursday': 'thursday',
          'friday': 'friday', 'saturday': 'saturday', 'sunday': 'sunday'
        };

        // Inicializa dias
        Object.values(dayMap).forEach(d => {
          schedule[d] = { isOpen: false, slots: [] };
        });

        let foundAny = false;
        const parsedDays = new Set();

        if (hoursTable) {
          const rows = Array.from(hoursTable.querySelectorAll('tr'));
          rows.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('td, th'));
            let dayCell = null;
            let timeCell = null;

            cells.forEach(cell => {
              const text = normalizeHoursText(cell.textContent);
              let isDay = false;
              for (const key of Object.keys(dayMap)) {
                if (text.startsWith(key)) {
                  isDay = true;
                  break;
                }
              }
              if (isDay) {
                dayCell = cell;
              } else if (text.match(/\d/) || text.includes('fechado') || text.includes('closed') || text.includes('24')) {
                timeCell = cell;
              }
            });

            if (dayCell && timeCell) {
              const dayRaw = normalizeHoursText(dayCell.textContent);
              const timeRaw = timeCell.textContent.trim();
              const normalizedTimeRaw = normalizeHoursText(timeRaw);

              let targetDay = null;
              for (const [key, val] of Object.entries(dayMap)) {
                if (dayRaw.startsWith(key)) {
                  targetDay = val;
                  break;
                }
              }

              if (targetDay) {
                foundAny = true;
                parsedDays.add(targetDay);
                if (normalizedTimeRaw.includes('fechado') || normalizedTimeRaw.includes('closed')) {
                  schedule[targetDay] = { isOpen: false, slots: [] };
                } else if (normalizedTimeRaw.includes('24 horas') || 
                           normalizedTimeRaw.includes('24h') || 
                           normalizedTimeRaw.includes('open 24 hours') ||
                           normalizedTimeRaw.includes('24 hours')) {
                  schedule[targetDay] = { isOpen: true, slots: [{ start: '00:00', end: '23:59' }] };
                } else {
                  const slots = timeRaw.split(/[,;]/).map(s => {
                    const times = s.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi) || s.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?/gi);
                    if (times && times.length === 2) {
                      const formatTime = (t) => {
                        let cleanT = t.trim().toUpperCase();
                        const isPM = cleanT.includes('PM');
                        const isAM = cleanT.includes('AM');
                        cleanT = cleanT.replace('AM', '').replace('PM', '').trim();
                        if (!cleanT.includes(':')) cleanT += ':00';
                        const parts = cleanT.split(':');
                        let hours = parseInt(parts[0], 10);
                        let minutes = parseInt(parts[1], 10);
                        if (isPM && hours < 12) hours += 12;
                        if (isAM && hours === 12) hours = 0;
                        const pad = (num) => String(num).padStart(2, '0');
                        return `${pad(hours)}:${pad(minutes)}`;
                      };
                      return { start: formatTime(times[0]), end: formatTime(times[1]) };
                    }
                    return null;
                  }).filter(Boolean);

                  schedule[targetDay] = {
                    isOpen: slots.length > 0,
                    slots: slots
                  };
                }
              }
            }
          });
        }

        // Fallback se não encontrou tabela estruturada
        if (!foundAny) {
          const allElements = Array.from(document.querySelectorAll('div, span, p, tr, li'));
          for (const el of allElements) {
            const text = el.textContent.trim();
            if (!text || text.length > 150) continue;
            const lowerText = normalizeHoursText(text);
            for (const [key, val] of Object.entries(dayMap)) {
              if (lowerText.startsWith(key) && (lowerText.includes(':') || lowerText.includes('–') || lowerText.includes('-') || lowerText.includes('fechado') || lowerText.includes('closed'))) {
                let timePart = text.substring(key.length).replace(/^[:\s\-\u2013\u2014]+/, '').trim();
                const normalizedTimePart = normalizeHoursText(timePart);
                if (timePart && timePart.length > 2) {
                  foundAny = true;
                  parsedDays.add(val);
                  if (normalizedTimePart.includes('fechado') || normalizedTimePart.includes('closed')) {
                    schedule[val] = { isOpen: false, slots: [] };
                  } else if (normalizedTimePart.includes('24 horas') || 
                             normalizedTimePart.includes('24h') || 
                             normalizedTimePart.includes('open 24 hours') ||
                             normalizedTimePart.includes('24 hours')) {
                    schedule[val] = { isOpen: true, slots: [{ start: '00:00', end: '23:59' }] };
                  } else {
                    const slots = timePart.split(/[,;]/).map(s => {
                      const times = s.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi) || s.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?/gi);
                      if (times && times.length === 2) {
                        const formatTime = (t) => {
                          let cleanT = t.trim().toUpperCase();
                          const isPM = cleanT.includes('PM');
                          const isAM = cleanT.includes('AM');
                          cleanT = cleanT.replace('AM', '').replace('PM', '').trim();
                          if (!cleanT.includes(':')) cleanT += ':00';
                          const parts = cleanT.split(':');
                          let hours = parseInt(parts[0], 10);
                          let minutes = parseInt(parts[1], 10);
                          if (isPM && hours < 12) hours += 12;
                          if (isAM && hours === 12) hours = 0;
                          const pad = (num) => String(num).padStart(2, '0');
                          return `${pad(hours)}:${pad(minutes)}`;
                        };
                        return { start: formatTime(times[0]), end: formatTime(times[1]) };
                      }
                      return null;
                    }).filter(Boolean);

                    schedule[val] = {
                      isOpen: slots.length > 0,
                      slots: slots
                    };
                  }
                }
              }
            }
          }
        }

        // 4. Extrai endereço, telefone, site e Instagram da página do Maps
        const extractedInfo = {};

        const compactText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const pageText = compactText(document.body?.innerText || '');
        const headingText = compactText(document.querySelector('h1, [role="heading"], .DUwDvf, .fontHeadlineLarge')?.textContent || '');
        const titleName = compactText((document.title || '').replace(/\s*[-–]\s*Google Maps\s*$/i, ''));
        const placeName = headingText || titleName;
        if (placeName) {
          extractedInfo.name = placeName;
          extractedInfo.title = placeName;
        }

        const closedPermanently = /permanentemente fechado|fechado permanentemente|permanently closed/i.test(pageText);
        const temporarilyClosed = /temporariamente fechado|fechado temporariamente|temporarily closed/i.test(pageText);
        if (closedPermanently || temporarilyClosed) {
          extractedInfo.businessStatus = closedPermanently ? 'permanently_closed' : 'temporarily_closed';
          extractedInfo.statusText = closedPermanently ? 'Permanentemente fechado' : 'Temporariamente fechado';
          extractedInfo.isPermanentlyClosed = closedPermanently;
        }

        const isBadCategoryCandidate = (text) => {
          const normalized = normalizeHoursText(text);
          return (
            !normalized ||
            normalized.length > 80 ||
            /^(foto|photos?|imagem|image|ver fotos?|adicionar foto|photo of|foto de|fotos de)\b/i.test(normalized) ||
            /^(rotas|directions|salvar|save|compartilhar|share|ligar|call|website|site|copiar|copy)\b/i.test(normalized) ||
            /google maps|comentarios?|avalia[cç][oõ]es?|reviews?|estrelas?|classifica[cç][aã]o/i.test(normalized)
          );
        };
        const categoryCandidates = Array.from(document.querySelectorAll('button[jsaction*="category"], .DkEaL, button[aria-label], a[aria-label], .fontBodyMedium'))
          .map(el => compactText(el.textContent || el.getAttribute('aria-label') || ''))
          .filter(text => Boolean(text) && !isBadCategoryCandidate(text));
        const categoryPattern = /restaurante|pizzaria|hamburgueria|burger|burguer|lanchonete|bar\b|caf[eé]|cafeteria|sorveteria|doceria|confeitaria|a[cç]a[ií]|churrascaria|esfiharia|sushi|japonesa|chinesa|asi[aá]tica|oriental|marmitaria|self service|buffet|pastelaria|padaria|bistr[oô]|cantina|frutos do mar|peixaria|mercado|supermercado|hotel|pousada|conveni[eê]ncia|barbearia|posto/i;
        const category = categoryCandidates.find(text => categoryPattern.test(text));
        if (category) extractedInfo.category = category;
        
        // Endereço - busca pelo botão/link com data-item-id="address"
        const addressEl = document.querySelector('*[data-item-id="address"]') || 
                          document.querySelector('button[data-tooltip="Copiar endereço"]');
        if (addressEl) {
          const addrText = addressEl.textContent.trim();
          if (addrText && addrText.length > 5) extractedInfo.address = addrText;
        }
        if (!extractedInfo.address) {
          // Fallback: busca por aria-label com endereço
          const addrBtn = Array.from(document.querySelectorAll('button[aria-label], a[aria-label]')).find(el => {
            const label = (el.getAttribute('aria-label') || '').toLowerCase();
            return label.includes('endereço:') || label.includes('address:');
          });
          if (addrBtn) {
            const label = addrBtn.getAttribute('aria-label') || '';
            const addrMatch = label.match(/(?:endereço|address):\s*(.+)/i);
            if (addrMatch) extractedInfo.address = addrMatch[1].trim();
          }
        }
        if (!extractedInfo.address) {
          // Fallback 2: busca por data-item-id que contenha "address"
          const addrEl2 = document.querySelector('[data-item-id*="address"]');
          if (addrEl2) {
            const txt = addrEl2.textContent.trim();
            if (txt.length > 5) extractedInfo.address = txt;
          }
        }
        
        // Telefone - busca pelo botão/link com data-item-id="phone"
        const phoneEl = document.querySelector('*[data-item-id^="phone"]') ||
                        document.querySelector('button[data-tooltip="Copiar número de telefone"]');
        if (phoneEl) {
          const phoneText = phoneEl.textContent.trim().replace(/[^\d\s\(\)\+\-]/g, '').trim();
          if (phoneText && phoneText.length >= 8) extractedInfo.phone = phoneText;
        }
        if (!extractedInfo.phone) {
          const phoneBtn = Array.from(document.querySelectorAll('button[aria-label], a[aria-label]')).find(el => {
            const label = (el.getAttribute('aria-label') || '').toLowerCase();
            return label.includes('telefone:') || label.includes('phone:');
          });
          if (phoneBtn) {
            const label = phoneBtn.getAttribute('aria-label') || '';
            const phoneMatch = label.match(/(?:telefone|phone):\s*(.+)/i);
            if (phoneMatch) extractedInfo.phone = phoneMatch[1].trim();
          }
        }
        
        // Site oficial
        const siteEl = document.querySelector('*[data-item-id="authority"]') ||
                       document.querySelector('a[data-item-id="authority"]');
        if (siteEl) {
          const href = siteEl.getAttribute('href') || siteEl.textContent.trim();
          const siteText = siteEl.textContent.trim();
          const isSocialOrChat = (value) => /instagram\.com|facebook\.com|wa\.me|whatsapp\.com/i.test(String(value || ''));
          if (href && href.startsWith('http') && !isSocialOrChat(href)) extractedInfo.website = href;
          else if (siteText.includes('.') && !isSocialOrChat(siteText)) extractedInfo.website = siteText;
        }
        
        // Links sociais (Instagram, Facebook, etc.)
        const socialLinks = [];
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        allLinks.forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href.includes('instagram.com/')) {
            const match = href.match(/instagram\.com\/([^/?]+)/);
            if (match) socialLinks.push({ platform: 'instagram', url: `https://www.instagram.com/${match[1]}/` });
          } else if (href.includes('facebook.com/')) {
            socialLinks.push({ platform: 'facebook', url: href });
          } else if (/wa\.me|whatsapp\.com/i.test(href)) {
            socialLinks.push({ platform: 'whatsapp', url: href });
          }
        });
        if (socialLinks.length > 0) {
          const seenSocial = new Set();
          extractedInfo.socialLinks = socialLinks.filter(item => {
            const key = String(item.platform || '') + ':' + String(item.url || '').toLowerCase().replace(/\/$/, '');
            if (seenSocial.has(key)) return false;
            seenSocial.add(key);
            return true;
          });
        }

        // Extrai fotos da galeria / capa
        const photos = [];
        const photoMeta = [];
        const imgElements = Array.from(document.querySelectorAll('button[aria-label^="Foto"] img, div[aria-label^="Foto"] img, img[decoding="async"], .gallery-image, img.gallery-image, div[role="img"], img[src*="googleusercontent.com/p/AF1Qip"]'));
        
        imgElements.forEach(img => {
          let src = img.getAttribute('src') || '';
          if (img.tagName.toLowerCase() === 'div') {
            const style = img.getAttribute('style') || '';
            const match = style.match(/url\(['"]?(.*?)['"]?\)/);
            if (match) src = match[1];
          }
          
          if (src && src.includes('googleusercontent.com/p/AF1Qip') && !src.includes('w50-h50') && !src.includes('w24-h24') && !src.includes('w36-h36')) {
            // Aumenta a resolução da imagem do google
            const cleanSrc = src.replace(/=w\d+-h\d+.*$/, '=s800');
            if (!photos.includes(cleanSrc)) {
              const container = img.closest('button, a, div[role="button"], div') || img.parentElement;
              const localText = (container?.innerText || container?.getAttribute?.('aria-label') || '').replace(/\s+/g, ' ').trim();
              const pageText = document.body?.innerText || '';
              const dateMatch = localText.match(/(?:hoje|ontem|h[áa]\s+\d+\s+(?:dia|dias|semana|semanas|m[eê]s|meses|ano|anos)|\d+\s+(?:dia|dias|semana|semanas|m[eê]s|meses|ano|anos)|20\d{2})/i)
                || pageText.slice(Math.max(0, pageText.indexOf(localText) - 500), pageText.indexOf(localText) + 500).match(/(?:hoje|ontem|h[áa]\s+\d+\s+(?:dia|dias|semana|semanas|m[eê]s|meses|ano|anos)|\d+\s+(?:dia|dias|semana|semanas|m[eê]s|meses|ano|anos)|20\d{2})/i);
              photos.push(cleanSrc);
              photoMeta.push({ image: cleanSrc, dateText: dateMatch ? dateMatch[0] : '', context: localText.slice(0, 180) });
            }
          }
        });
        
        if (photos.length > 0) {
          extractedInfo.coverImage = photos[0];
          extractedInfo.coverImageDateText = photoMeta[0]?.dateText || '';
          extractedInfo.galleryImages = photos.slice(1, 13);
          extractedInfo.galleryImageMeta = photoMeta.slice(1, 13);
          extractedInfo.galleryImageDates = photoMeta.slice(1, 13).map(item => item.dateText || '');
        }

        if (foundAny) {
          const canonicalDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const scheduleMissingDays = canonicalDays.filter(day => !parsedDays.has(day));
          return {
            success: true,
            schedule,
            scheduleDaysFound: parsedDays.size,
            scheduleMissingDays,
            scheduleIsWeekly: scheduleMissingDays.length === 0,
            ...extractedInfo
          };
        } else {
          // Mesmo sem horários, retorna os outros dados se encontrou algo
          const hasOtherData = extractedInfo.address || extractedInfo.phone || extractedInfo.website || (extractedInfo.socialLinks && extractedInfo.socialLinks.length > 0) || extractedInfo.coverImage;
          if (hasOtherData) {
            return { success: true, schedule: null, ...extractedInfo };
          }
          return { success: false, error: "Tabela de horários não encontrada na página do Google Maps." };
        }
      }
    });

    // Remove a aba logo em seguida
    await removeTabWithRetry(tabId);
    
    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    
    return { success: false, error: "Nenhum resultado retornado do script do Google Maps." };

  } catch (err) {
    console.error("Erro na captura de horários do Google Maps:", err);
    try { await removeTabWithRetry(tabId); } catch (_) {}
    return { success: false, error: err.message };
  }
}

async function handleSearchGoogleForMenu(query) {
  console.log("Iniciando busca por Cardápio para:", query);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const tab = await createTabWithRetry({ url: searchUrl, active: false });
  const tabId = tab.id;
  
  try {
    await waitForTabToComplete(tabId, 45000).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 1200));

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (searchQuery) => {
        const anchors = Array.from(document.querySelectorAll('#search a, a[href]'));
        const menuKeywords = [
          'goomer.app', 'pedir.to', 'ola.click', 'cardapio.menu', 'delivery',
          'menudigital', 'instamenu', 'abrahahot', 'tagme.com.br', 'wa.me',
          'api.whatsapp', 'cardapiomenu', 'comutat', 'cardapio', 'menu',
          'saipos.com', 'livemenu.app', 'anota.ai', 'ifood.com.br', 'aiqfome',
          'deliverymuch', 'menudino', 'olaclick'
        ];
        const blocked = ['google.com', 'instagram.com', 'facebook.com', 'youtube.com', 'tiktok.com', 'tripadvisor.', 'reclameaqui.', 'wikipedia.org'];
        const unsafeNonMenuUrlPattern = /casino|poker|bonus|bono|bet\b|betting|aposta|apostas|slot|slots|gambling|holdem|reward\s*code|cupom|coupon|cashback|fidelidade|loyalty|promocao|promocoes|promo|promotions?|pagamento|payment|wallet|voucher|gift|viagra|forex|crypto|binary|adult|escort|seo-spam|meta\.ai/i;
        const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');
        const queryTokens = normalize(searchQuery).split(/[^a-z0-9]+/).filter(token => token.length >= 4 && !['cardapio','menu','restaurante','delivery','pedido','oficial'].includes(token));
        const candidates = [];

        for (const a of anchors) {
          if (!a.href) continue;
          let url = a.href;
          try {
            const parsed = new URL(url);
            const wrapped = parsed.searchParams.get('url') || parsed.searchParams.get('q');
            if (parsed.hostname.includes('google.') && wrapped && /^https?:\/\//i.test(wrapped)) url = wrapped;
          } catch (_) {}
          const href = url.toLowerCase();
          if (blocked.some(domain => href.includes(domain))) continue;
          if (unsafeNonMenuUrlPattern.test(href)) continue;
          const label = (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim();
          const resultRoot = a.closest('div.g, div.MjjYud, div[data-sokoban-container], div[jscontroller], div[jsname]') || a.parentElement;
          const snippet = (resultRoot?.innerText || label || '').replace(/\s+/g, ' ').trim().slice(0, 900);
          const haystack = normalize(`${href} ${label} ${snippet}`);
          if (unsafeNonMenuUrlPattern.test(haystack)) continue;

          let score = 0;
          const reasons = ['google_search'];
          for (const kw of menuKeywords) {
            if (haystack.includes(normalize(kw))) { score += 35; reasons.push(`kw:${kw}`); }
          }
          for (const token of queryTokens) {
            if (haystack.includes(token)) score += 8;
          }
          if (/\b(?:whats(?:app)?|zap|wpp)\b|wa\.me|api\.whatsapp|(?:\+?55)?\s*\(?\d{2}\)?\s*9?\d{4}[-\s.]?\d{4}/i.test(snippet)) {
            score += 45;
            reasons.push('contact_hint');
          }
          if (/card[aá]pio|menu|pedido|delivery|pe[çc]a|comprar|loja/.test(haystack)) score += 25;
          if (score <= 0 && candidates.length < 5) score = 3;
          if (score > 0) candidates.push({ url, label: label || url, snippet, text: snippet, score, reasons });
        }

        return candidates
          .filter((candidate, index, list) => list.findIndex(other => other.url === candidate.url) === index)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
      },
      args: [query]
    });

    const candidates = results?.[0]?.result || [];
    if (candidates.length > 0) {
      return { success: true, url: candidates[0].url, candidates };
    }
    return { success: false, error: "Nenhum link de cardápio encontrado.", candidates: [] };
  } catch (err) {
    console.error("Erro na busca de cardápio:", err);
    return { success: false, error: err.message };
  } finally {
    try { await removeTabWithRetry(tabId); } catch(e) {}
  }
}


async function handleInstagramMenuLinkDiscovery(instagramUrl, restaurantName, city, neighborhood) {
  let tabId;
  const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const compactCity = normalize(city).replace(/\s+/g, '');
  const targetCity = normalize(city);
  const targetNeighborhood = normalize(neighborhood);
  const unsafeNonMenuUrlPattern = /casino|poker|bonus|bono|bet\b|betting|aposta|apostas|slot|slots|gambling|holdem|reward\s*code|cupom|coupon|cashback|fidelidade|loyalty|promocao|promocoes|promo|promotions?|pagamento|payment|wallet|voucher|gift|viagra|forex|crypto|binary|adult|escort|seo-spam|meta\.ai/i;
  const cleanUrl = raw => {
    let current = String(raw || '');
    try {
      for (let i = 0; i < 4; i++) {
        const parsed = new URL(current);
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
        const wrapped = parsed.searchParams.get('u') || parsed.searchParams.get('url') || parsed.searchParams.get('redirect_uri');
        if (!wrapped || !/(instagram\.com|facebook\.com|l\.instagram\.com)$/i.test(host)) break;
        current = decodeURIComponent(wrapped);
      }
    } catch (_) {}
    return current;
  };
  const isSafeCandidate = raw => {
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      if (['instagram.com','facebook.com','threads.net','threads.com','tiktok.com','x.com','twitter.com','youtube.com','meta.ai'].some(domain => host === domain || host.endsWith('.' + domain))) return false;
      if (/\/(?:promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty|pagamento|payment|wallet|orders?|checkout|cart)(?:\/|$|\?)/i.test(parsed.pathname + parsed.search)) return false;
      if (/[?&](?:tab|origin)=[^&]*(?:cashback|promo|cupom|coupon|fidelidade|payment|pagamento)/i.test(parsed.search)) return false;
      if (unsafeNonMenuUrlPattern.test(`${host} ${parsed.pathname} ${parsed.search}`.toLowerCase())) return false;
      return /^https?:$/.test(parsed.protocol);
    } catch (_) { return false; }
  };
  const rank = candidates => {
    const menuWords = ['cardapio','cardápio','menu','pedido','pedir','delivery','comprar'];
    const domains = ['saipos.com','anota.ai','goomer.app','goomer.com.br','livemenu.app','ola.click','ola.menu','cardapio','menu','msha.ke','linktr.ee','bio.link','beacons.ai','lnk.bio'];
    const dedup = [];
    for (const candidate of candidates) {
      const url = cleanUrl(candidate.url);
      if (!url || !isSafeCandidate(url)) continue;
      if (!dedup.some(item => item.url === url)) dedup.push({ ...candidate, url });
    }
    const ranked = dedup.map((candidate, index) => {
      const label = normalize(candidate.label);
      const url = normalize(candidate.url);
      let score = 0;
      const reasons = [];
      if (targetCity && label.includes(targetCity)) { score += 120; reasons.push('label_city'); }
      if (compactCity && url.includes(compactCity)) { score += 90; reasons.push('url_city'); }
      if (targetNeighborhood && (label.includes(targetNeighborhood) || url.includes(targetNeighborhood.replace(/\s+/g, '')))) { score += 35; reasons.push('neighborhood'); }
      if (menuWords.some(word => label.includes(normalize(word)))) { score += 25; reasons.push('menu_label'); }
      if (domains.some(domain => url.includes(domain))) { score += 25; reasons.push('delivery_domain'); }
      return { ...candidate, index, score, reasons };
    }).sort((a,b) => b.score - a.score);
    const top = ranked[0];
    if (!top) return { success: false, error: 'Nenhum candidato de cardápio encontrado.', candidates: [] };
    const confidence = top.score >= 100 ? 0.95 : top.score >= 60 ? 0.82 : 0.55;
    return { success: confidence >= 0.8, sourceUrl: top.url, sourceLabel: top.label, confidence, candidates: ranked.slice(0, 8), error: confidence >= 0.8 ? undefined : 'Candidato com baixa confiança.' };
  };
  try {
    const tab = await createTabWithRetry({ url: instagramUrl, active: true });
    tabId = tab.id;
    await waitForTabToComplete(tabId, 45000).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 1800));
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      func: targetCity => {
        const textOf = node => String(node?.innerText || node?.textContent || node?.getAttribute?.('aria-label') || node?.title || '').replace(/\s+/g, ' ').trim();
        const bestLabel = a => {
          const parts = [];
          const push = value => { const text = String(value || '').replace(/\s+/g, ' ').trim(); if (text && text.length <= 280 && !parts.includes(text)) parts.push(text); };
          push(textOf(a));
          let node = a.parentElement;
          for (let depth = 0; node && node !== document.body && depth < 6; depth++, node = node.parentElement) {
            push(textOf(node));
            for (const sibling of Array.from(node.parentElement?.children || []).slice(0, 8)) push(textOf(sibling));
          }
          const city = String(targetCity || '').toLowerCase();
          return parts.sort((x,y) => (y.toLowerCase().includes(city) ? 1 : 0) - (x.toLowerCase().includes(city) ? 1 : 0))[0] || '';
        };
        const collect = root => Array.from(root.querySelectorAll('a[href]')).map(a => ({ url: a.href, label: bestLabel(a) }));
        let candidates = collect(document);
        const buttons = Array.from(document.querySelectorAll('button,[role="button"],a,div,span')).filter(el => /links?|e mais|and \d+ more/i.test(textOf(el))).slice(0, 5);
        for (const btn of buttons) { try { btn.click(); } catch (_) {} }
        return new Promise(resolve => setTimeout(() => {
          const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], [aria-modal="true"]'));
          for (const dialog of dialogs) candidates = candidates.concat(collect(dialog));
          resolve(candidates);
        }, 1400));
      },
      args: [city || '']
    });
    const candidates = injected?.[0]?.result || [];
    return rank(candidates);
  } finally {
    if (tabId !== undefined) try { await removeTabWithRetry(tabId); } catch (_) {}
  }
}

async function handleMenuScrapeFromInstagram(instagramUrl, restaurantName, city, neighborhood, sender) {
  console.log('[Extension] Iniciando fluxo completo de cardápio via Instagram:', instagramUrl, 'City:', city, 'Neighborhood:', neighborhood);
  
  let tabId;
  let profileContactText = '';
  let bioHubContactText = '';
  const readVisibleTabText = async (maxChars = 5000) => {
    if (tabId === undefined) return '';
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: (limit) => String(document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, limit),
        args: [maxChars]
      });
      return result?.[0]?.result || '';
    } catch (_) {
      return '';
    }
  };
  const buildContactEvidence = (extra = {}) => ({
    instagramProfileText: profileContactText,
    instagramBioHubText: bioHubContactText,
    ...extra
  });
  const waitForVisibleTabReady = async (phaseLabel, timeoutMs = 45000) => {
    try {
      await waitForTabToComplete(tabId, timeoutMs);
      return true;
    } catch (error) {
      console.warn(`[Extension] ${phaseLabel}: timeout aguardando carregamento completo; seguindo com DOM parcial.`, error?.message || error);
      try {
        const state = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => ({
            url: location.href,
            title: document.title,
            bodyLength: document.body?.innerText?.length || 0,
            anchorCount: document.querySelectorAll('a[href]').length,
            readyState: document.readyState,
          })
        });
        const snapshot = state?.[0]?.result;
        if (snapshot?.bodyLength || snapshot?.anchorCount) return false;
      } catch (_) {}
      throw error;
    }
  };
  try {
    const tab = await createTabWithRetry({ url: instagramUrl, active: true });
    tabId = tab.id;
    
    await waitForVisibleTabReady('Instagram perfil');
    await new Promise(r => setTimeout(r, 1000));
    profileContactText = await readVisibleTabText(5000);
    
    let bioLink = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async (targetCity, targetNeighborhood) => {
        const pageText = (document.body?.innerText || '').toLowerCase();
        const loginRequired = !!document.querySelector('input[name="username"], input[name="password"]') || /log in|entrar no instagram|faça login|entre para continuar/i.test(pageText.slice(0, 5000));
        if (loginRequired) return { requiresHuman: true, blocker: 'instagram_login', message: 'Faça login no Instagram na aba aberta para liberar os links da bio.' };
        return new Promise((resolve) => {
          const deliveryDomains = [
            'saipos.com', 'anota.ai', 'goomer.app', 'goomer.com.br', 'linktr.ee',
            'msha.ke', 'bio.link', 'beacons.ai', 'lnk.bio', 'livemenu.app', 'livemenu', 'ola.menu', 'wa.me',
            'whatsapp.com', 'cardapio.digital', 'instadelivery.com.br',
            'menu.com.br', 'meumenu.com'
          ];

          const normalize = str => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
          const normCity = normalize(targetCity);
          const normNeighborhood = normalize(targetNeighborhood);
          const unsafeNonMenuUrlPattern = /casino|poker|bonus|bono|bet\b|betting|aposta|apostas|slot|slots|gambling|holdem|reward\s*code|cupom|coupon|cashback|fidelidade|loyalty|promocao|promocoes|promo|promotions?|pagamento|payment|wallet|voucher|gift|viagra|forex|crypto|binary|adult|escort|seo-spam|meta\.ai/i;

          const isKnownMenuOrHubUrl = (url) => {
            const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
            const pathname = (url.pathname || '').toLowerCase();
            const pathAndSearch = `${pathname}${url.search || ''}`;
            if (/^(msha\.ke|linktr\.ee|bio\.link|beacons\.ai|lnk\.bio|taplink\.cc)$/.test(hostname) || hostname.endsWith('.linktr.ee')) return true;
            if ((hostname === 'pedido.anota.ai' || hostname.endsWith('.anota.ai')) && (pathname.startsWith('/loja/') || pathname.startsWith('/login') || pathname.startsWith('/m/'))) return true;
            if ((hostname.includes('saipos.com') || hostname.includes('livemenu.app') || hostname.includes('goomer') || hostname.includes('ola.click') || hostname.includes('ola.menu')) && !/\/(?:cart|checkout|payment|pagamento|wallet|promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty)(?:\/|$|\?)/i.test(pathAndSearch)) return true;
            if (hostname.includes('cardapio') || hostname.includes('menu')) return true;
            return false;
          };

          const cleanUrl = (url) => {
            if (!url) return '';
            let cleaned = url;
            try {
              for (let pass = 0; pass < 3; pass++) {
                const parsed = new URL(cleaned);
                const redirect = parsed.searchParams.get('u') || parsed.searchParams.get('url') || parsed.searchParams.get('redirect_uri');
                if (!redirect || !/(?:instagram\.com|facebook\.com)$/i.test(parsed.hostname.replace(/^www\./, ''))) break;
                cleaned = decodeURIComponent(redirect);
              }
            } catch (e) {}
            return cleaned;
          };

          const isExternalLink = (href) => {
            if (!href) return false;
            try {
              const url = new URL(href);
              const hostname = url.hostname.toLowerCase();
              if (['instagram.com', 'threads.net', 'threads.com', 'facebook.com', 'tiktok.com', 'x.com', 'twitter.com', 'youtube.com', 'meta.ai'].some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
                return false;
              }
              if (isKnownMenuOrHubUrl(url)) {
                return true;
              }
              if (/\/(?:promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty|pagamento|payment|wallet|orders?|checkout|cart)(?:\/|$|\?)/i.test(url.pathname + url.search)) {
                return false;
              }
              if (/[?&](?:tab|origin)=[^&]*(?:cashback|promo|cupom|coupon|fidelidade|payment|pagamento)/i.test(url.search)) {
                return false;
              }
              if (unsafeNonMenuUrlPattern.test(`${hostname} ${url.pathname} ${url.search}`.toLowerCase())) {
                return false;
              }
              return true;
            } catch (e) {
              return false;
            }
          };

          const parseCandidates = (anchors) => {
            const candidates = [];
            const bestLabelFor = (a) => {
              const parts = [];
              const push = value => {
                const text = String(value || '').replace(/\s+/g, ' ').trim();
                if (text && text.length <= 260 && !parts.includes(text)) parts.push(text);
              };
              push(a.innerText || a.textContent || a.getAttribute('aria-label') || a.title);
              let node = a.parentElement;
              for (let depth = 0; node && node !== document.body && depth < 6; depth++, node = node.parentElement) {
                push(node.innerText || node.textContent || node.getAttribute?.('aria-label'));
                const siblings = Array.from(node.parentElement?.children || []).slice(0, 8);
                for (const sibling of siblings) push(sibling.innerText || sibling.textContent || sibling.getAttribute?.('aria-label'));
              }
              return parts.sort((left, right) => {
                const score = text => (normCity && normalize(text).includes(normCity) ? 100 : 0) + (/card[aá]pio|menu|pedido|delivery/i.test(text) ? 30 : 0) - Math.min(text.length, 180) / 1000;
                return score(right) - score(left);
              })[0] || '';
            };
            for (const a of anchors) {
              const href = cleanUrl(a.href || '');
              if (!href || !isExternalLink(href)) continue;
              const label = bestLabelFor(a);
              if (!candidates.some(c => c.url === href)) {
                candidates.push({ label, url: href });
              }
            }
            return candidates;
          };

          const findSelectedUrl = (candidates) => {
            if (candidates.length === 0) return null;
            const menuWords = ['cardapio', 'cardápio', 'menu', 'pedido', 'pedir', 'delivery', 'comprar'];
            const deliveryDomains = ['saipos.com', 'anota.ai', 'goomer.app', 'goomer.com.br', 'livemenu.app', 'ola.click', 'ola.menu', 'cardapio', 'menu', 'msha.ke', 'linktr.ee', 'bio.link', 'beacons.ai', 'lnk.bio'];
            const ranked = candidates.map((candidate, index) => {
              const label = normalize(candidate.label);
              const url = normalize(candidate.url);
              let score = 0;
              const reasons = [];
              if (normCity && label.includes(normCity)) { score += 100; reasons.push('label_city'); }
              else if (normCity && url.includes(normCity.replace(/\s+/g, ''))) { score += 75; reasons.push('url_city'); }
              if (normNeighborhood && (label.includes(normNeighborhood) || url.includes(normNeighborhood.replace(/\s+/g, '')))) { score += 30; reasons.push('neighborhood'); }
              if (menuWords.some(word => label.includes(normalize(word)))) { score += 25; reasons.push('menu_label'); }
              if (deliveryDomains.some(domain => url.includes(domain))) { score += 20; reasons.push('delivery_domain'); }
              return { ...candidate, index, score, reasons };
            }).sort((a, b) => b.score - a.score);
            const top = ranked[0];
            const gap = top.score - (ranked[1]?.score || 0);
            const confidence = top.score >= 100 && gap >= 30 ? 0.99 : top.score >= 70 && gap >= 20 ? 0.9 : top.score >= 45 && gap >= 15 ? 0.85 : 0.5;
            const compactCandidates = ranked.map(({ index, label, url, score, reasons }) => ({ index, label, url, score, reasons }));
            return { url: top.url, label: top.label, confidence, requiresAi: compactCandidates.length > 1 && confidence < 0.85, candidates: compactCandidates, profileContext: (document.querySelector('header')?.innerText || '').slice(0, 2000) };
          };

          const findMultipleLinksButton = () => {
            const elements = [...document.querySelectorAll('button, [role="button"], a'), ...document.querySelectorAll('div, span')];
            for (const el of elements) {
              const text = (el.textContent || '').trim();
              if (!text || text.length > 220) continue;
              const hasMoreText = /and \d+ more/i.test(text) || /e mais \d+/i.test(text) || /^links?$/i.test(text);
              if (!hasMoreText) continue;
              
              const hasLinkText = text.toLowerCase().includes('link');
              const svg = el.querySelector('svg');
              const hasLinkIcon = svg && (
                (svg.getAttribute('aria-label') || '').toLowerCase().includes('link') ||
                svg.querySelector('title')?.textContent.toLowerCase().includes('link') ||
                Array.from(svg.attributes).some(attr => attr.value.toLowerCase().includes('link'))
              );
              
              if (hasLinkText || hasLinkIcon) {
                let clickable = el;
                while (clickable && clickable !== document.body) {
                  if (clickable.tagName === 'BUTTON' || clickable.getAttribute('role') === 'button' || clickable.onclick) {
                    return clickable;
                  }
                  clickable = clickable.parentElement;
                }
                return el;
              }
            }
            return null;
          };

          const scanProfileHeader = () => {
            const header = document.querySelector('header');
            const container = header || document;
            return parseCandidates(Array.from(container.querySelectorAll('a')));
          };

          const closeDialog = (dialog) => {
            const closeEl = dialog.querySelector('button[aria-label*="Close" i], button[aria-label*="Fechar" i], button[aria-label*="cancel" i], button[aria-label*="fechar" i]');
            if (closeEl) {
              closeEl.click();
              return;
            }
            
            const svgs = Array.from(dialog.querySelectorAll('svg'));
            for (const svg of svgs) {
              const ariaLabel = (svg.getAttribute('aria-label') || '').toLowerCase();
              if (ariaLabel.includes('close') || ariaLabel.includes('fechar') || ariaLabel.includes('cancel')) {
                const parentBtn = svg.closest('button');
                if (parentBtn) {
                  parentBtn.click();
                  return;
                }
                svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                return;
              }
            }
            
            let overlay = dialog.parentElement;
            while (overlay && overlay !== document.body) {
              if (overlay.getAttribute('role') === 'presentation' || overlay.className.includes('backdrop') || overlay.className.includes('overlay')) {
                overlay.click();
                return;
              }
              overlay = overlay.parentElement;
            }
            if (dialog.parentElement) {
              dialog.parentElement.click();
            }
          };

          const multiLinkButton = findMultipleLinksButton();
          if (multiLinkButton) {
            console.log('Multi-link button found, clicking it...');
            multiLinkButton.click();

            const observer = new MutationObserver((mutations, obs) => {
              const dialog = document.querySelector('div[role="dialog"]');
              if (dialog) {
                obs.disconnect();
                setTimeout(() => {
                  const candidates = parseCandidates(Array.from(dialog.querySelectorAll('a')));
                  const selectedUrl = findSelectedUrl(candidates);
                  closeDialog(dialog);
                  resolve(selectedUrl);
                }, 800);
              }
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true
            });

            setTimeout(() => {
              observer.disconnect();
              const dialog = document.querySelector('div[role="dialog"]');
              if (dialog) {
                const candidates = parseCandidates(Array.from(dialog.querySelectorAll('a')));
                const selectedUrl = findSelectedUrl(candidates);
                closeDialog(dialog);
                resolve(selectedUrl);
              } else {
                const fallbackCandidates = scanProfileHeader();
                resolve(findSelectedUrl(fallbackCandidates));
              }
            }, 5000);
          } else {
            const candidates = scanProfileHeader();
            resolve(findSelectedUrl(candidates));
          }
        });
      },
      args: [city, neighborhood]
    });
    
    const discovery = bioLink && bioLink[0] && bioLink[0].result;
    if (discovery?.requiresHuman) {
      await updateTabWithRetry(tabId, { active: true });
      return { success: false, requiresHuman: true, blocker: discovery.blocker, error: discovery.message, tabId };
    }
    if (!discovery) {
      await updateTabWithRetry(tabId, { active: true });
      return { success: false, requiresHuman: true, blocker: 'instagram_links_unavailable', error: 'Links da bio indisponíveis. Verifique a sessão do Instagram na aba aberta.', tabId };
    }

    let decision = discovery;
    if (decision.requiresAi && decision.candidates?.length) {
      try {
        const origin = sender?.url ? new URL(sender.url).origin : '';
        if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
          const response = await fetch(origin + '/api/local-collector/ai-chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemContext: 'Escolha o link de cardápio correspondente à cidade. Nunca escolha redes sociais. Responda SOMENTE JSON: {"selected_index":numero,"confidence":0_a_1,"reason":"curto"}.',
              message: JSON.stringify({ restaurantName, city, neighborhood, profileContext: decision.profileContext || '', candidates: decision.candidates })
            })
          });
          const payload = await response.json();
          const jsonMatch = String(payload.reply || '').match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(jsonMatch?.[0] || '{}');
          const selected = decision.candidates.find(candidate => candidate.index === Number(parsed.selected_index));
          if (selected && Number(parsed.confidence) >= 0.8) decision = { ...selected, confidence: Number(parsed.confidence), reason: parsed.reason, requiresAi: false };
        }
      } catch (error) {
        console.warn('[Extension] Árbitro textual indisponível:', error.message);
      }
    }
    if (decision.requiresAi || !decision.url) {
      await updateTabWithRetry(tabId, { active: true });
      return { success: false, requiresHuman: true, blocker: 'ambiguous_menu_links', candidates: decision.candidates, error: 'Não foi possível escolher o cardápio com confiança suficiente.', tabId };
    }
    const isKnownNativeMenuPlatformUrl = (value) => {
      try {
        const parsed = new URL(value || '');
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
        const pathname = parsed.pathname.toLowerCase();
        const pathAndQuery = `${pathname}${parsed.search}`;
        if ((host === 'pedido.anota.ai' || host.endsWith('.anota.ai')) && (pathname.startsWith('/loja/') || pathname.startsWith('/m/') || (pathname.startsWith('/login') && parsed.searchParams.get('access_token')))) return true;
        if (host.includes('saipos.com') && !/\/(?:cart|checkout|payment|pagamento|wallet|promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty)(?:\/|$|\?)/i.test(pathAndQuery)) return true;
        if ((host.includes('livemenu.app') || host.includes('goomer') || host.includes('ola.click') || host.includes('ola.menu')) && !/\/(?:cart|checkout|payment|pagamento|wallet|promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty)(?:\/|$|\?)/i.test(pathAndQuery)) return true;
        return false;
      } catch (_) {
        return false;
      }
    };

    const isLinkHubDestinationUrl = (value) => {
      try {
        const host = new URL(value || '').hostname.replace(/^www\./, '').toLowerCase();
        return /^(msha\.ke|linktr\.ee|bio\.link|linktree\.com|beacons\.ai|lnk\.bio|taplink\.cc)$/.test(host) || host.endsWith('.linktr.ee');
      } catch (_) {
        return false;
      }
    };

    const decodeWrappedExternalUrl = (value) => {
      let current = String(value || '');
      try {
        for (let i = 0; i < 4; i++) {
          const parsed = new URL(current);
          const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
          const wrapped = parsed.searchParams.get('u') || parsed.searchParams.get('url') || parsed.searchParams.get('redirect_uri') || parsed.searchParams.get('target');
          if (!wrapped || !/(^|\.)instagram\.com$|(^|\.)facebook\.com$|(^|\.)google\./i.test(host)) break;
          current = decodeURIComponent(wrapped);
        }
      } catch (_) {}
      return current;
    };

    const isBlockedNonMenuDestinationUrl = (value) => {
      try {
        const parsed = new URL(value || '');
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
        const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
        if (['meta.ai', 'meta.com', 'about.meta.com'].some(domain => host === domain || host.endsWith('.' + domain))) return true;
        if (isKnownNativeMenuPlatformUrl(value) || isLinkHubDestinationUrl(value)) return false;
        if (/\/(?:promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty|pagamento|payment|wallet|orders?|checkout|cart)(?:\/|$|\?)/i.test(pathAndQuery)) return true;
        if (/[?&](?:tab|origin)=[^&]*(?:cashback|promo|cupom|coupon|fidelidade|payment|pagamento)/i.test(pathAndQuery)) return true;
        return unsafeNonMenuUrlPattern.test(`${host} ${pathAndQuery}`);
      } catch (_) {
        return true;
      }
    };

    let externalUrl = decision.url;
    const sourceLabel = decision.label || '';
    const selectionConfidence = Number(decision.confidence || 0);
    const sourceChain = [];
    const recordSourceUrl = (value) => {
      const cleaned = decodeWrappedExternalUrl(value);
      if (/^https?:\/\//i.test(cleaned) && !sourceChain.includes(cleaned)) sourceChain.push(cleaned);
      return cleaned;
    };
    const waitForSettledExternalUrl = async (label, maxMs = 9000) => {
      let current = recordSourceUrl(externalUrl);
      let lastChangeAt = Date.now();
      const startedAt = Date.now();
      while (Date.now() - startedAt < maxMs) {
        try {
          const currentTab = await chrome.tabs.get(tabId);
          const nextUrl = currentTab?.url && /^https?:\/\//i.test(currentTab.url)
            ? recordSourceUrl(currentTab.url)
            : current;
          if (nextUrl && nextUrl !== current) {
            current = nextUrl;
            lastChangeAt = Date.now();
          }
          if (isKnownNativeMenuPlatformUrl(current)) break;
          if (isBlockedNonMenuDestinationUrl(current)) break;
          if (!isLinkHubDestinationUrl(current) && Date.now() - lastChangeAt > 1500) break;
        } catch (_) {}
        await new Promise(r => setTimeout(r, 500));
      }
      console.log(`[Extension] Destino resolvido (${label}):`, current);
      externalUrl = current;
      return current;
    };

    console.log('[Extension] Link encontrado na bio:', externalUrl);
    
    externalUrl = recordSourceUrl(externalUrl);

    if (isBlockedNonMenuDestinationUrl(externalUrl)) {
      await updateTabWithRetry(tabId, { active: true });
      return { success: false, requiresHuman: true, blocker: 'invalid_menu_destination', sourceUrl: externalUrl, sourceChain, error: 'O link escolhido na bio nao e um cardapio publicavel.', tabId };
    }
    
    await updateTabWithRetry(tabId, { url: externalUrl });
    await waitForVisibleTabReady('Link externo da bio');
    await waitForSettledExternalUrl('link da bio');
    bioHubContactText = await readVisibleTabText(5000);
    
    const shouldInspectInternalLinks = isLinkHubDestinationUrl(externalUrl) || !isKnownNativeMenuPlatformUrl(externalUrl);
    if (shouldInspectInternalLinks) {
      const startedFromKnownHub = isLinkHubDestinationUrl(externalUrl);
      console.log('[Extension] Ponte/hub da bio detectado. Procurando botao interno de cardapio/unidade...');
      let nextLink = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        args: [city, neighborhood],
        func: (targetCity, targetNeighborhood) => {
          const anchors = Array.from(document.querySelectorAll('a'));
          const keywords = ['cardapio', 'cardápio', 'menu', 'pedido', 'pedir', 'ifood', 'delivery', 'comprar'];
          const normalize = value => String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          const compact = value => normalize(value).replace(/\s+/g, '');
          const city = normalize(targetCity || '');
          const compactCity = compact(targetCity || '');
          const neighborhood = normalize(targetNeighborhood || '');
          const isKnownMenuPlatformHref = (href) => {
            try {
              const url = new URL(href || '');
              const host = url.hostname.replace(/^www\./, '').toLowerCase();
              const pathAndQuery = `${url.pathname}${url.search}`.toLowerCase();
              if ((host === 'pedido.anota.ai' || host.endsWith('.anota.ai')) && (url.pathname.toLowerCase().startsWith('/loja/') || url.pathname.toLowerCase().startsWith('/m/') || url.pathname.toLowerCase().startsWith('/login'))) return true;
              if (/saipos|livemenu|ola\.click|ola\.menu|goomer|cardapio|menu/i.test(host) && !/\/(?:cart|checkout|payment|pagamento|wallet|promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty)(?:\/|$|\?)/i.test(pathAndQuery)) return true;
              return false;
            } catch (_) {
              return false;
            }
          };
          const isBlockedHubHref = (href) => {
            try {
              const url = new URL(href || '');
              const host = url.hostname.replace(/^www\./, '').toLowerCase();
              const pathAndQuery = `${url.pathname}${url.search}`.toLowerCase();
              if (['instagram.com', 'threads.net', 'threads.com', 'facebook.com', 'tiktok.com', 'x.com', 'twitter.com', 'youtube.com', 'meta.ai', 'meta.com', 'about.meta.com'].some(domain => host === domain || host.endsWith('.' + domain))) return true;
              if (isKnownMenuPlatformHref(href)) return false;
              if (/\/(?:share|sharer|intent|login|auth|account|cart|checkout|promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty|pagamento|payment|wallet|orders?|wp-json|feed\b|tag\/|author\/|category\/(?:bookkeeping|contabilidade|blog|noticias|news))|[?&](?:share|u|url)=https?%3a|[?&](?:tab|origin)=[^&]*(?:cashback|promo|cupom|coupon|fidelidade|payment|pagamento)/i.test(pathAndQuery)) return true;
              return /casino|poker|bonus|bono|bet\b|betting|aposta|apostas|slot|slots|gambling|holdem|reward\s*code|cupom|coupon|cashback|fidelidade|loyalty|promocao|promocoes|promo|promotions?|pagamento|payment|wallet|voucher|gift|viagra|forex|crypto|binary|adult|escort|seo-spam|meta\.ai/i.test(`${host} ${pathAndQuery}`);
            } catch (_) {
              return true;
            }
          };
          const ranked = anchors
            .map((a, index) => {
              const text = normalize(a.innerText || a.textContent || a.getAttribute('aria-label') || a.title || '');
              const href = String(a.href || '');
              const normalizedHref = normalize(href);
              let score = 0;
              if (city && (text.includes(city) || normalizedHref.includes(compactCity))) score += 120;
              if (neighborhood && (text.includes(neighborhood) || normalizedHref.includes(compact(neighborhood)))) score += 35;
              if (keywords.some(k => text.includes(normalize(k)) || normalizedHref.includes(normalize(k)))) score += 35;
              if (/saipos|livemenu|ola\.click|olaclick|anota|ifood|goomer|menudino|aiqfome|cardapio|menu/i.test(href)) score += 25;
              return { href, index, score };
            })
            .filter(item => /^https?:\/\//i.test(item.href) && !isBlockedHubHref(item.href) && item.score > 0)
            .sort((a, b) => b.score - a.score);
          if (ranked[0]?.href) return ranked[0].href;
          for (const a of anchors) {
            const text = (a.innerText || a.textContent || '').toLowerCase();
            const href = (a.href || '').toLowerCase();
            if (!isBlockedHubHref(a.href || '') && keywords.some(k => text.includes(k) || href.includes(k))) return a.href;
          }
          return null;
        }
      });
      let targetUrl = nextLink && nextLink[0] && nextLink[0].result;
      if (targetUrl) {
        targetUrl = recordSourceUrl(targetUrl);
        if (isBlockedNonMenuDestinationUrl(targetUrl)) {
          await updateTabWithRetry(tabId, { active: true });
          return { success: false, requiresHuman: true, blocker: 'invalid_menu_destination', sourceUrl: targetUrl, sourceChain, error: `O botao escolhido no hub nao e um cardapio publicavel: ${targetUrl}`, tabId };
        }
        externalUrl = targetUrl;
        console.log('[Extension] Botao de cardapio encontrado na ponte da bio:', targetUrl);
        await updateTabWithRetry(tabId, { url: targetUrl });
        await waitForVisibleTabReady('Botao interno do hub de links');
        await waitForSettledExternalUrl('botao interno da bio');
        bioHubContactText = await readVisibleTabText(5000);
        if (isBlockedNonMenuDestinationUrl(externalUrl)) {
          await updateTabWithRetry(tabId, { active: true });
          return { success: false, requiresHuman: true, blocker: 'invalid_menu_destination', sourceUrl: externalUrl, sourceChain, error: 'O destino final do hub nao e um cardapio publicavel.', tabId };
        }
      } else if (startedFromKnownHub) {
        await updateTabWithRetry(tabId, { active: true });
        return { success: false, requiresHuman: true, blocker: 'menu_link_not_confirmed_in_hub', sourceUrl: externalUrl, sourceChain, error: 'Nenhum botao de cardapio/unidade foi confirmado no hub da bio.', tabId };
      }
    }
    
    if (isKnownNativeMenuPlatformUrl(externalUrl)) {
      await removeTabWithRetry(tabId);
      return {
        success: true,
        rawText: 'Known native menu platform selected from Instagram bio.',
        sourceUrl: externalUrl,
        sourceChain,
        sourceLabel,
        contactEvidence: buildContactEvidence({ sourceLabel, sourceChain }),
        selectionConfidence,
        discoveryMethod: 'instagram_bio_city_match'
      };
    }

    const isAnotaAccessTokenMenuUrl = (value) => {
      try {
        const parsed = new URL(value);
        return parsed.hostname.toLowerCase().endsWith('anota.ai')
          && parsed.pathname.toLowerCase().startsWith('/login')
          && Boolean(parsed.searchParams.get('access_token'));
      } catch (_) {
        return false;
      }
    };

    if (isAnotaAccessTokenMenuUrl(externalUrl)) {
      await removeTabWithRetry(tabId);
      return {
        success: true,
        rawText: 'Anota AI public access-token menu link selected from Instagram bio.',
        sourceUrl: externalUrl,
        sourceChain,
        sourceLabel,
        contactEvidence: buildContactEvidence({ sourceLabel, sourceChain }),
        selectionConfidence,
        discoveryMethod: 'instagram_bio_city_match'
      };
    }

    try {
      const isAnotaAiBeforeVisualClicks = await detectAnotaAiInTab(tabId);
      if (isAnotaAiBeforeVisualClicks) {
        console.log('[Extension] Anota AI detectado antes de cliques visuais. Usando API nativa sem navegar em Promos/Cashback...');
        const slug = await getSlugFromTab(tabId);
        if (slug) {
          const apiRes = await fetch('https://api.anota.ai/v1/menu/merchant?slug=' + slug);
          if (apiRes.ok) {
            const json = await apiRes.json();
            const parsedMenu = parseAnotaAiMenu(json);
            if (parsedMenu) {
              await removeTabWithRetry(tabId);
              return { success: true, parsedMenu, sourceUrl: externalUrl, sourceChain, sourceLabel, contactEvidence: buildContactEvidence({ sourceLabel, sourceChain }), selectionConfidence, discoveryMethod: 'instagram_bio_city_match' };
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Extension] Falha na deteccao Anota AI antes dos cliques visuais:', e?.message || e);
    }

    console.log('[Extension] Na página do cardápio. Expandindo categorias de forma conservadora...');
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const selectors = [
          '.accordion', '.category-header', '[aria-expanded="false"]', '[data-toggle="collapse"]', 
          '.MuiAccordionSummary-root', '[class*="category"]', '[class*="Category"]', '[class*="accordion"]', 
          '[class*="group-header"]', '[class*="MenuHeader"]'
        ].join(', ');
        document.querySelectorAll(selectors).forEach(el => { try { if(el.getAttribute('aria-expanded') !== 'true') el.click(); } catch(e){} });
        window.scrollTo(0, document.body.scrollHeight);
      }
    });
    
    await waitForVisibleTabReady('Pagina final do cardapio');
    await new Promise(r => setTimeout(r, 1000));
    
    try {
      const isAnotaAi = await detectAnotaAiInTab(tabId);
      if (isAnotaAi) {
        console.log('[Extension] Anota AI detectado! Tentando API nativa...');
        const slug = await getSlugFromTab(tabId);
        if (slug) {
          const apiRes = await fetch('https://api.anota.ai/v1/menu/merchant?slug=' + slug);
          if (apiRes.ok) {
            const json = await apiRes.json();
            const parsedMenu = parseAnotaAiMenu(json);
            if (parsedMenu) {
              await removeTabWithRetry(tabId);
              return { success: true, parsedMenu, sourceUrl: externalUrl, sourceChain, sourceLabel, contactEvidence: buildContactEvidence({ sourceLabel, sourceChain }), selectionConfidence, discoveryMethod: 'instagram_bio_city_match' };
            }
          }
        }
      }
    } catch(e) {}
    
    let domText = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => document.body.innerText
    });
    
    const rawText = domText && domText[0] && domText[0].result || '';
    const priceMatches = rawText.match(/(?:R\$\s*)?\d{1,4}[.,]\d{2}/g) || [];
    const socialDestination = /(?:instagram|threads|facebook|tiktok|twitter|youtube)\.com|meta\.ai/i.test(externalUrl);
    if (socialDestination || isBlockedNonMenuDestinationUrl(externalUrl) || rawText.length < 200 || priceMatches.length < 3) {
      await updateTabWithRetry(tabId, { active: true });
      return { success: false, requiresHuman: true, blocker: 'invalid_menu_destination', sourceUrl: externalUrl, sourceChain, error: 'O destino escolhido não foi confirmado como cardápio.', tabId };
    }
    await removeTabWithRetry(tabId);
    return { success: true, rawText, sourceUrl: externalUrl, sourceChain, sourceLabel, contactEvidence: buildContactEvidence({ sourceLabel, sourceChain }), selectionConfidence, discoveryMethod: 'instagram_bio_city_match' };
    
  } catch (err) {
    console.error('Erro no handleMenuScrapeFromInstagram:', err);
    if (tabId !== undefined) {
      try { await removeTabWithRetry(tabId); } catch(e){}
    }
    return { success: false, error: err.message };
  }
}

// Function injected into target tab page context to clean cookie popups and overlays
function closeCookiePopupsAndOverlays() {
  const keywords = ['cookie', 'consent', 'lgpd', 'gdpr', 'privacy', 'privacidade', 'banner', 'popup', 'modal', 'overlay', 'dialog'];
  const allElements = Array.from(document.querySelectorAll('*'));
  const candidates = [];
  
  for (const el of allElements) {
    if (!el.tagName || ['HTML', 'BODY', 'SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    
    const idStr = (el.id || '').toLowerCase();
    const classStr = el.className || '';
    const classNameStr = (typeof classStr === 'string' ? classStr : '').toLowerCase();
    const roleStr = (el.getAttribute('role') || '').toLowerCase();
    
    const matchesKeyword = keywords.some(kw => 
      idStr.includes(kw) || 
      classNameStr.includes(kw) || 
      roleStr.includes(kw)
    );
    
    let isFixedOrAbsolute = false;
    let hasHighZ = false;
    try {
      const style = window.getComputedStyle(el);
      isFixedOrAbsolute = style.position === 'fixed' || style.position === 'absolute';
      const zIndex = parseInt(style.zIndex, 10);
      hasHighZ = !isNaN(zIndex) && zIndex > 50;
    } catch (e) {}
    
    if (matchesKeyword || (isFixedOrAbsolute && hasHighZ)) {
      const buttons = Array.from(el.querySelectorAll('button, [role="button"], a'));
      let clicked = false;
      const acceptTextKeywords = ['aceitar', 'accept', 'permitir', 'entendi', 'close', 'fechar', 'agree', 'ok', 'okay', 'concordo'];
      
      for (const btn of buttons) {
        const btnText = (btn.textContent || '').trim().toLowerCase();
        if (acceptTextKeywords.some(kw => btnText.includes(kw))) {
          btn.click();
          clicked = true;
          break;
        }
      }
      
      if (!clicked) {
        el.style.setProperty('display', 'none', 'important');
      } else {
        candidates.push(el);
      }
    }
  }
  
  document.body.style.setProperty('overflow', 'auto', 'important');
  document.documentElement.style.setProperty('overflow', 'auto', 'important');
}

// Function to handle tab activation and screenshot capture
async function handleCaptureTab(tabId) {
  console.log(`[Extension] Iniciando captura de tela para a aba ${tabId}...`);
  
  // Force tab focus/activity to enable tab capture
  await chrome.tabs.update(tabId, { active: true });
  await new Promise(r => setTimeout(r, 800)); // wait for layout paint
  
  // Clean popups/banners
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: closeCookiePopupsAndOverlays
    });
  } catch (err) {
    console.warn(`[Extension] Erro ao remover overlays:`, err.message);
  }
  
  await new Promise(r => setTimeout(r, 400));
  
  // Get active window
  const tab = await new Promise((resolve) => {
    chrome.tabs.get(tabId, resolve);
  });
  const windowId = tab ? tab.windowId : chrome.windows.WINDOW_ID_CURRENT;
  
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 80 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!dataUrl) {
        reject(new Error("Falha ao capturar a aba."));
      } else {
        resolve({ success: true, dataUrl });
      }
    });
  });
}
