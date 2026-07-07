const puppeteer = require('puppeteer');

const EXTENSION_ID = process.env.FF_EXTENSION_ID || 'kehbedmdplkodjgfiohgnebicblmhghe';
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';

(async () => {
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
    console.log(JSON.stringify({ clicked }));
    await page.close().catch(() => {});
  } finally {
    await browser.disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
