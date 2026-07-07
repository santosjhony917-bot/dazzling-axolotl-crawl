const puppeteer = require('puppeteer');

const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const url = process.argv[2];
if (!url) throw new Error('Usage: node scratch/probe-maps-visible.cjs <google-maps-url>');

(async () => {
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 8000));
    const summary = await page.evaluate(() => {
      const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const text = String(document.body?.innerText || '');
      const lines = text.split('\n').map(compact).filter(Boolean).slice(0, 260);
      const picked = Array.from(document.querySelectorAll('h1, h2, h3, button, a[href], [aria-label], [data-item-id]'))
        .map((el) => ({
          tag: el.tagName,
          role: el.getAttribute('role') || '',
          item: el.getAttribute('data-item-id') || '',
          aria: compact(el.getAttribute('aria-label') || '').slice(0, 260),
          text: compact(el.innerText || el.textContent).slice(0, 260),
          href: el.href || '',
        }))
        .filter((item) => item.text || item.aria || item.item)
        .slice(0, 220);
      return {
        url: location.href,
        title: document.title,
        textExcerpt: compact(text).slice(0, 6000),
        lines,
        picked,
      };
    });
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
