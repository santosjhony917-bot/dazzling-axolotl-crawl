import fs from 'node:fs';
import puppeteer from 'puppeteer';

const targets = [
  {
    name: 'Porto do acai',
    url: 'https://meucarrinho.delivery/portodoacai',
    probes: ['ACAI M (ACAI TRADICIONAL)', 'ACAI G (TRADICIONAL)', 'GELATTO G (Creme de Ninho)'],
  },
  {
    name: 'Sushiyaki',
    url: 'https://delivery.yooga.app/sushiyaki',
    probes: ['Temaki de kani', 'Temaki pasta de salmão', 'Big hot de kani'],
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

async function clickText(page, needle) {
  return await page.evaluate((targetText) => {
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const wanted = normalize(targetText);
    const elements = Array.from(document.querySelectorAll('button, a, [role="button"], div, article, section'))
      .filter((element) => {
        const text = normalize(element.innerText || element.textContent || '');
        if (!text.includes(wanted)) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 20 && rect.height > 10;
      })
      .sort((left, right) => {
        const lr = left.getBoundingClientRect();
        const rr = right.getBoundingClientRect();
        return (lr.width * lr.height) - (rr.width * rr.height);
      });
    const hit = elements[0];
    if (!hit) return false;
    hit.scrollIntoView({ block: 'center', inline: 'center' });
    hit.click();
    return true;
  }, needle);
}

async function inspectTarget(browser, target) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const results = [];
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(4000);
    for (let i = 0; i < 8; i += 1) {
      await page.evaluate(() => window.scrollBy(0, Math.floor(window.innerHeight * 0.75))).catch(() => null);
      await sleep(500);
    }
    for (const probe of target.probes) {
      await page.keyboard.press('Escape').catch(() => null);
      await sleep(500);
      const clicked = await clickText(page, probe);
      await sleep(2500);
      const text = await page.evaluate(() => {
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .modal, [class*="modal"], [class*="drawer"], [class*="Dialog"], [class*="dialog"]'));
        const visible = dialogs
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 50 && rect.height > 50;
          })
          .map((element) => element.innerText || element.textContent || '')
          .join('\n\n');
        return visible || document.body.innerText || '';
      });
      results.push({
        probe,
        clicked,
        modalText: clean(text).slice(0, 5000),
      });
    }
  } finally {
    await page.close().catch(() => null);
  }
  return results;
}

const browser = await puppeteer.connect({
  browserURL: process.env.FF_CDP_URL || 'http://127.0.0.1:9224',
  defaultViewport: null,
});

const output = {};
try {
  for (const target of targets) {
    output[target.name] = await inspectTarget(browser, target);
  }
} finally {
  await browser.disconnect().catch(() => null);
}

const outputPath = 'scratch/porto-sushiyaki-modal-options-inspect.json';
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
console.log(JSON.stringify({ outputPath, output }, null, 2));
