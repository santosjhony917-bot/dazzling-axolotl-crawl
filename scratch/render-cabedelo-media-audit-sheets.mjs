import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'cabedelo-cover-gallery-audit', RUN_ID);
const TILE_W = 180;
const TILE_H = 180;
const GAP = 10;
const COLUMNS = 5;
const PAGE_SIZE = 6;

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
  if (!url) throw new Error('sem url');
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
        out[index] = { ...item, dataUrl: await imageDataUrl(item.url) };
      } catch (error) {
        out[index] = { ...item, error: error.message };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, items.length) }, worker));
  return out;
}

async function hydrateSequential(items) {
  const out = [];
  for (const item of items) {
    try {
      out.push({ ...item, dataUrl: await imageDataUrl(item.url) });
    } catch (error) {
      out.push({ ...item, error: error.message });
    }
  }
  return out;
}

function card(item) {
  return `
    <div class="card ${item.kind}">
      ${item.dataUrl ? `<img src="${item.dataUrl}" alt="${escapeHtml(item.label)}">` : `<div class="error">${escapeHtml(item.error || 'erro')}</div>`}
      <div class="badge">${escapeHtml(item.label)}</div>
      <div class="caption">${escapeHtml(item.name)}${item.caption ? ` · ${escapeHtml(item.caption)}` : ''}</div>
    </div>
  `;
}

async function render(browser, file, title, items) {
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
        .cover { outline: 4px solid #dc2626; outline-offset: -4px; }
        .badge { position: absolute; top: 7px; left: 7px; background: rgba(17,24,39,.92); color: #fff; font-size: 12px; font-weight: 800; padding: 4px 7px; border-radius: 4px; }
        .caption { position: absolute; left: 0; right: 0; bottom: 0; padding: 6px 7px; background: rgba(17,24,39,.84); color: #fff; font-size: 10px; line-height: 1.25; min-height: 30px; }
        .error { width: 100%; height: 100%; display: grid; place-items: center; color: #991b1b; font-weight: 700; padding: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${escapeHtml(title)}</div>
        <div class="meta">${loaded.length} imagens · capa destacada em vermelho</div>
      </div>
      <div class="grid">${loaded.map(card).join('')}</div>
    </body>
  </html>`;

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const outFile = path.join(OUT_DIR, file);
  await page.screenshot({ path: outFile, fullPage: true, type: 'png' });
  await page.close();
  return path.resolve(outFile);
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

const { data: restaurants, error: restaurantError } = await supabase
  .from('restaurants')
  .select('id,name,image_url,cover_image_url,ai_validated,menu_status,city')
  .eq('city', 'Cabedelo')
  .eq('ai_validated', true)
  .order('name');
if (restaurantError) throw restaurantError;

const ids = (restaurants || []).map((row) => row.id);
const { data: gallery, error: galleryError } = await supabase
  .from('restaurant_gallery')
  .select('restaurant_id,image_url,caption,order_index')
  .in('restaurant_id', ids)
  .order('order_index');
if (galleryError) throw galleryError;

const galleries = new Map();
for (const row of gallery || []) {
  if (!galleries.has(row.restaurant_id)) galleries.set(row.restaurant_id, []);
  galleries.get(row.restaurant_id).push(row);
}

const covers = [];
const allMedia = [];
for (const restaurant of restaurants || []) {
  if (restaurant.cover_image_url) {
    covers.push({
      kind: 'cover',
      label: 'CAPA',
      name: restaurant.name,
      caption: restaurant.id.slice(0, 8),
      url: restaurant.cover_image_url,
    });
  }
  allMedia.push({
    kind: 'cover',
    label: 'CAPA',
    name: restaurant.name,
    caption: restaurant.id.slice(0, 8),
    url: restaurant.cover_image_url,
  });
  for (const row of galleries.get(restaurant.id) || []) {
    allMedia.push({
      kind: row.image_url === restaurant.cover_image_url ? 'cover' : 'gallery',
      label: `${row.order_index + 1}${row.image_url === restaurant.cover_image_url ? ' CAPA' : ''}`,
      name: restaurant.name,
      caption: row.caption || '',
      url: row.image_url,
    });
  }
}

const browser = await puppeteer.launch({ headless: 'new' });
const sheets = [];
try {
  sheets.push(await render(browser, 'covers.png', 'Cabedelo capas ai_validated=true', covers));
  for (let index = 0; index < allMedia.length; index += PAGE_SIZE * COLUMNS) {
    const pageNo = Math.floor(index / (PAGE_SIZE * COLUMNS)) + 1;
    sheets.push(await render(browser, `media-page-${String(pageNo).padStart(2, '0')}.png`, `Cabedelo capas e galerias pagina ${pageNo}`, allMedia.slice(index, index + PAGE_SIZE * COLUMNS)));
  }
} finally {
  await browser.close();
}

const summary = {
  runId: RUN_ID,
  outDir: path.resolve(OUT_DIR),
  restaurants: restaurants?.length || 0,
  galleryImages: gallery?.length || 0,
  sheets,
};
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
