import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const queuePath = 'scratch/menu-collection-queue/2026-07-15T07-44-29-632Z/review_queue.json';
const outDir = path.join('scratch', 'review-0100-0149', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(outDir, { recursive: true });

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const targets = [
  'acc661fa-da1f-469f-8229-fcb7ee2e8127',
  '7b6a905e-bdf7-43b8-b7b6-5913d40183b0',
  '599b2a3f-5866-41d4-a58f-7cc9af281baa',
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
  try {
    await page.goto(row.source_url, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1500);
    const visibleText = await page.evaluate(() => {
      const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
      return clean(document.body?.innerText || '');
    });
    const html = await page.content();
    await page.screenshot({ path: path.join(dir, 'page.png'), fullPage: true });
    fs.writeFileSync(path.join(dir, 'page.html'), html, 'utf8');
    fs.writeFileSync(path.join(dir, 'visible-text.txt'), visibleText, 'utf8');
    const hits = [row.name, row.city, row.address?.split(',')[0], row.address?.split('-')[1]?.trim()].filter(Boolean)
      .filter((token) => visibleText.includes(token)).length;
    const payload = {
      id,
      name: row.name,
      platform: row.platform,
      source_url: row.source_url,
      finalUrl: page.url(),
      title: await page.title(),
      textLength: visibleText.length,
      confirmationHits: hits,
      safe: hits >= 2 && visibleText.includes(row.city),
      dir,
    };
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(payload, null, 2), 'utf8');
    results.push(payload);
  } catch (error) {
    fs.writeFileSync(path.join(dir, 'error.txt'), String(error?.message || error), 'utf8');
    results.push({ id, name: row.name, platform: row.platform, source_url: row.source_url, status: 'error', error: String(error?.message || error) });
  }
}

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(results, null, 2), 'utf8');
await page.close().catch(() => {});
await browser.disconnect();
console.log(JSON.stringify({ outDir, results }, null, 2));
