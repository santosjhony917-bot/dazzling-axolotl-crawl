import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const DEFAULT_IDS = [
  '3efd7101-b736-4135-9e5e-9787a854ec0e',
  '49423823-d994-4263-9597-cb829e208129',
  'ecac91e3-52c0-4780-9867-6b3b1d096089',
  'c23b0422-4e34-43be-b07e-6a494804f6fc',
  '297a6b03-242d-4d91-9f64-73e736972946',
  '4fa980c0-13d2-415f-97a6-e31fd3141133',
  '2ef9ccde-0e20-4108-a8ac-874108b3c16b',
  '2ed733a0-a4c7-4bb4-b280-21d7752c0409',
];

const args = process.argv.slice(2);
const valueArg = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const IDS = valueArg('--ids', '')
  ? valueArg('--ids', '').split(',').map((item) => item.trim()).filter(Boolean)
  : DEFAULT_IDS;

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'final-media-qa-sheets', RUN_ID);
const TILE_W = 230;
const TILE_H = 230;
const GAP = 14;
const COLUMNS = 4;

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

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'restaurant';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function imageDataUrl(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    dataUrl: `data:${contentType};base64,${buffer.toString('base64')}`,
    bytes: buffer.length,
    contentType,
  };
}

async function renderSheet(browser, restaurant, gallery) {
  const items = [];
  if (restaurant.image_url) {
    items.push({
      label: 'LOGO',
      caption: 'image_url',
      url: restaurant.image_url,
      kind: 'logo',
    });
  }
  for (const row of gallery) {
    items.push({
      label: `${row.order_index + 1}${row.image_url === restaurant.cover_image_url ? ' CAPA' : ''}`,
      caption: row.caption || '',
      url: row.image_url,
      kind: 'gallery',
    });
  }

  const loaded = [];
  for (const item of items) {
    try {
      const image = await imageDataUrl(item.url);
      loaded.push({ ...item, ...image });
    } catch (error) {
      loaded.push({ ...item, error: error.message });
    }
  }

  const rows = Math.ceil(loaded.length / COLUMNS);
  const width = (COLUMNS * TILE_W) + ((COLUMNS + 1) * GAP);
  const headerH = 86;
  const height = headerH + (rows * TILE_H) + ((rows + 1) * GAP);
  const cards = loaded.map((item) => `
    <div class="card ${item.kind}">
      ${item.dataUrl ? `<img src="${item.dataUrl}" alt="${escapeHtml(item.label)}">` : `<div class="error">${escapeHtml(item.error || 'erro')}</div>`}
      <div class="badge">${escapeHtml(item.label)}</div>
      <div class="caption">${escapeHtml(item.caption)}${item.bytes ? ` · ${Math.round(item.bytes / 1024)}kb` : ''}</div>
    </div>
  `).join('');

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; width: ${width}px; min-height: ${height}px; font-family: Arial, sans-serif; background: #f4f5f7; color: #111827; }
        .header { height: ${headerH}px; padding: 14px; background: #111827; color: #fff; display: flex; flex-direction: column; justify-content: center; gap: 5px; }
        .title { font-size: 22px; font-weight: 800; }
        .meta { font-size: 12px; color: #d1d5db; }
        .grid { display: grid; grid-template-columns: repeat(${COLUMNS}, ${TILE_W}px); gap: ${GAP}px; padding: ${GAP}px; }
        .card { width: ${TILE_W}px; height: ${TILE_H}px; border-radius: 8px; overflow: hidden; background: #fff; position: relative; box-shadow: 0 1px 5px rgba(17, 24, 39, .18); }
        .card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .card.logo img { object-fit: contain; padding: 18px; background: #20242f; }
        .badge { position: absolute; top: 8px; left: 8px; background: rgba(17,24,39,.9); color: #fff; font-size: 13px; font-weight: 800; padding: 5px 8px; border-radius: 5px; }
        .caption { position: absolute; left: 0; right: 0; bottom: 0; padding: 7px 8px; background: rgba(17,24,39,.82); color: #fff; font-size: 11px; line-height: 1.25; min-height: 30px; }
        .error { width: 100%; height: 100%; display: grid; place-items: center; color: #991b1b; font-weight: 700; padding: 18px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${escapeHtml(restaurant.name)}</div>
        <div class="meta">${escapeHtml(restaurant.id)} · ${gallery.length} fotos · capa: ${restaurant.cover_image_url ? 'sim' : 'não'} · logo: ${restaurant.image_url ? 'sim' : 'não'}</div>
      </div>
      <div class="grid">${cards}</div>
    </body>
  </html>`;

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const outFile = path.join(OUT_DIR, `${slug(restaurant.name)}-${restaurant.id.slice(0, 8)}.png`);
  await page.screenshot({ path: outFile, fullPage: true, type: 'png' });
  await page.close();
  return {
    id: restaurant.id,
    name: restaurant.name,
    sheet: path.resolve(outFile),
    galleryCount: gallery.length,
    loaded: loaded.map((item) => ({
      label: item.label,
      caption: item.caption,
      kind: item.kind,
      bytes: item.bytes || 0,
      contentType: item.contentType || null,
      error: item.error || null,
      url: item.url,
    })),
  };
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
  .select('id,name,image_url,cover_image_url')
  .in('id', IDS)
  .order('name');
if (restaurantError) throw restaurantError;

const { data: gallery, error: galleryError } = await supabase
  .from('restaurant_gallery')
  .select('restaurant_id,image_url,caption,order_index')
  .in('restaurant_id', IDS)
  .order('order_index');
if (galleryError) throw galleryError;

const byRestaurant = new Map();
for (const row of gallery || []) {
  if (!byRestaurant.has(row.restaurant_id)) byRestaurant.set(row.restaurant_id, []);
  byRestaurant.get(row.restaurant_id).push(row);
}

const browser = await puppeteer.launch({ headless: 'new' });
const results = [];
try {
  for (const restaurant of restaurants || []) {
    results.push(await renderSheet(browser, restaurant, byRestaurant.get(restaurant.id) || []));
  }
} finally {
  await browser.close();
}

const summary = { runId: RUN_ID, outDir: path.resolve(OUT_DIR), results };
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
