import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

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

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isTrue(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function hasValue(value) {
  return String(value ?? '').trim().length > 0;
}

function groupCount(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || 'null';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function classifySource(row) {
  const url = row.other_url || row.external_url || row.ifood_url || '';
  if (!url) return 'none';
  const lower = url.toLowerCase();
  if (lower.includes('ifood.com.br')) return 'ifood';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('whatsapp') || lower.includes('wa.me/')) return 'whatsapp';
  if (lower.includes('google.') || lower.includes('g.co/') || lower.includes('maps.app.goo.gl')) return 'google';
  if (/cardapioweb|anota\.ai|xmenu|menudino|ola\.click|goomer|livemenu|saipos|instadelivery|aiqfome|deliverydireto|whatsmenu|yooga|pedidos\.site/i.test(lower)) {
    return 'structured_platform';
  }
  if (/linktr\.ee|linkbio|bio\.site|beacons|taplink|linklist/i.test(lower)) return 'linkhub';
  return 'own_site_or_other';
}

const MOJIBAKE_RE = /\u00c3[\u0080-\u00bf\u0192\u2020-\u2021]|\u00c2[\u0080-\u00bf]|\ufffd|\u00f0\u0178|\u00e2[\u0080-\u2122]/;

function rowHasMojibake(row) {
  return ['name', 'category', 'address', 'neighborhood', 'city', 'state']
    .some((field) => MOJIBAKE_RE.test(String(row[field] ?? '')));
}

function latestJsonFile(rootDir, filename) {
  if (!fs.existsSync(rootDir)) return null;
  const dirs = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rootDir, entry.name, filename))
    .filter((file) => fs.existsSync(file))
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return dirs[0]?.file || null;
}

function readJsonIfExists(file) {
  if (!file || !fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function line(label, value) {
  return `- ${label}: ${value}`;
}

const city = argValue('city', 'Cabedelo');
const state = argValue('state', 'PB');
const batchFile = argValue('batch', 'scratch/chat-mae-batches/cabedelo-next-scored-menu-batch.json');
const nextLimit = Number(argValue('next', '10')) || 10;
const runId = new Date().toISOString().replace(/[:.]/g, '-');

const env = readEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
  || env.VITE_SUPABASE_SERVICE_ROLE_KEY
  || env.SERVICE_ROLE_KEY
  || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL/key ausentes no .env');
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const { data: restaurants, error } = await supabase
  .from('restaurants')
  .select([
    'id',
    'name',
    'category',
    'address',
    'neighborhood',
    'city',
    'state',
    'phone',
    'instagram',
    'followers_override',
    'latitude',
    'longitude',
    'opening_hours',
    'image_url',
    'cover_image_url',
    'other_url',
    'external_url',
    'ifood_url',
    'menu_status',
    'menu_status_reason',
    'ai_validated',
    'is_deleted',
    'is_published',
  ].join(','))
  .eq('city', city)
  .eq('state', state)
  .limit(1000);

if (error) throw error;

const rows = restaurants || [];
const active = rows.filter((row) => !isTrue(row.is_deleted));
const unpublished = active.filter((row) => !isTrue(row.is_published));
const ready = unpublished.filter((row) => row.menu_status === 'found');
const published = active.filter((row) => isTrue(row.is_published) && row.menu_status === 'found');
const review = unpublished.filter((row) => ['manual_required', 'blocked', 'failed', 'invalid_source'].includes(row.menu_status || ''));
const noMenu = unpublished.filter((row) => ['not_found', 'unavailable'].includes(row.menu_status || ''));
const pending = unpublished.filter((row) => row.ai_validated !== true && !review.includes(row) && !noMenu.includes(row));
const sourceRows = unpublished.map((row) => ({ ...row, sourceClass: classifySource(row) }));
const withAnySource = unpublished.filter((row) => hasValue(row.other_url) || hasValue(row.external_url) || hasValue(row.ifood_url));
const withPublicMenuSource = sourceRows.filter((row) => ['structured_platform', 'own_site_or_other', 'linkhub'].includes(row.sourceClass));
const mediaComplete = unpublished.filter((row) => hasValue(row.image_url) && hasValue(row.cover_image_url));
const withHours = unpublished.filter((row) => hasValue(row.opening_hours));
const withInstagram = unpublished.filter((row) => hasValue(row.instagram));
const withMojibake = unpublished.filter(rowHasMojibake);

const activeIds = active.map((row) => row.id);
const { data: categories } = activeIds.length
  ? await supabase.from('menu_categories').select('id,restaurant_id').in('restaurant_id', activeIds)
  : { data: [] };
const categoryIds = (categories || []).map((row) => row.id);
const { data: items } = categoryIds.length
  ? await supabase.from('menu_items').select('id,category_id').in('category_id', categoryIds)
  : { data: [] };
const { data: gallery } = activeIds.length
  ? await supabase.from('restaurant_gallery').select('id,restaurant_id').in('restaurant_id', activeIds)
  : { data: [] };

const categoriesByRestaurant = groupCount(categories || [], 'restaurant_id');
const itemRestaurantIds = new Set();
const categoryToRestaurant = new Map((categories || []).map((category) => [category.id, category.restaurant_id]));
for (const item of items || []) {
  const restaurantId = categoryToRestaurant.get(item.category_id);
  if (restaurantId) itemRestaurantIds.add(restaurantId);
}
const galleryByRestaurant = groupCount(gallery || [], 'restaurant_id');
const withGalleryMin3 = unpublished.filter((row) => (galleryByRestaurant[row.id] || 0) >= 3);
const withMenuItems = unpublished.filter((row) => itemRestaurantIds.has(row.id));

const latestAuditFile = latestJsonFile('scratch/restaurant-structural-ready-audit', 'summary.json');
const latestAudit = readJsonIfExists(latestAuditFile);
const batch = readJsonIfExists(batchFile);
const currentById = new Map(rows.map((row) => [row.id, row]));
const nextBatch = (batch?.batch || [])
  .filter((row) => {
    const current = currentById.get(row.id);
    if (!current) return false;
    if (isTrue(current.is_deleted) || isTrue(current.is_published)) return false;
    if (current.menu_status === 'found' || current.ai_validated === true) return false;
    return true;
  })
  .slice(0, nextLimit)
  .map((row) => ({
  id: row.id,
  name: row.name,
  score: row.score,
  source: row.source_host || row.source_class,
  risks: row.risks || [],
}));

const status = {
  generatedAt: new Date().toISOString(),
  city,
  state,
  counts: {
    total: rows.length,
    active: active.length,
    unpublished: unpublished.length,
    ready: ready.length,
    published: published.length,
    pending: pending.length,
    review: review.length,
    noMenu: noMenu.length,
    withInstagram: withInstagram.length,
    withAnySource: withAnySource.length,
    withPublicMenuSource: withPublicMenuSource.length,
    withHours: withHours.length,
    withMojibake: withMojibake.length,
    mediaBaseComplete: mediaComplete.length,
    withGalleryMin3: withGalleryMin3.length,
    withMenuItems: withMenuItems.length,
  },
  menuStatusCounts: groupCount(unpublished, 'menu_status'),
  sourceClassCounts: groupCount(sourceRows, 'sourceClass'),
  latestAudit: latestAudit
    ? {
      file: latestAuditFile,
      runId: latestAudit.runId,
      restaurants: latestAudit.restaurants,
      ready: latestAudit.ready,
      needsReview: latestAudit.needsReview,
      blocked: latestAudit.blocked,
      issueCounts: latestAudit.issueCounts,
    }
    : null,
  nextBatchFile: batchFile,
  nextBatch,
};

const outDir = path.join('scratch', 'chat-mae-status');
fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, `${runId}.json`);
const latestJsonPath = path.join(outDir, 'latest.json');
fs.writeFileSync(jsonPath, JSON.stringify(status, null, 2));
fs.writeFileSync(latestJsonPath, JSON.stringify(status, null, 2));

const md = [
  `# Chat-mae Status - ${city}/${state}`,
  '',
  `Gerado em: ${status.generatedAt}`,
  '',
  '## Contadores',
  line('Total', status.counts.total),
  line('Ativos', status.counts.active),
  line('Nao publicados', status.counts.unpublished),
  line('Prontos p/ App', status.counts.ready),
  line('Publicados', status.counts.published),
  line('Pendentes', status.counts.pending),
  line('Revisao humana', status.counts.review),
  line('Sem cardapio', status.counts.noMenu),
  line('Com Instagram', status.counts.withInstagram),
  line('Com qualquer link/fonte salvo', status.counts.withAnySource),
  line('Com fonte publica de cardapio', status.counts.withPublicMenuSource),
  line('Com horario', status.counts.withHours),
  line('Com texto quebrado/mojibake', status.counts.withMojibake),
  line('Com logo+capa', status.counts.mediaBaseComplete),
  line('Com galeria >= 3', status.counts.withGalleryMin3),
  line('Com itens de cardapio salvos', status.counts.withMenuItems),
  '',
  '## Proximo Lote',
  `Fonte: ${batchFile}`,
  '',
  ...nextBatch.map((row, index) => `${index + 1}. ${row.name} - ${row.id} - ${row.source} - score ${row.score}${row.risks.length ? ` - riscos: ${row.risks.join(', ')}` : ''}`),
  '',
  '## Ultima Auditoria Estrutural',
  latestAudit
    ? `Run ${latestAudit.runId}: ready=${latestAudit.ready}, needsReview=${latestAudit.needsReview}, blocked=${latestAudit.blocked}`
    : 'Nenhuma auditoria encontrada.',
  '',
  `JSON: ${jsonPath}`,
].join('\n');

const latestMdPath = path.join(outDir, 'latest.md');
fs.writeFileSync(path.join(outDir, `${runId}.md`), md);
fs.writeFileSync(latestMdPath, md);

console.log(JSON.stringify({
  city,
  state,
  out: path.resolve(latestMdPath),
  counts: status.counts,
  nextBatch: status.nextBatch,
}, null, 2));
