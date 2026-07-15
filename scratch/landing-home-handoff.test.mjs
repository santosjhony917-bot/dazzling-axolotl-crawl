import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer';

const origin = process.env.APP_ORIGIN || 'http://localhost:8080';
const browserUrl = process.env.BROWSER_URL || 'http://127.0.0.1:9223';

test('landing demo hands the same prompt to the Home composer', async () => {
  const browser = await puppeteer.connect({ browserURL: browserUrl });
  try {
    const pages = await browser.pages();
    const page = pages[0] ?? await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('mockSession', JSON.stringify({
        user: { id: 'mock-customer-user-id', email: 'cliente@teste.com' },
        profile: {
          id: 'mock-customer-user-id',
          email: 'cliente@teste.com',
          first_name: 'Gabriel',
          last_name: 'Silva',
          role: 'authenticated',
        },
        restaurant: null,
      }));
      localStorage.setItem('filterfood_feature_tour_completed', 'true');
      sessionStorage.removeItem('filterfood_pending_prompt');
    });

    await page.goto(`${origin}/landing`, { waitUntil: 'networkidle0' });
    const handoffButton = 'button[aria-label="Levar esta pergunta demonstrativa ao aplicativo"]';
    await page.waitForSelector(handoffButton, { visible: true });
    const expectedPrompt = await page.$eval('[data-demo-results]', (results) => {
      const conversation = results.closest('[aria-live="polite"]');
      const userBubble = conversation?.querySelector('.justify-end');
      return userBubble?.textContent?.trim() ?? '';
    });
    assert.ok(expectedPrompt.length > 0);

    await page.click(handoffButton);
    await page.waitForFunction(() => location.pathname === '/home' && location.search.includes('assistant=1'));
    await page.waitForSelector('[data-menu-composer="true"]', { visible: true });
    const composerValue = await page.$eval('[data-menu-composer="true"]', (element) => element.value);
    const pendingPrompt = await page.evaluate(() => sessionStorage.getItem('filterfood_pending_prompt'));

    assert.equal(composerValue, expectedPrompt);
    assert.equal(pendingPrompt, null);
  } finally {
    await browser.disconnect();
  }
});
