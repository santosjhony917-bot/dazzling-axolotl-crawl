import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const LOG_KEY = 'campina_instagram_bio_menu_v1';
const MENU_COLLECTION_LOG_KEY = 'campina_menu_collection_v1';

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const index = trimmed.indexOf('=');
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const parseJson = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return {};
};

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s._-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const compact = (value) => normalize(value).replace(/[^a-z0-9]+/g, '');
const nameStopwords = new Set([
  'restaurante', 'bar', 'lanchonete', 'pizzaria', 'pizza', 'hamburgueria', 'hamburguer',
  'burger', 'burguer', 'lanche', 'lanches', 'delivery', 'campina', 'grande', 'pb',
  'acai', 'acaiteria', 'sorveteria', 'doceria', 'confeitaria', 'pastelaria', 'pastel',
  'salgado', 'salgados', 'marmitaria', 'marmita', 'quentinha', 'quentinhas', 'grill',
  'espeto', 'espetos', 'espetinho', 'espetaria', 'petiscaria', 'pesticaria', 'sanduiche', 'sanduiches',
  'self', 'service', 'unidade', 'loja', 'centro', 'casa', 'dona', 'seu', 'sua',
  'do', 'da', 'de', 'dos', 'das', 'e', 'a', 'o', 'as', 'os', 'cg',
]);
const commonPersonalTokens = new Set(['chica', 'bia', 'taty', 'socorro', 'mara', 'valdo', 'assis', 'edu', 'genival', 'jailson', 'sandra', 'cida', 'nini']);

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./i, '').toLowerCase(); } catch { return ''; }
};

const getDistinctiveTokens = (row) => normalize(row.google_maps_name || row.name || '')
  .split(/\s+/)
  .map((token) => token.replace(/^[._-]+|[._-]+$/g, ''))
  .filter((token) => token.length >= 3 && !nameStopwords.has(token))
  .slice(0, 6);

const tokenMatchesSlug = (haystack, token) => {
  const variants = new Set([compact(token)]);
  if (/ao$/.test(token)) variants.add(compact(token.replace(/ao$/, 'o')));
  return [...variants].some((variant) => variant && haystack.includes(variant));
};

const platformSlugForIdentity = (url) => {
  const host = hostOf(url);
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (/^(?:cardapiodigital\.io|app\.cardapiodigital\.net)$/i.test(host) && /^[a-f0-9-]{16,}$/i.test(parts[0] || '')) return '';
    if (/^(?:whatsmenu\.com\.br|instadelivery\.com\.br|cardapiodigital\.io|app\.cardapiodigital\.net|meucarrinho\.delivery|pedir\.delivery)$/i.test(host)) return parts[0] || '';
    if (/^(?:anota\.ai|pedido\.anota\.ai|app\.anota\.ai)$/i.test(host)) {
      const lojaIndex = parts.findIndex((part) => /^loja$/i.test(part));
      if (/^p$/i.test(parts[0] || '') && parts[1]) return parts[1];
      if (/^m$/i.test(parts[0] || '')) return parts[1] || parts[0] || '';
      return parts[lojaIndex + 1] || parts[0] || parsed.hostname.split('.')[0] || '';
    }
    if (/^pedido\.brendi\.com\.br$/i.test(host)) return parts[0] || '';
    if (/(?:^|\.)goomer\.app$/i.test(host) || /(?:^|\.)saipos\.com$/i.test(host) || /(?:^|\.)ola\.click$/i.test(host)) return parsed.hostname.split('.')[0] || '';
    if (/(?:^|\.)menudino\.com$/i.test(host)) return parsed.hostname.split('.')[0] || '';
  } catch {
    return '';
  }
  return '';
};

const isInvalidMenuSource = (url, row = {}) => {
  const value = String(url || '');
  const host = hostOf(value);
  if (!value) return false;
  if (/^(?:https?:\/\/)?(?:www\.)?(?:wa\.link|wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com|whatsapp\.com)\b/i.test(value)) return true;
  if (/^(?:contate\.me|contate\.link)$/i.test(host)) return true;
  if (/^(?:tripadvisor\.com\.br|tripadvisor\.com|foursquare\.com|yelp\.com|restaurantguru\.com\.br|restaurantguru\.com|restaurantji\.com|cardapio\.menu|solutudo\.com\.br|apontador\.com\.br|guiamais\.com\.br|telelistas\.net|duogourmet\.com\.br)$/i.test(host)) return true;
  if (/^(?:cardapiodigital\.io|app\.cardapiodigital\.net)$/i.test(host)) {
    try {
      if (/(?:^|[./_-])ifood(?:$|[./_-])/i.test(new URL(value).pathname)) return true;
    } catch {
      if (/(?:^|[./_-])ifood(?:$|[./_-])/i.test(value)) return true;
    }
  }
  if (/^(?:bit\.ly|bitly\.com|tinyurl\.com|cutt\.ly|t\.ly|is\.gd|abre\.ai|encurtador\.com\.br|shorturl\.at|rebrand\.ly|tiny\.cc)$/i.test(host) || /(?:^|\.)page\.link$/i.test(host)) return true;
  if (/^ola\.click$/i.test(host) && /\/products\/?$/i.test(value)) return true;
  if (/^saipos\.com$/i.test(host) && /\/home\/?$/i.test(value)) return true;
  if (/^oia\.99app\.com$/i.test(host)) return true;
  if (/^deltaexpresso\.com\.br$/i.test(host) && /\/lojas\/?$/i.test(value)) return true;
  if (/^(?:www\.)?threads\.com$/i.test(host) || /^(?:www\.)?threads\.net$/i.test(host)) return true;
  if (/^share\.google$/i.test(host)) return true;
  try {
    const parsed = new URL(value);
    if (/(?:^|\.)canva\.com$/i.test(parsed.hostname) && /\/design\/[^/]+\/[^/]+\/edit\/?$/i.test(parsed.pathname)) return true;
    if (/^\/lojas\/?$/i.test(parsed.pathname)
      && !/(?:app\.cardapioweb\.com|instadelivery\.com\.br|anota\.ai|goomer\.app|goomer\.com\.br|saipos\.com|livemenu\.app|deliverydireto\.com\.br|menu\.aiqfome\.com|aiqfome\.com|menudino\.com|dino\.com\.br|pedir\.delivery)$/i.test(host)) {
      return true;
    }
  } catch {}
  const platformSubdomain = host.match(/^([a-z0-9-]+)\.(?:saipos\.com|ola\.click)$/i)?.[1] || '';
  if (platformSubdomain
    && !/(?:cg|pb|campina)$/i.test(platformSubdomain)
    && /(?:^|-|_)?(?:sp|rj|mg|pe|ce|ba|pr|rs|sc|df|go|rn|al|se|pi|ma|pa|am|mt|ms|es|to|ro|rr|ap|ac)$/i.test(platformSubdomain)) {
    return true;
  }
  if (/^whatsmenu\.com\.br$/i.test(host)) {
    const tokens = getDistinctiveTokens(row);
    const haystack = compact(decodeURIComponent(value));
    if (tokens.length && !tokens.some((token) => tokenMatchesSlug(haystack, token))) return true;
  }
  const platformSlug = platformSlugForIdentity(value);
  if (platformSlug) {
    const tokens = getDistinctiveTokens(row);
    const haystack = compact(decodeURIComponent(platformSlug));
    if (tokens.length === 1 && commonPersonalTokens.has(tokens[0])) {
      if (!haystack.includes(compact(row.google_maps_name || row.name || ''))) return true;
      return false;
    }
    if (tokens.length && !tokens.some((token) => tokenMatchesSlug(haystack, token))) return true;
  }
  if (/^img\.deliverydireto\.com\.br$/i.test(host)) return true;
  try {
    const parsed = new URL(value);
    return /\.(?:png|jpe?g|webp|gif|svg)(?:$|[?#])/i.test(parsed.pathname);
  } catch {
    return false;
  }
};

const { data, error } = await supabase
  .from('restaurants')
  .select('id,name,google_maps_name,city,state,menu_status,menu_status_reason,other_url,external_url,other_url_label,coleta_logs')
  .eq('city', 'Campina Grande')
  .eq('state', 'PB')
  .or([
    'other_url.ilike.%wa.link%',
    'external_url.ilike.%wa.link%',
    'other_url.ilike.%wa.me%',
    'external_url.ilike.%wa.me%',
    'other_url.ilike.%whatsapp.com%',
    'external_url.ilike.%whatsapp.com%',
    'other_url.ilike.%ifood%',
    'external_url.ilike.%ifood%',
    'other_url.ilike.%contate.me%',
    'external_url.ilike.%contate.me%',
    'other_url.ilike.%tripadvisor%',
    'external_url.ilike.%tripadvisor%',
    'other_url.ilike.%restaurantguru%',
    'external_url.ilike.%restaurantguru%',
    'other_url.ilike.%foursquare%',
    'external_url.ilike.%foursquare%',
    'other_url.ilike.%bit.ly%',
    'external_url.ilike.%bit.ly%',
    'other_url.ilike.%page.link%',
    'external_url.ilike.%page.link%',
    'other_url.ilike.%shorturl.at%',
    'external_url.ilike.%shorturl.at%',
    'other_url.ilike.%ola.click/products%',
    'external_url.ilike.%ola.click/products%',
    'other_url.ilike.%saipos.com/home%',
    'external_url.ilike.%saipos.com/home%',
    'other_url.ilike.%oia.99app.com%',
    'external_url.ilike.%oia.99app.com%',
    'other_url.ilike.%deltaexpresso.com.br/lojas%',
    'external_url.ilike.%deltaexpresso.com.br/lojas%',
    'other_url.ilike.%whatsmenu.com.br%',
    'external_url.ilike.%whatsmenu.com.br%',
    'other_url.ilike.%anota.ai%',
    'external_url.ilike.%anota.ai%',
    'other_url.ilike.%instadelivery.com.br%',
    'external_url.ilike.%instadelivery.com.br%',
    'other_url.ilike.%cardapiodigital.io%',
    'external_url.ilike.%cardapiodigital.io%',
    'other_url.ilike.%cardapiodigital.net%',
    'external_url.ilike.%cardapiodigital.net%',
    'other_url.ilike.%meucarrinho.delivery%',
    'external_url.ilike.%meucarrinho.delivery%',
    'other_url.ilike.%pedido.brendi.com.br%',
    'external_url.ilike.%pedido.brendi.com.br%',
    'other_url.ilike.%threads.com%',
    'external_url.ilike.%threads.com%',
    'other_url.ilike.%threads.net%',
    'external_url.ilike.%threads.net%',
    'other_url.ilike.%share.google%',
    'external_url.ilike.%share.google%',
    'other_url.ilike.%canva.com/design%',
    'external_url.ilike.%canva.com/design%',
    'other_url.ilike.%/lojas%',
    'external_url.ilike.%/lojas%',
    'other_url.ilike.%saipos.com%',
    'external_url.ilike.%saipos.com%',
    'other_url.ilike.%ola.click%',
    'external_url.ilike.%ola.click%',
    'other_url.ilike.%img.deliverydireto%',
    'external_url.ilike.%img.deliverydireto%',
    'other_url.ilike.%.png%',
    'external_url.ilike.%.png%',
    'other_url.ilike.%.jpg%',
    'external_url.ilike.%.jpg%',
    'other_url.ilike.%.jpeg%',
    'external_url.ilike.%.jpeg%',
    'other_url.ilike.%.webp%',
    'external_url.ilike.%.webp%',
  ].join(','));

if (error) throw error;

const targets = (data || []).filter((row) => isInvalidMenuSource(row.other_url, row) || isInvalidMenuSource(row.external_url, row));

console.log(JSON.stringify({
  apply: APPLY,
  targets: targets.map((row) => ({
    id: row.id,
    name: row.google_maps_name || row.name,
    other_url: row.other_url,
    external_url: row.external_url,
    menu_status: row.menu_status,
  })),
}, null, 2));

if (!APPLY) process.exit(0);

for (const row of targets) {
  const logs = parseJson(row.coleta_logs);
  const now = new Date().toISOString();
  const update = {
    other_url: null,
    external_url: null,
    other_url_label: null,
    menu_status: row.menu_status === 'needs_recollection' ? 'unknown' : row.menu_status,
    menu_status_reason: row.menu_status === 'needs_recollection'
      ? 'Fonte WhatsApp/wa.link removida da etapa de cardapio via Instagram; aguardando destaques ou fonte publica nao-iFood.'
      : row.menu_status_reason,
    coleta_logs: {
      ...logs,
      [LOG_KEY]: {
        ...(logs?.[LOG_KEY] || {}),
        status: 'bio_invalid_menu_source_corrected',
        correctedAt: now,
        invalidUrls: [row.other_url, row.external_url].filter(Boolean),
        reason: 'Fonte de contato/imagem/generica removida; nao e fonte publica de cardapio nesta etapa.',
      },
      [MENU_COLLECTION_LOG_KEY]: {
        ...(logs?.[MENU_COLLECTION_LOG_KEY] || {}),
        status: 'bio_invalid_menu_source_corrected',
        source: 'instagram_bio',
        checkedAt: now,
        reason: 'Fonte de contato/imagem/generica removida; nao e fonte publica de cardapio nesta etapa.',
      },
    },
  };
  const { error: updateError } = await supabase
    .from('restaurants')
    .update(update)
    .eq('id', row.id);
  if (updateError) throw updateError;
}

console.log(`Corrected ${targets.length} invalid WhatsApp menu sources.`);
