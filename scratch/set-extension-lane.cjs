const puppeteer = require('puppeteer');

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};

const laneId = argValue('--lane', process.env.FF_LANE_ID || process.env.FILTERFOOD_LANE_ID || args[0] || 'default');
const port = Number(argValue('--port', process.env.FF_CDP_PORT || '')) || null;
const browserURL = argValue('--browser-url', process.env.FF_CDP_URL || (port ? `http://127.0.0.1:${port}` : args[1]) || 'http://127.0.0.1:9224');
const extensionId = process.env.FF_EXTENSION_ID || 'kehbedmdplkodjgfiohgnebicblmhghe';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureWorker(browser) {
  let target = browser.targets().find((candidate) =>
    candidate.type() === 'service_worker'
    && candidate.url().startsWith(`chrome-extension://${extensionId}/`)
  );
  if (target) return target.worker();

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
      const items = Array.from(list?.querySelectorAll('extensions-item') || []);
      const item = items.find((candidate) => candidate.id === id);
      const reload = item?.shadowRoot?.querySelector('#dev-reload-button')
        || item?.shadowRoot?.querySelector('[id*="reload"]')
        || item?.shadowRoot?.querySelector('cr-icon-button[iron-icon="extensions:reload"]');
      reload?.click();
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }, extensionId);
  } finally {
    await page.close().catch(() => {});
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sleep(500);
    target = browser.targets().find((candidate) =>
      candidate.type() === 'service_worker'
      && candidate.url().startsWith(`chrome-extension://${extensionId}/`)
    );
    if (target) return target.worker();
  }
  throw new Error(`Extension service worker not found for ${extensionId}.`);
}

(async () => {
  const browser = await puppeteer.connect({ browserURL, defaultViewport: null });
  try {
    const worker = await ensureWorker(browser);
    const result = await worker.evaluate(async (value) => {
      const normalize = (input) => String(input || '')
        .trim()
        .replace(/[^A-Za-z0-9_.:-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'default';
      const lane = normalize(value);
      if (chrome.storage?.local?.set) {
        await chrome.storage.local.set({ ffLaneId: lane });
      }
      if (typeof setExtensionLaneId === 'function') await setExtensionLaneId(lane);
      if (typeof pollExtensionCommands === 'function') await pollExtensionCommands();
      return {
        laneId: lane,
        manifestVersion: chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : null,
        hasPoll: typeof pollExtensionCommands,
      };
    }, laneId);
    console.log(JSON.stringify({ success: true, browserURL, extensionId, ...result }, null, 2));
  } finally {
    await browser.disconnect();
  }
})().catch((error) => {
  console.error(JSON.stringify({ success: false, browserURL, extensionId, laneId, error: error.message || String(error) }, null, 2));
  process.exitCode = 1;
});
