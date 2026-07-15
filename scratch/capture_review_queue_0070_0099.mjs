import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const queuePath = 'scratch/menu-collection-queue/2026-07-15T07-39-16-880Z/review_queue.json';
const outDir = path.join('scratch', 'review-0070-0099', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(outDir, { recursive: true });

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const targets = [
  '2bb68c33-f674-41db-ad52-11cc11d75e17',
  '7485e019-b7fa-4e2a-8007-39597daf088e',
  '1367d441-365d-4cad-b89c-b275a1f88d65',
  '7054b6f0-48d2-4d49-89a0-eec7f2fb3022',
  '97798ebe-a15b-45cb-8f9d-5df63f5cdefb',
];

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1800 });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const results = [];
for (const id of targets) {
  const row = queue.find((entry) => entry.restaurant_id === id);
  if (!row) continue;
  const slug = `${row.platform}-${row.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
  const dir = path.join(outDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  const evidence = { id, name: row.name, platform: row.platform, url: row.source_url };
  try {
    await page.goto(row.source_url, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1500);
    const visibleText = await page.evaluate(() => {
      const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
      return clean(document.body?.innerText || '');
    });
    const html = await page.content();
    const screenshotPath = path.join(dir, 'page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    fs.writeFileSync(path.join(dir, 'page.html'), html, 'utf8');
    fs.writeFileSync(path.join(dir, 'visible-text.txt'), visibleText, 'utf8');
    const confirmed = [row.name, row.city, row.address?.split(',')[0], row.address?.split('-')[1]?.trim()].filter(Boolean);
    const confirmationHits = confirmed.filter((token) => visibleText.includes(token)).length;
    const safe = confirmationHits >= 2 && visibleText.includes(row.city);
    const payload = {
      ...evidence,
      finalUrl: page.url(),
      title: await page.title(),
      textLength: visibleText.length,
      confirmationHits,
      safe,
      screenshotPath,
    };
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(payload, null, 2), 'utf8');
    results.push(payload);
  } catch (error) {
    fs.writeFileSync(path.join(dir, 'error.txt'), String(error?.message || error), 'utf8');
    results.push({ ...evidence, status: 'error', error: String(error?.message || error) });
  }
}

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(results, null, 2), 'utf8');
await page.close().catch(() => {});
await browser.disconnect();
console.log(JSON.stringify({ outDir, results }, null, 2));
