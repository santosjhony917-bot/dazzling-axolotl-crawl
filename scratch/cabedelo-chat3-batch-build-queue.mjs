import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const batch = [
  ['07f16c40-a81c-4d0a-8f71-5ef78a3be31c', 'A Casa do Temakinho', 'anota_ai', 'https://pedido.anota.ai/loja/a-casa-do-temakinho'],
  ['cb4d3075-dcad-45a2-a348-e8de93ef15cc', 'Acai da Hill Point', 'anota_ai', 'https://pedido.anota.ai/loja/aai-da-hill-point'],
  ['72606188-4454-4890-a671-a65d4d08f024', 'Casa Do Pastel', 'menudino', 'https://lacasadepastelpb.menudino.com.br/'],
  ['4f71666b-ecb6-4963-9201-86bcc7d29c66', 'churrascaria do biu', 'anota_ai', 'https://pedido.anota.ai/loja/pizzaria-do-biu'],
  ['f90edcb3-31a7-4922-9bdd-930817bba3c9', 'Espetinho da praia Intermares', 'anota_ai', 'https://pedido.anota.ai/loja/espetinho-da-praia-1'],
  ['0b4eb55c-e0d9-4068-b198-e5f8cb7a985e', 'Forneria Brasil Express', 'instadelivery', 'https://instadelivery.com.br/FornoBrasilExpress'],
  ['60d131e5-d7fb-4aa2-b3b0-83af50747ff2', 'Pipa Sushi & Temakeria', 'anota_ai', 'https://pedido.anota.ai/loja/pipa-sushi-temakeria'],
  ['7dfea73b-b593-4acf-8bf1-71a099224008', 'Pizza do Paulinho', 'anota_ai', 'https://pedido.anota.ai/loja/pizza-do-paulinho?referer=gbp_anota'],
  ['ebc2a604-0b9b-4ccb-896b-e3ccca9d16a1', 'Pizza Now - Intermares', 'anota_ai', 'https://pedido.anota.ai/loja/pizza-now-intermares'],
  ['dd73fc2d-69a5-4a76-8e1e-7aa2b68f7869', 'Route Hot Dogs', 'anota_ai', 'https://pedido.anota.ai/loja/route-hot-dogs'],
  ['42a3fb16-037e-4824-9f83-b62fee3b8407', 'Tia Graca Cafeteria e Doceria', 'goomer', 'https://tia-graa-doces-e-salgados.goomer.app/'],
  ['f598d9b8-6875-4bca-92c3-a7675f4775ac', 'Pizzaria ta no ponto', 'anota_ai', 'https://pedido.anota.ai/loja/pizzaria-ta-no-ponto'],
  ['3549abc7-3261-4ec3-af59-820112bd2358', 'Cibelly Mar - Restaurante no Por do Sol do Jacare', 'pdf_drive', 'https://drive.google.com/file/d/1GJmCiphVxNCs9pCWIz5ld-v3ATsQc0J3/view?usp=drive_link'],
  ['82d8aca0-64d5-4788-97c7-cf38503d2eb3', 'BAR DO CHEFF RESTAURANTE', 'anota_ai', 'https://pedido.anota.ai/loja/bar-do-cheff-restaurante-1?referer=gbp_anota'],
  ['a9904835-65ca-4efd-9caf-c8c7354f9ee5', 'Self-service da nany', 'anota_ai', 'https://pedido.anota.ai/loja/selfservice-da-nany'],
  ['6e42a0fb-9793-4d47-9a12-c5c5a6df86d6', 'Pizzaria 1000Graus', 'anota_ai', 'https://pedido.anota.ai/loja/pizzaria-1000graus-1'],
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

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const ids = batch.map(([id]) => id);
const { data: restaurants, error } = await supabase
  .from('restaurants')
  .select('id,name,google_maps_name,category,address,neighborhood,city,state,phone,rating,reviews_count,instagram,other_url,external_url,menu_status,menu_status_reason,is_published,ai_validated')
  .in('id', ids);
if (error) throw error;

const restaurantById = new Map((restaurants || []).map((restaurant) => [restaurant.id, restaurant]));

const queue = batch.map(([id, name, platform, sourceUrl], index) => {
  const restaurant = restaurantById.get(id) || {};
  const displayName = restaurant.google_maps_name || restaurant.name || name;
  return ({
  restaurant_id: id,
  restaurantId: id,
  name: displayName,
  restaurantName: displayName,
  platform,
  tier: platform === 'pdf_drive' ? 'yellow' : 'green',
  source_url: sourceUrl,
  sourceUrl,
  raw_source_url: sourceUrl,
  source_field: 'chat3_green_batch',
  other_url: restaurant.other_url || '',
  external_url: restaurant.external_url || '',
  category: restaurant.category || null,
  address: restaurant.address || null,
  neighborhood: restaurant.neighborhood || null,
  city: restaurant.city || 'Cabedelo',
  state: restaurant.state || 'PB',
  phone: restaurant.phone || null,
  instagram: restaurant.instagram || null,
  rating: restaurant.rating || null,
  reviews_count: restaurant.reviews_count || null,
  menu_status: restaurant.menu_status || null,
  menu_status_reason: restaurant.menu_status_reason || null,
  is_published: restaurant.is_published,
  ai_validated: restaurant.ai_validated,
  rank: index + 1,
  });
});

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'cabedelo-chat3-batch', runId);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'queue.json'), JSON.stringify({ queue }, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'ids.txt'), `${queue.map((entry) => entry.restaurant_id).join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
  outDir,
  queuePath: path.join(outDir, 'queue.json'),
  idsPath: path.join(outDir, 'ids.txt'),
  count: queue.length,
  byPlatform: queue.reduce((acc, entry) => {
    acc[entry.platform] = (acc[entry.platform] || 0) + 1;
    return acc;
  }, {}),
}, null, 2));
