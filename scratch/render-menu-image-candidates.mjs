import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const TARGET_IDS = [
  '17c67464-7f14-4f6a-b07c-855f9c9a4593',
  'eeb4213a-a5a1-4286-a33f-b6fea80cb891',
  'dd73fc2d-69a5-4a76-8e1e-7aa2b68f7869',
  '9aed5c42-1ab1-47f0-9010-788da722a399',
  'a123251e-ae13-4a7a-8725-a54b3bdd2d66',
];
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'menu-image-candidates', RUN_ID);
const TILE_W = 190;
const TILE_H = 190;
const GAP = 10;
const COLUMNS = 5;

function readEnv() {
  const env = { ...process.env };
  if (!fs.existsSync('.env')) return env;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function imageDataUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

async function hydrate(items) {
  const out = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      try {
        out[index] = { ...item, dataUrl: await imageDataUrl(item.image_url) };
      } catch (error) {
        out[index] = { ...item, error: error.message };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, items.length) }, worker));
  return out;
}

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

fs.mkdirSync(OUT_DIR, { recursive: true });

const { data, error } = await supabase
  .from('menu_items')
  .select('id,name,image_url,order_index,menu_categories!inner(restaurant_id,restaurants!inner(name))')
  .in('menu_categories.restaurant_id', TARGET_IDS)
  .not('image_url', 'is', null)
  .neq('image_url', '')
  .order('order_index');
if (error) throw error;

const grouped = new Map();
for (const row of data || []) {
  const restaurantId = row.menu_categories.restaurant_id;
  if (!grouped.has(restaurantId)) grouped.set(restaurantId, []);
  if (grouped.get(restaurantId).length < 8) grouped.get(restaurantId).push(row);
}
const items = [...grouped.values()].flat();
const loaded = await hydrate(items);

const rows = Math.ceil(loaded.length / COLUMNS);
const width = (COLUMNS * TILE_W) + ((COLUMNS + 1) * GAP);
const headerH = 70;
const height = headerH + (rows * TILE_H) + ((rows + 1) * GAP);
const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; width: ${width}px; min-height: ${height}px; font-family: Arial, sans-serif; background: #f3f4f6; color: #111827; }
      .header { height: ${headerH}px; padding: 12px; background: #111827; color: #fff; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
      .title { font-size: 20px; font-weight: 800; }
      .meta { font-size: 12px; color: #d1d5db; }
      .grid { display: grid; grid-template-columns: repeat(${COLUMNS}, ${TILE_W}px); gap: ${GAP}px; padding: ${GAP}px; }
      .card { width: ${TILE_W}px; height: ${TILE_H}px; border-radius: 6px; overflow: hidden; background: #fff; position: relative; box-shadow: 0 1px 4px rgba(17,24,39,.2); }
      .card img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .badge { position: absolute; top: 7px; left: 7px; background: rgba(17,24,39,.92); color: #fff; font-size: 12px; font-weight: 800; padding: 4px 7px; border-radius: 4px; }
      .caption { position: absolute; left: 0; right: 0; bottom: 0; padding: 6px 7px; background: rgba(17,24,39,.84); color: #fff; font-size: 10px; line-height: 1.25; min-height: 35px; }
      .error { width: 100%; height: 100%; display: grid; place-items: center; color: #991b1b; font-weight: 700; padding: 12px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">Candidatas de cardapio para capas/galeria</div>
      <div class="meta">${loaded.length} imagens</div>
    </div>
    <div class="grid">${loaded.map((item) => `
      <div class="card">
        ${item.dataUrl ? `<img src="${item.dataUrl}" alt="${escapeHtml(item.name)}">` : `<div class="error">${escapeHtml(item.error || 'erro')}</div>`}
        <div class="badge">${escapeHtml(item.menu_categories.restaurants.name)}</div>
        <div class="caption">${escapeHtml(item.name)} · ${escapeHtml(item.id.slice(0, 8))}</div>
      </div>`).join('')}</div>
  </body>
</html>`;

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
const outFile = path.join(OUT_DIR, 'candidates.png');
await page.screenshot({ path: outFile, fullPage: true, type: 'png' });
await page.close();
await browser.close();

const summary = { runId: RUN_ID, outDir: path.resolve(OUT_DIR), sheet: path.resolve(outFile), items };
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ runId: RUN_ID, outDir: path.resolve(OUT_DIR), sheet: path.resolve(outFile), count: items.length }, null, 2));
