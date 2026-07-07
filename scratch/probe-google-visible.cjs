const puppeteer = require('puppeteer');

const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const query = process.argv.slice(2).join(' ') || 'Imperio dos Salgados Campina Grande PB';

(async () => {
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const summary = await page.evaluate(() => {
      const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const text = String(document.body?.innerText || '');
      const lines = text.split('\n').map(compact).filter(Boolean).slice(0, 220);
      const picked = Array.from(document.querySelectorAll('[data-attrid], [role="heading"], h1, h2, h3, a[href], span'))
        .map((el) => ({
          tag: el.tagName,
          role: el.getAttribute('role') || '',
          attrid: el.getAttribute('data-attrid') || '',
          aria: el.getAttribute('aria-label') || '',
          text: compact(el.innerText || el.textContent).slice(0, 220),
          href: el.href || '',
        }))
        .filter((item) => item.text || item.attrid || item.aria)
        .slice(0, 160);
      return {
        url: location.href,
        title: document.title,
        textExcerpt: compact(text).slice(0, 5000),
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
