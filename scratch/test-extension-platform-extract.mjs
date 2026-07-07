import puppeteer from 'puppeteer';

const browserUrl = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const extensionId = process.env.FF_EXTENSION_ID || 'kehbedmdplkodjgfiohgnebicblmhghe';
const url = process.argv[2] || 'https://app.cardapioweb.com/restaurante_barrigacheia';

const browser = await puppeteer.connect({ browserURL: browserUrl, defaultViewport: null });
let page;

try {
  page = await browser.newPage();
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const result = await page.evaluate(async ({ extensionId, url }) => {
    return await new Promise((resolve) => {
      if (!globalThis.chrome?.runtime?.sendMessage) {
        resolve({
          success: false,
          error: 'chrome.runtime.sendMessage indisponivel',
          chromeKeys: Object.keys(globalThis.chrome || {}),
        });
        return;
      }
      chrome.runtime.sendMessage(extensionId, { action: 'extractMenuPlatform', url }, (response) => {
        const error = chrome.runtime.lastError?.message;
        resolve(error ? { success: false, error } : response);
      });
    });
  }, { extensionId, url });

  const itemCount = (result.categories || []).reduce((sum, category) => sum + ((category.items || []).length || 0), 0);
  console.log(JSON.stringify({
    success: result.success,
    platform: result.platform,
    categoryCount: (result.categories || []).length,
    itemCount,
    error: result.error || null,
    metrics: result.metrics || null,
    firstCategory: (result.categories || [])[0] || null,
  }, null, 2));
} finally {
  if (page) await page.close().catch(() => {});
  await browser.disconnect();
}
