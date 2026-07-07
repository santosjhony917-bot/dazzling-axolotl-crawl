const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};

const laneId = argValue('--lane', process.env.FF_LANE_ID || 'default');
const port = Number(argValue('--port', process.env.FF_CDP_PORT || '9224')) || 9224;
const extensionDir = path.resolve(argValue('--extension-dir', 'public/chrome-extension'));
const profileDir = path.resolve(argValue('--profile-dir', path.join('.tmp', 'chrome-lanes', laneId)));
const startUrl = argValue('--url', 'http://127.0.0.1:8080/admin/expansion');
const waitLogins = args.includes('--wait-logins');
const waitTimeoutMin = argValue('--timeout-min', '20');
const freshProfile = args.includes('--fresh');

function chromeCandidates() {
  return [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright\\chromium-*\\chrome-win64\\chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright\\chromium-*\\chrome-win\\chrome.exe'),
    'C:\\Program Files\\Google\\Chrome for Testing\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ].filter(Boolean);
}

function findChrome() {
  for (const candidate of chromeCandidates()) {
    if (candidate.includes('*')) {
      const [base, rest] = candidate.split('*');
      const parent = path.dirname(base);
      const prefix = path.basename(base);
      if (!fs.existsSync(parent)) continue;
      const match = fs.readdirSync(parent)
        .filter((name) => name.startsWith(prefix))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
        .map((name) => path.join(parent, name, rest.replace(/^[/\\]/, '')))
        .find((file) => fs.existsSync(file));
      if (match) return match;
      continue;
    }
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function waitForCdp(browserURL, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${browserURL}/json/version`);
      if (response.ok) return true;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Chrome lane did not expose CDP at ${browserURL}`);
}

async function setLane(browserURL) {
  const extensionId = process.env.FF_EXTENSION_ID || 'kehbedmdplkodjgfiohgnebicblmhghe';
  const browser = await puppeteer.connect({ browserURL, defaultViewport: null });
  try {
    const page = await browser.newPage();
    try {
      await page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('extensions-manager', { timeout: 10000 });
      await page.evaluate(async (id) => {
        const manager = document.querySelector('extensions-manager');
        const root = manager?.shadowRoot;
        const toolbarRoot = root?.querySelector('extensions-toolbar')?.shadowRoot;
        const devToggle = toolbarRoot?.querySelector('#devMode')
          || toolbarRoot?.querySelector('cr-toggle')
          || toolbarRoot?.querySelector('[role="switch"]');
        const devEnabled = Boolean(devToggle?.checked)
          || devToggle?.getAttribute?.('aria-pressed') === 'true'
          || devToggle?.getAttribute?.('aria-checked') === 'true';
        if (devToggle && !devEnabled) {
          devToggle.click();
          await new Promise((resolve) => setTimeout(resolve, 1400));
        }
        const list = root?.querySelector('extensions-item-list')?.shadowRoot;
        const item = Array.from(list?.querySelectorAll('extensions-item') || []).find((candidate) => candidate.id === id);
        const reload = item?.shadowRoot?.querySelector('#dev-reload-button')
          || item?.shadowRoot?.querySelector('[id*="reload"]')
          || item?.shadowRoot?.querySelector('cr-icon-button[iron-icon="extensions:reload"]');
        reload?.click();
        await new Promise((resolve) => setTimeout(resolve, 1600));
      }, extensionId).catch(() => {});
    } finally {
      await page.close().catch(() => {});
    }

    let worker = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const target = browser.targets().find((candidate) =>
        candidate.type() === 'service_worker'
        && candidate.url().startsWith(`chrome-extension://${extensionId}/`)
      );
      worker = target ? await target.worker() : null;
      if (worker) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!worker) throw new Error(`Extension worker not found for ${extensionId}.`);
    return await worker.evaluate(async (value) => {
      const lane = String(value || 'default')
        .trim()
        .replace(/[^A-Za-z0-9_.:-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'default';
      if (chrome.storage?.local?.set) {
        await chrome.storage.local.set({ ffLaneId: lane });
      }
      if (typeof setExtensionLaneId === 'function') await setExtensionLaneId(lane);
      return { laneId: lane, manifestVersion: chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : null };
    }, laneId);
  } finally {
    await browser.disconnect();
  }
}

(async () => {
  if (!fs.existsSync(extensionDir)) throw new Error(`Extension dir not found: ${extensionDir}`);
  const laneRoot = path.resolve('.tmp', 'chrome-lanes');
  const resolvedProfileDir = path.resolve(profileDir);
  if (freshProfile) {
    if (!resolvedProfileDir.startsWith(laneRoot + path.sep)) {
      throw new Error(`Refusing --fresh outside ${laneRoot}: ${resolvedProfileDir}`);
    }
    fs.rmSync(resolvedProfileDir, { recursive: true, force: true });
  }
  fs.mkdirSync(profileDir, { recursive: true });
  const chrome = findChrome();
  if (!chrome) throw new Error('Chrome executable not found. Set CHROME_PATH.');
  const browserURL = `http://127.0.0.1:${port}`;
  const chromeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-popup-blocking',
    startUrl,
  ];
  const child = spawn(chrome, chromeArgs, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  await waitForCdp(browserURL);
  const lane = await setLane(browserURL);
  if (waitLogins) {
    const waiter = spawn(process.execPath, [
      path.join('scratch', 'wait-lane-logins.cjs'),
      `--lane=${laneId}`,
      `--port=${port}`,
      `--timeout-min=${waitTimeoutMin}`,
    ], {
      cwd: process.cwd(),
      stdio: 'inherit',
      windowsHide: true,
    });
    const exitCode = await new Promise((resolve) => waiter.on('close', resolve));
    if (exitCode !== 0) throw new Error(`Login wait failed for lane ${laneId} with code ${exitCode}`);
  }
  console.log(JSON.stringify({
    success: true,
    laneId: lane.laneId,
    port,
    browserURL,
    profileDir,
    extensionDir,
    manifestVersion: lane.manifestVersion,
    chrome,
    freshProfile,
  }, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    laneId,
    port,
    profileDir,
    extensionDir,
    error: error.message || String(error),
  }, null, 2));
  process.exitCode = 1;
});
