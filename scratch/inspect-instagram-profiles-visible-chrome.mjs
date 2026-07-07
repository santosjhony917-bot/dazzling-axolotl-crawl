import puppeteer from 'puppeteer';

const browserUrl = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const urls = process.argv.slice(2).filter(Boolean);

if (urls.length === 0) {
  console.error('Usage: node scratch/inspect-instagram-profiles-visible-chrome.mjs <instagram-url> [...]');
  process.exit(1);
}

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const browser = await puppeteer.connect({ browserURL: browserUrl, defaultViewport: null });
const page = await browser.newPage();

try {
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 4500));

    await page.evaluate(() => {
      const labels = ['mais', 'more'];
      const elements = Array.from(document.querySelectorAll('button, [role="button"], span, div'));
      for (const element of elements) {
        const text = (element.textContent || '').trim().toLowerCase();
        if (labels.includes(text)) {
          element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
      }
    }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const data = await page.evaluate(() => {
      const meta = (name) =>
        document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')
        || document.querySelector(`meta[property="${name}"]`)?.getAttribute('content')
        || '';
      const links = Array.from(document.querySelectorAll('a[href]')).map((a) => ({
        text: (a.textContent || '').trim(),
        href: a.href,
      }));
      const visibleText = document.body?.innerText || '';
      return {
        url: location.href,
        title: document.title,
        description: meta('description'),
        ogDescription: meta('og:description'),
        text: visibleText,
        links,
      };
    });

    console.log(JSON.stringify({
      inputUrl: url,
      finalUrl: data.url,
      title: clean(data.title),
      description: clean(data.description),
      ogDescription: clean(data.ogDescription),
      textExcerpt: clean(data.text).slice(0, 1800),
      links: data.links
        .map((link) => ({ text: clean(link.text), href: link.href }))
        .filter((link) => link.href && !link.href.startsWith('https://www.instagram.com/p/'))
        .slice(0, 30),
    }, null, 2));
  }
} finally {
  await page.close().catch(() => {});
  await browser.disconnect();
}
