import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;
const OUTPUT_ROOT = path.join('scratch', 'menu-collection-queue');
const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const CITY = argValue('--city', 'Campina Grande');
const STATE = argValue('--state', 'PB');
const STATUS = argValue('--status', 'needs_recollection');
const HARD_PLATFORMS = new Set(['cardapio_ai', 'cardapiodigital', 'accon', 'unknown']);
const STRUCTURED_PLATFORMS = new Set([
  'cardapioweb',
  'anota_ai',
  'restaurantlogin',
  'whatsmenu',
  'instadelivery',
  'brendi',
  'saipos',
  'olaclick',
  'goomer',
  'livemenu',
  'deliverydireto',
  'deliverymuch',
  'menudino',
  'diggy',
  'meucarrinho',
  'yooga',
  'pedir',
]);
const PLATFORM_PRIORITY = {
  cardapioweb: 0,
  anota_ai: 1,
  restaurantlogin: 2,
  whatsmenu: 3,
  instadelivery: 40,
  brendi: 41,
  saipos: 42,
  olaclick: 43,
  goomer: 44,
  livemenu: 45,
  deliverydireto: 46,
  deliverymuch: 47,
  menudino: 48,
  diggy: 49,
  meucarrinho: 50,
  yooga: 51,
  pedir: 52,
  cardapio_ai: 200,
  cardapiodigital: 202,
  accon: 203,
  unknown: 250,
};
const CSV_HEADERS = [
  'rank',
  'restaurant_id',
  'name',
  'platform',
  'tier',
  'priority_score',
  'risk_flags',
  'source_field',
  'source_url',
  'raw_source_url',
  'other_url',
  'external_url',
  'other_url_label',
  'category',
  'neighborhood',
  'address',
  'rating',
  'reviews_count',
  'menu_status',
  'menu_status_reason',
  'collection_hint',
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function findProjectRoot() {
  const starts = [process.cwd(), path.resolve(scriptDir, '..')];
  for (const start of starts) {
    let current = path.resolve(start);
    while (true) {
      if (fs.existsSync(path.join(current, '.env')) && fs.existsSync(path.join(current, 'package.json'))) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return path.resolve(scriptDir, '..');
}

function parseEnvFile(envPath) {
  const env = {};
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return { ...process.env, ...env };
}

function parseUrlLoose(value) {
  const raw = clean(value);
  if (!raw) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw
    : raw.startsWith('//')
      ? `https:${raw}`
      : `https://${raw}`;
  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function canonicalizeUrl(value) {
  const raw = clean(value);
  if (!raw) return null;
  const parsed = parseUrlLoose(raw);
  if (!parsed) {
    return {
      raw,
      canonicalUrl: raw,
      host: '',
      path: '',
      parseError: true,
      canonicalFlags: [],
    };
  }

  parsed.hash = '';
  for (const param of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']) {
    parsed.searchParams.delete(param);
  }

  const canonicalFlags = [];
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (/(^|\.)anota\.ai$/i.test(host) && /^\/loja(\/|$)/i.test(parsed.pathname)) {
    parsed.protocol = 'https:';
    parsed.hostname = 'pedido.anota.ai';
    canonicalFlags.push('canonicalized_anota_ai_host');
  } else {
    parsed.hostname = host;
  }

  const canonicalUrl = parsed.toString().replace(/\/$/, '');
  return {
    raw,
    canonicalUrl,
    host: parsed.hostname.toLowerCase(),
    path: parsed.pathname,
    parseError: false,
    canonicalFlags,
  };
}

function sourceCandidates(row) {
  return [
    { field: 'other_url', value: row.other_url },
    { field: 'external_url', value: row.external_url },
  ]
    .map(({ field, value }) => {
      const canonical = canonicalizeUrl(value);
      return canonical ? { field, ...canonical } : null;
    })
    .filter(Boolean);
}

function hostIncludes(source, pattern) {
  return source.host.includes(pattern) || source.canonicalUrl.toLowerCase().includes(pattern);
}

function isIfoodSource(source) {
  const text = `${source.host} ${source.canonicalUrl}`.toLowerCase();
  return /\bifood\.com(\.br)?\b/.test(text) || text.includes('ifood.com.br');
}

function detectPlatform(source) {
  if (!source) return 'unknown';
  const text = `${source.host} ${source.path} ${source.canonicalUrl}`.toLowerCase();
  if (text.includes('cardapioweb')) return 'cardapioweb';
  if (/(^|\.)pedido\.anota\.ai$/i.test(source.host) || text.includes('anota.ai')) return 'anota_ai';
  if (text.includes('restaurantlogin.com') || text.includes('saborvip') || text.includes('pizzariabomsaborpb.com.br')) return 'restaurantlogin';
  if (text.includes('instadelivery')) return 'instadelivery';
  if (text.includes('brendi')) return 'brendi';
  if (text.includes('saipos')) return 'saipos';
  if (text.includes('olaclick') || text.includes('ola.click')) return 'olaclick';
  if (text.includes('goomer')) return 'goomer';
  if (text.includes('livemenu')) return 'livemenu';
  if (text.includes('deliverydireto')) return 'deliverydireto';
  if (text.includes('deliverymuch')) return 'deliverymuch';
  if (text.includes('menudino')) return 'menudino';
  if (text.includes('cardapio.ai') || text.includes('cardapioai')) return 'cardapio_ai';
  if (text.includes('whatsmenu')) return 'whatsmenu';
  if (text.includes('cardapio.digital') || text.includes('cardapiodigital')) return 'cardapiodigital';
  if (text.includes('accon')) return 'accon';
  if (text.includes('diggy')) return 'diggy';
  if (text.includes('meucarrinho')) return 'meucarrinho';
  if (text.includes('yooga')) return 'yooga';
  if (
    source.host === 'pedir.me'
    || source.host.endsWith('.pedir.me')
    || source.host.includes('pedir.delivery')
    || source.host.includes('pedir.app')
    || source.host.includes('pedir.menu')
  ) {
    return 'pedir';
  }
  return 'unknown';
}

function isDirectAsset(source) {
  if (!source) return false;
  return /\.(png|jpe?g|pdf)$/i.test(source.path || source.canonicalUrl.split('?')[0] || '');
}

function hasCanvaEdit(source) {
  if (!source) return false;
  const text = `${source.host} ${source.path} ${source.canonicalUrl}`.toLowerCase();
  return text.includes('canva.com') && (text.includes('/design/') || text.includes('/edit'));
}

function hasGoogleShare(source) {
  if (!source) return false;
  return /(^|\.)share\.google$/i.test(source.host) || source.host.includes('share.google');
}

function hasThreads(source) {
  if (!source) return false;
  return source.host === 'threads.net' || source.host.endsWith('.threads.net');
}

function hasMultiUnitSignal(row, source) {
  const text = normalize([
    row.name,
    row.google_maps_name,
    row.other_url_label,
    source?.canonicalUrl,
  ].filter(Boolean).join(' '));
  return /\b(filial|unidade|unidades|franquia|franquias|lojas|stores|branches)\b/.test(text)
    || /\/(unidades|lojas|stores|branches|restaurants)(\/|$)/i.test(source?.path || '')
    || /[?&](store|unit|branch|restaurant|company)=/i.test(source?.canonicalUrl || '');
}

function chooseSource(candidates) {
  const nonIfood = candidates.filter((source) => !isIfoodSource(source));
  return nonIfood[0] || candidates[0] || null;
}

function collectionHint(platform, tier, flags) {
  if (tier === 'red') return `manual_review_before_collection:${flags.join('|') || 'red_flag'}`;
  if (platform === 'cardapioweb') return 'cardapioweb_fast_path';
  if (platform === 'anota_ai') return 'anota_ai_fast_path';
  if (HARD_PLATFORMS.has(platform)) return 'hard_strategy_or_manual_probe';
  if (tier === 'yellow') return 'structured_source_with_review_flags';
  return 'structured_source_ready';
}

function classifyRow(row) {
  const candidates = sourceCandidates(row);
  const selectedSource = chooseSource(candidates);
  const platform = detectPlatform(selectedSource);
  const redFlags = [];
  const yellowFlags = [];

  if (!selectedSource) redFlags.push('source_absent');
  if (candidates.length > 0 && candidates.every(isIfoodSource)) redFlags.push('ifood_source');
  if (selectedSource && isIfoodSource(selectedSource)) redFlags.push('ifood_source');
  if (selectedSource && hasCanvaEdit(selectedSource)) redFlags.push('canva_edit_link');
  if (selectedSource && hasGoogleShare(selectedSource)) redFlags.push('share_google_link');
  if (selectedSource && hasThreads(selectedSource)) redFlags.push('threads_link');
  if (selectedSource && isDirectAsset(selectedSource)) redFlags.push('direct_asset_png_jpg_pdf');
  if (selectedSource?.parseError) yellowFlags.push('source_url_parse_error');
  if (HARD_PLATFORMS.has(platform)) yellowFlags.push(`hard_platform:${platform}`);
  if (selectedSource && hasMultiUnitSignal(row, selectedSource)) yellowFlags.push('multi_unit_signal');
  if (candidates.length > 1 && new Set(candidates.map((source) => source.canonicalUrl)).size > 1) {
    yellowFlags.push('multiple_source_urls');
  }
  for (const flag of selectedSource?.canonicalFlags || []) yellowFlags.push(flag);

  const tier = redFlags.length > 0
    ? 'red'
    : yellowFlags.length > 0
      ? 'yellow'
      : STRUCTURED_PLATFORMS.has(platform)
        ? 'green'
        : 'yellow';
  const priorityScore = (tier === 'red' ? 900 : PLATFORM_PRIORITY[platform] ?? PLATFORM_PRIORITY.unknown)
    + (tier === 'yellow' ? 10 : 0);
  const flags = [...new Set([...redFlags, ...yellowFlags])];

  return {
    restaurant_id: row.id,
    name: clean(row.google_maps_name || row.name),
    platform,
    tier,
    priority_score: priorityScore,
    risk_flags: flags,
    source_field: selectedSource?.field || '',
    source_url: selectedSource?.canonicalUrl || '',
    raw_source_url: selectedSource?.raw || '',
    other_url: clean(row.other_url),
    external_url: clean(row.external_url),
    other_url_label: clean(row.other_url_label),
    category: clean(row.category),
    address: clean([row.address, row.number].filter(Boolean).join(', ')),
    neighborhood: clean(row.neighborhood),
    city: clean(row.city),
    state: clean(row.state),
    phone: clean(row.phone),
    rating: row.rating ?? null,
    reviews_count: row.reviews_count ?? null,
    menu_status: clean(row.menu_status),
    menu_status_reason: clean(row.menu_status_reason),
    menu_last_checked_at: row.menu_last_checked_at || null,
    is_published: row.is_published ?? null,
    ai_validated: row.ai_validated ?? null,
    source_candidates: candidates.map((source) => ({
      field: source.field,
      raw: source.raw,
      canonical_url: source.canonicalUrl,
      platform: detectPlatform(source),
      is_ifood: isIfoodSource(source),
      parse_error: source.parseError,
      canonical_flags: source.canonicalFlags,
    })),
    eligible_for_queue: Boolean(selectedSource) && !candidates.every(isIfoodSource) && !isIfoodSource(selectedSource),
    collection_hint: collectionHint(platform, tier, flags),
  };
}

function sortQueue(a, b) {
  return a.priority_score - b.priority_score
    || Number(b.reviews_count || 0) - Number(a.reviews_count || 0)
    || Number(b.rating || 0) - Number(a.rating || 0)
    || a.name.localeCompare(b.name);
}

async function fetchNeedsRecollectionRows(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from('restaurants')
      .select([
        'id',
        'created_at',
        'name',
        'google_maps_name',
        'category',
        'address',
        'number',
        'neighborhood',
        'city',
        'state',
        'phone',
        'rating',
        'reviews_count',
        'other_url',
        'external_url',
        'other_url_label',
        'menu_status',
        'menu_status_reason',
        'menu_last_checked_at',
        'is_deleted',
        'is_published',
        'ai_validated',
      ].join(','))
      .eq('city', CITY)
      .eq('state', STATE)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .range(from, from + PAGE_SIZE - 1);
    if (STATUS !== 'any') query = query.eq('menu_status', STATUS);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    acc[value || 'unknown'] = (acc[value || 'unknown'] || 0) + 1;
    return acc;
  }, {});
}

function countTierPlatform(items) {
  return items.reduce((acc, item) => {
    acc[item.tier] ||= {};
    acc[item.tier][item.platform] = (acc[item.tier][item.platform] || 0) + 1;
    return acc;
  }, {});
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  return [
    CSV_HEADERS.join(';'),
    ...rows.map((row, index) => CSV_HEADERS.map((header) => {
      if (header === 'rank') return String(index + 1);
      return csvEscape(row[header]);
    }).join(';')),
  ].join('\n');
}

function topCandidateView(row, index) {
  return {
    rank: index + 1,
    restaurant_id: row.restaurant_id,
    name: row.name,
    platform: row.platform,
    tier: row.tier,
    priority_score: row.priority_score,
    reviews_count: row.reviews_count,
    rating: row.rating,
    source_url: row.source_url,
    risk_flags: row.risk_flags,
    collection_hint: row.collection_hint,
  };
}

async function main() {
  const projectRoot = findProjectRoot();
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing .env at ${envPath}`);
  }
  const env = parseEnvFile(envPath);
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL/key in .env.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const rows = await fetchNeedsRecollectionRows(supabase);
  const audited = rows.map(classifyRow).sort(sortQueue);
  const queue = audited.filter((row) => row.eligible_for_queue).sort(sortQueue);
  const excluded = audited.filter((row) => !row.eligible_for_queue).sort(sortQueue);
  const generatedAt = new Date().toISOString();
  const runId = generatedAt.replace(/[:.]/g, '-');
  const outputDir = path.join(projectRoot, OUTPUT_ROOT, runId);
  fs.mkdirSync(outputDir, { recursive: true });

  queue.forEach((row, index) => {
    row.rank = index + 1;
  });

  const summary = {
    all_active_needs_recollection: audited.length,
    queue_count: queue.length,
    excluded_count: excluded.length,
    by_tier: countBy(queue, 'tier'),
    by_platform: countBy(queue, 'platform'),
    by_tier_platform: countTierPlatform(queue),
    excluded_by_tier: countBy(excluded, 'tier'),
    excluded_by_platform: countBy(excluded, 'platform'),
    excluded_by_reason: countBy(excluded, (row) => row.risk_flags.find((flag) => flag === 'source_absent' || flag === 'ifood_source') || 'other'),
  };
  const top50 = queue.slice(0, 50).map(topCandidateView);
  const report = {
    generated_at: generatedAt,
    filters: {
      city: CITY,
      state: STATE,
      active: 'is_deleted is false or null',
      menu_status: STATUS,
      queue_source_rule: 'other_url or external_url present and selected source is non-iFood',
      note: 'The raw fetch includes missing-source and iFood-only rows so the pre-audit can classify them as red exclusions.',
    },
    output_paths: {
      directory: outputDir,
      json: path.join(outputDir, 'queue.json'),
      csv: path.join(outputDir, 'queue.csv'),
    },
    summary,
    top50,
    queue,
    excluded,
  };

  fs.writeFileSync(path.join(outputDir, 'queue.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outputDir, 'queue.csv'), toCsv(queue));

  console.log(JSON.stringify({
    success: true,
    outputDir,
    jsonPath: path.join(outputDir, 'queue.json'),
    csvPath: path.join(outputDir, 'queue.csv'),
    summary,
    top50,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
