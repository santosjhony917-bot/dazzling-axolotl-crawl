import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const batch = [
  ['DAWN BURGUER', 'https://pedido.anota.ai/loja/dawn-burguer'],
  ['Espaco Do Sushi', 'https://delivery.yooga.app/espacosushi.house'],
  ['Eu Quero Pizza', 'https://pedido.anota.ai/loja/eu-quero-pizza-2'],
  ['Home Smash Burger', 'https://delivery.yooga.app/home-smash-burger'],
  ['I love burguer', 'https://app.cardapioweb.com/i_loveburguer'],
  ['Ilovepizzapb', 'https://app.cardapioweb.com/ilove_pizza'],
  ["Lary's pizzaria e lanchonete", 'https://pedido.anota.ai/loja/larys-pizzaria-e-lanchonete'],
  ['Manguinhos Burguer', 'https://pedido.anota.ai/loja/manguinhos-burguer'],
  ['Oxi Burguer Cabedelo', 'https://menu.brendi.com.br/oxiburguercabedelo/'],
  ['PARCEIRO Rosa Lanches', 'https://pedido.anota.ai/loja/rosalanches'],
  ['Pastelaria Litoranea', 'https://whatsmenu.com.br/pastelarialitoranea'],
  ['Porto do acai', 'https://meucarrinho.delivery/portodoacai'],
  ['Primo Rico', 'https://delivery.yooga.app/restaurante-primo-rico'],
  ['Restaurante Por do Sol', 'https://pedido.anota.ai/loja/restaurante-por-do-sol-5'],
  ['Sushiyaki Restaurante', 'https://delivery.yooga.app/sushiyaki'],
];

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
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(parceiro|cabedelo|pb|restaurante|pizzaria|lanchonete|delivery)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalUrl(value) {
  const raw = clean(value);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid']) {
      url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return raw.replace(/\/$/, '').toLowerCase();
  }
}

function platformOf(url) {
  const lower = url.toLowerCase();
  if (lower.includes('ifood.com')) return 'ifood';
  if (lower.includes('cardapioweb')) return 'cardapioweb';
  if (lower.includes('anota.ai')) return 'anota_ai';
  if (lower.includes('yooga')) return 'yooga';
  if (lower.includes('brendi')) return 'brendi';
  if (lower.includes('whatsmenu')) return 'whatsmenu';
  if (lower.includes('meucarrinho')) return 'meucarrinho';
  return 'unknown';
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

const { data: restaurants, error } = await supabase
  .from('restaurants')
  .select('id,name,google_maps_name,category,address,neighborhood,city,state,phone,rating,reviews_count,other_url,external_url,menu_status,menu_status_reason,is_published,ai_validated')
  .eq('city', 'Cabedelo')
  .eq('state', 'PB')
  .eq('is_deleted', false);
if (error) throw error;

const used = new Set();
const unmatched = [];
const queue = [];

for (const [label, sourceUrl] of batch) {
  const sourceKey = canonicalUrl(sourceUrl);
  const labelKey = normalize(label);
  let match = restaurants.find((restaurant) =>
    !used.has(restaurant.id)
    && [restaurant.other_url, restaurant.external_url].some((url) => canonicalUrl(url) === sourceKey)
  );
  if (!match) {
    match = restaurants.find((restaurant) => {
      if (used.has(restaurant.id)) return false;
      const dbName = normalize(restaurant.google_maps_name || restaurant.name);
      return dbName && labelKey && (dbName.includes(labelKey) || labelKey.includes(dbName));
    });
  }
  if (!match) {
    unmatched.push({ label, sourceUrl });
    continue;
  }
  used.add(match.id);
  queue.push({
    restaurant_id: match.id,
    restaurantId: match.id,
    name: match.google_maps_name || match.name || label,
    restaurantName: match.google_maps_name || match.name || label,
    platform: platformOf(sourceUrl),
    tier: platformOf(sourceUrl) === 'ifood' || platformOf(sourceUrl) === 'unknown' ? 'red' : 'green',
    source_url: sourceUrl,
    sourceUrl,
    raw_source_url: sourceUrl,
    source_field: 'user_safe_batch',
    other_url: match.other_url || '',
    external_url: match.external_url || '',
    category: match.category || null,
    address: match.address || null,
    neighborhood: match.neighborhood || null,
    city: 'Cabedelo',
    state: 'PB',
    phone: match.phone || null,
    rating: match.rating || null,
    reviews_count: match.reviews_count || null,
    menu_status: match.menu_status || null,
    menu_status_reason: match.menu_status_reason || null,
    is_published: match.is_published,
    ai_validated: match.ai_validated,
  });
}

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'cabedelo-safe-batch', runId);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'queue.json'), JSON.stringify({ queue, unmatched }, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'ids.txt'), `${queue.map((entry) => entry.restaurant_id).join('\n')}\n`, 'utf8');
console.log(JSON.stringify({
  outDir,
  queuePath: path.join(outDir, 'queue.json'),
  idsPath: path.join(outDir, 'ids.txt'),
  matched: queue.length,
  unmatched,
  entries: queue.map((entry) => ({
    id: entry.restaurant_id,
    name: entry.name,
    platform: entry.platform,
    sourceUrl: entry.source_url,
  })),
}, null, 2));
