import fs from 'node:fs';

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

const env = readEnv();
const apiKey = env.SERPAPI_API_KEY || env.VITE_SERPAPI_API_KEY;
if (!apiKey) throw new Error('SERPAPI_API_KEY ausente');

const dataId = process.argv[2] || '0x7acdf02662a4b07:0x147e30c4edb222f7';
const url = new URL('https://serpapi.com/search.json');
url.searchParams.set('engine', 'google_maps_photos');
url.searchParams.set('hl', 'pt');
url.searchParams.set('data_id', dataId);
url.searchParams.set('api_key', apiKey);

const response = await fetch(url);
const text = await response.text();
let payload = {};
try {
  payload = JSON.parse(text);
} catch {
  console.log(text.slice(0, 1000));
  process.exit(1);
}

const photos = payload.photos || payload.images || [];
console.log(JSON.stringify({
  status: response.status,
  keys: Object.keys(payload),
  searchMetadata: payload.search_metadata,
  placeResultsKeys: payload.place_results ? Object.keys(payload.place_results) : [],
  photosCount: Array.isArray(photos) ? photos.length : null,
  firstPhotos: Array.isArray(photos) ? photos.slice(0, 5).map((photo) => ({
    keys: Object.keys(photo),
    title: photo.title || photo.caption || photo.description || null,
    thumbnail: photo.thumbnail || null,
    image: photo.image || photo.original || photo.link || null,
    date: photo.date || photo.date_text || null,
  })) : null,
  error: payload.error || null,
}, null, 2));
