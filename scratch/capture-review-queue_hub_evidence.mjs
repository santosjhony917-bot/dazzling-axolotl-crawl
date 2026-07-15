import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const queuePath = 'scratch/menu-collection-queue/2026-07-15T07-14-13-007Z/review_queue.json';
const outDir = path.join('scratch', 'review-hub-evidence', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(outDir, { recursive: true });

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const targets = [
  'f47d114d-363a-4c85-916c-0694d4d95826',
  '5970dd5d-c5da-4304-ade8-f74a7bd6bfc0',
  '1a77a6bb-ba4b-47f5-bcbe-a01566803f39',
  'fe21b6fb-7a96-4f67-9631-4603652e92c0',
  'af51b9b9-3eec-428d-a9a0-61d1c6fc2205',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1800 });

const results = [];
for (const id of targets) {
  const row = queue.find((entry) => entry.restaurant_id === id);
  if (!row) continue;
  const slug = `${row.platform}-${row.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const targetDir = path.join(outDir, slug);
  fs.mkdirSync(targetDir, { recursive: true });
  const url = row.source_url;
  const entry = { id, name: row.name, platform: row.platform, url };
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(2000);
    const text = await page.evaluate(() => {
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      return clean(document.body?.innerText || '');
    });
    const html = await page.content();
    const screenshotPath = path.join(targetDir, 'page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    fs.writeFileSync(path.join(targetDir, 'page.html'), html, 'utf8');
    fs.writeFileSync(path.join(targetDir, 'visible-text.txt'), text, 'utf8');
    fs.writeFileSync(path.join(targetDir, 'meta.json'), JSON.stringify({
      ...entry,
      finalUrl: page.url(),
      title: await page.title(),
      textLength: text.length,
      screenshotPath,
    }, null, 2), 'utf8');
    results.push({ ...entry, finalUrl: page.url(), title: await page.title(), textLength: text.length, status: 'captured' });
  } catch (error) {
    fs.writeFileSync(path.join(targetDir, 'error.txt'), String(error?.message || error), 'utf8');
    results.push({ ...entry, status: 'error', error: String(error?.message || error) });
  }
}

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(results, null, 2), 'utf8');
await page.close().catch(() => {});
await browser.disconnect();
console.log(JSON.stringify({ outDir, results }, null, 2));
