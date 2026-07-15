import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CITY = 'João Pessoa';
const STATE = 'PB';

const clean = (value) => String(value ?? '').trim();

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function platformOf(value) {
  const url = clean(value).toLowerCase();
  if (!url) return '';
  if (url.includes('ifood.')) return 'ifood_ignore';
  if (url.includes('instadelivery')) return 'instadelivery';
  if (url.includes('cardapioweb')) return 'cardapioweb';
  if (url.includes('pedido.anota.ai')) return 'anota_ai';
  if (url.includes('delivery.yooga') || url.includes('yooga.app')) return 'yooga';
  if (url.includes('whatsmenu')) return 'whatsmenu';
  if (url.includes('menu.brendi')) return 'brendi';
  if (url.includes('cardapiodigital')) return 'cardapiodigital';
  if (url.includes('meucarrinho')) return 'meucarrinho';
  if (url.includes('restaurantlogin') || url.includes('pizzariatanoponto')) return 'restaurantlogin';
  if (url.includes('menudino')) return 'menudino';
  if (url.includes('livemenu')) return 'livemenu';
  if (url.includes('menu-pick') || url.includes('menupick')) return 'menupick';
  if (url.includes('ola.click') || url.includes('olaclick')) return 'olaclick';
  if (url.includes('goomer')) return 'goomer';
  if (url.includes('fastydiggy') || url.includes('fastdiggy')) return 'fastydiggy';
  if (url.includes('fazerpedido')) return 'fazerpedido';
  if (url.includes('pedir.')) return 'pedir';
  if (url.includes('deliverydireto')) return 'deliverydireto';
  if (url.includes('linktr.ee') || url.includes('bio.site') || url.includes('beacons.ai') || url.includes('bit.ly') || url.includes('taplink') || url.includes('linkbio')) return 'hub';
  if (url.includes('whatsapp') || url.includes('wa.me') || url.includes('api.whatsapp')) return 'whatsapp_only';
  return 'unknown';
}

async function fetchAll(table, select, decorate) {
  const out = [];
  let from = 0;
  for (;;) {
    let query = supabase.from(table).select(select).range(from, from + 999);
    if (decorate) query = decorate(query);
    const { data, error } = await query;
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out;
}

function extractUrls(row) {
  const urls = [];
  for (const field of ['external_url', 'other_url', 'whatsapp_url', 'ifood_url', 'instagram']) {
    if (clean(row[field])) urls.push({ field, url: clean(row[field]) });
  }

  const social = parseJson(row.social_networks, []);
  if (Array.isArray(social)) {
    for (const entry of social) {
      if (clean(entry?.url)) urls.push({ field: 'social_networks', url: clean(entry.url) });
    }
  }

  const logs = parseJson(row.coleta_logs, {});
  const text = JSON.stringify(logs || {});
  for (const match of text.matchAll(/https?:\/\/[^"\s<>]+/g)) {
    urls.push({ field: 'coleta_logs', url: match[0] });
  }

  const deduped = [];
  const seen = new Set();
  for (const item of urls) {
    const key = item.url.replace(/[),.;]+$/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ ...item, url: key, platform: platformOf(key) });
  }
  return deduped;
}

const restaurants = await fetchAll(
  'restaurants',
  'id,name,city,state,is_deleted,external_url,other_url,whatsapp_url,ifood_url,instagram,social_networks,coleta_logs',
  (query) => query.eq('city', CITY).eq('state', STATE).or('is_deleted.is.null,is_deleted.eq.false'),
);

const categories = await fetchAll(
  'menu_categories',
  'id,restaurant_id,is_active,restaurants!inner(city,state)',
  (query) => query.eq('restaurants.city', CITY).eq('restaurants.state', STATE).or('is_active.is.null,is_active.eq.true'),
);

const activeMenuIds = new Set(categories.map((category) => category.restaurant_id));
const supported = new Set(['instadelivery', 'cardapioweb', 'anota_ai', 'yooga', 'whatsmenu', 'brendi', 'cardapiodigital', 'meucarrinho', 'restaurantlogin']);
const genericBrowser = new Set(['fazerpedido', 'pedir', 'goomer', 'olaclick', 'deliverydireto', 'menudino', 'livemenu', 'menupick', 'fastydiggy']);

const rows = restaurants.map((restaurant) => {
  const urls = extractUrls(restaurant).filter((item) => item.platform && !['ifood_ignore', 'whatsapp_only'].includes(item.platform));
  const strong = urls.filter((item) => !['hub', 'unknown'].includes(item.platform));
  return {
    id: restaurant.id,
    name: restaurant.name,
    has_menu: activeMenuIds.has(restaurant.id),
    urls,
    strong,
  };
}).filter((row) => row.urls.length);

const withoutMenu = rows.filter((row) => !row.has_menu);
const strongWithoutMenu = withoutMenu.filter((row) => row.strong.length);
const supportedWithoutMenu = strongWithoutMenu.filter((row) => row.strong.some((item) => supported.has(item.platform)));
const genericBrowserWithoutMenu = strongWithoutMenu.filter((row) => (
  !row.strong.some((item) => supported.has(item.platform))
  && row.strong.some((item) => genericBrowser.has(item.platform))
));
const hubOnlyWithoutMenu = withoutMenu.filter((row) => !row.strong.length && row.urls.some((item) => item.platform === 'hub'));

const byPlatform = {};
for (const row of strongWithoutMenu) {
  for (const platform of new Set(row.strong.map((item) => item.platform))) {
    byPlatform[platform] = (byPlatform[platform] || 0) + 1;
  }
}

const queue = supportedWithoutMenu.map((row) => {
  const source = row.strong.find((item) => supported.has(item.platform));
  return {
    restaurant_id: row.id,
    name: row.name,
    platform: source.platform,
    tier: 'green',
    priority_score: 70,
    source_field: source.field,
    source_url: source.url,
    raw_source_url: source.url,
    city: CITY,
    state: STATE,
    risk_flags: ['inventory_without_active_menu_supported_source'],
    eligible_for_queue: true,
    collection_hint: 'structured_source_ready_from_inventory',
  };
});

const generic_queue = genericBrowserWithoutMenu.map((row) => {
  const source = row.strong.find((item) => genericBrowser.has(item.platform));
  return {
    restaurant_id: row.id,
    name: row.name,
    platform: source.platform,
    tier: 'green',
    priority_score: 55,
    source_field: source.field,
    source_url: source.url,
    raw_source_url: source.url,
    city: CITY,
    state: STATE,
    risk_flags: ['inventory_without_active_menu_generic_browser_source'],
    eligible_for_queue: true,
    collection_hint: 'generic_browser_visible_dom_click_capture',
  };
});

const hub_queue = hubOnlyWithoutMenu.map((row) => {
  const source = row.urls.find((item) => item.platform === 'hub');
  return {
    restaurant_id: row.id,
    name: row.name,
    platform: source.platform,
    tier: 'yellow',
    priority_score: 45,
    source_field: source.field,
    source_url: source.url,
    raw_source_url: source.url,
    city: CITY,
    state: STATE,
    risk_flags: ['hub_requires_link_expansion_before_collection'],
    eligible_for_queue: true,
    collection_hint: 'expand_hub_then_validate_menu_source',
  };
});

const out = {
  generated_at: new Date().toISOString(),
  city: CITY,
  state: STATE,
  restaurants_total: restaurants.length,
  active_menu_restaurants: activeMenuIds.size,
  remaining_without_menu: restaurants.length - activeMenuIds.size,
  restaurants_with_any_non_ifood_url: rows.length,
  without_menu_with_strong_menu_url: strongWithoutMenu.length,
  without_menu_supported_now: supportedWithoutMenu.length,
  without_menu_generic_browser_now: genericBrowserWithoutMenu.length,
  without_menu_hub_only: hubOnlyWithoutMenu.length,
  by_platform_without_menu_strong: byPlatform,
  sample_supported: supportedWithoutMenu.slice(0, 30).map((row) => ({
    id: row.id,
    name: row.name,
    platforms: [...new Set(row.strong.map((item) => item.platform))],
    url: row.strong.find((item) => supported.has(item.platform))?.url,
  })),
  queue,
  generic_queue,
  hub_queue,
};

console.log(JSON.stringify(out, null, 2));
