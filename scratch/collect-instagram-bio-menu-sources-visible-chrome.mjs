import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const REDO = process.argv.includes('--redo');
const COMPACT = process.argv.includes('--compact');
const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0) || null;
const OFFSET = Number(process.argv.find((arg) => arg.startsWith('--offset='))?.split('=')[1] || 0);
const WAIT_MS = Number(process.argv.find((arg) => arg.startsWith('--wait-ms='))?.split('=')[1] || 2500);
const IDS = (process.argv.find((arg) => arg.startsWith('--ids='))?.split('=')[1] || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const LOG_KEY = 'campina_instagram_bio_menu_v1';
const MENU_COLLECTION_LOG_KEY = 'campina_menu_collection_v1';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'campina-menu-bio-sources', RUN_ID);
const CHECKPOINT_FILE = path.join(OUT_DIR, 'results.jsonl');

fs.mkdirSync(OUT_DIR, { recursive: true });

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const digits = (value) => String(value || '').replace(/\D/g, '');
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' e ')
  .replace(/[^a-z0-9\s._-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const compact = (value) => normalize(value).replace(/[^a-z0-9]+/g, '');
const inCampinaScopeCity = (city, state) => {
  const normalizedCity = normalize(city || '');
  const normalizedState = normalize(state || '');
  const allowedCities = new Set(['campina grande', 'galante', 'sao jose da mata', 'catole de boa vista']);
  return normalizedState === 'pb' && allowedCities.has(normalizedCity);
};

const parseJson = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
};

const decodeHtml = (value) => String(value || '')
  .replace(/\\u002F/g, '/')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();

const decodeExternalUrl = (href) => {
  const raw = String(href || '').trim();
  if (!raw) return '';
  if (/^(?:tel|mailto|sms):/i.test(raw)) return raw;
  try {
    const parsed = new URL(raw, 'https://www.instagram.com');
    if (/^(?:l|lm)\.instagram\.com$/i.test(parsed.hostname)) {
      return parsed.searchParams.get('u') || raw;
    }
    if (/google\./i.test(parsed.hostname) && parsed.pathname === '/url') {
      return parsed.searchParams.get('q') || raw;
    }
    return parsed.href;
  } catch {
    return raw;
  }
};

const normalizeUrl = (url) => {
  const decoded = decodeExternalUrl(url);
  if (!decoded || /^(?:tel|mailto|sms):/i.test(decoded)) return decoded;
  try {
    const parsed = new URL(decoded);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(?:utm_|fbclid|igsh|igshid|mc_|gclid|gbraid|wbraid|rwg_token)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.href.replace(/[),.;]+$/g, '');
  } catch {
    return decoded.replace(/[),.;]+$/g, '');
  }
};

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
};

const isInstagramUrl = (url) => /(?:^|\.)instagram\.com$/i.test(hostOf(url));
const isIfoodUrl = (url) => /(?:^|\.)ifood\.com\.br$/i.test(hostOf(url));
const isIfoodMirrorUrl = (url) => {
  if (isIfoodUrl(url)) return true;
  const host = hostOf(url);
  if (!/(?:cardapiodigital\.io|app\.cardapiodigital\.net)$/i.test(host)) return false;
  try {
    return /(?:^|[./_-])ifood(?:$|[./_-])/i.test(new URL(url).pathname);
  } catch {
    return /(?:^|[./_-])ifood(?:$|[./_-])/i.test(String(url));
  }
};
const isWhatsappUrl = (url) => /^(?:wa\.me|wa\.link)$/i.test(hostOf(url)) || /(?:^|\.)whatsapp\.com$/i.test(hostOf(url));
const isMediaAssetUrl = (url) => {
  const host = hostOf(url);
  try {
    const parsed = new URL(url);
    return /\.(?:png|jpe?g|webp|gif|svg)(?:$|[?#])/i.test(parsed.pathname)
      || /^img\.deliverydireto\.com\.br$/i.test(host)
      || /(?:cloudfront|fbcdn|cdninstagram|googleusercontent)\.net$/i.test(host);
  } catch {
    return false;
  }
};
const isContactShortcutUrl = (url, label = '') => {
  const host = hostOf(url);
  const text = `${url} ${label}`;
  if (/^(?:contate\.me|contate\.link)$/i.test(host)) return true;
  if (/^(?:bit\.ly|bitly\.com|tinyurl\.com|cutt\.ly|t\.ly|is\.gd|abre\.ai|encurtador\.com\.br)$/i.test(host)) {
    return /whats|whatsapp|zap|wpp/i.test(text);
  }
  return false;
};
const isGenericShortener = (url) =>
  /^(?:bit\.ly|bitly\.com|tinyurl\.com|cutt\.ly|t\.ly|is\.gd|abre\.ai|encurtador\.com\.br|shorturl\.at|rebrand\.ly|tiny\.cc)$/i.test(hostOf(url))
  || /(?:^|\.)page\.link$/i.test(hostOf(url));
const isMarketplaceAppLink = (url) =>
  /^(?:oia\.99app\.com|rappi\.com\.br|ubereats\.com)$/i.test(hostOf(url));
const hasOtherStatePlatformSubdomain = (url) => {
  const host = hostOf(url);
  const match = host.match(/^([a-z0-9-]+)\.(?:saipos\.com|ola\.click)$/i);
  if (!match) return false;
  const subdomain = match[1];
  if (/(?:cg|pb|campina)$/i.test(subdomain)) return false;
  return /(?:^|-|_)?(?:sp|rj|mg|pe|ce|ba|pr|rs|sc|df|go|rn|al|se|pi|ma|pa|am|mt|ms|es|to|ro|rr|ap|ac)$/i.test(subdomain);
};
const isSocialOrNoise = (url) => {
  const host = hostOf(url);
  return !host
    || isInstagramUrl(url)
    || /(?:^|\.)meta\.ai$/i.test(host)
    || /(?:^|\.)meta\.com$/i.test(host)
    || /(?:^|\.)facebook\.com$/i.test(host)
    || /(?:^|\.)tiktok\.com$/i.test(host)
    || /(?:^|\.)youtube\.com$/i.test(host)
    || /(?:^|\.)youtu\.be$/i.test(host)
    || /(?:^|\.)threads\.net$/i.test(host)
    || /(?:^|\.)threads\.com$/i.test(host)
    || /(?:^|\.)google\.com$/i.test(host)
    || /^share\.google$/i.test(host)
    || /(?:^|\.)googleusercontent\.com$/i.test(host)
    || /maps\.app\.goo\.gl$/i.test(host);
};

const knownMenuHost = (url) => {
  const host = hostOf(url);
  if (isMediaAssetUrl(url)) return false;
  if (/^ola\.click$/i.test(host)) return false;
  if (/^saipos\.com$/i.test(host)) return false;
  if (/(?:^|\.)ola\.click$/i.test(host)) return true;
  return /(?:app\.cardapioweb\.com|integracao\.cardapioweb\.com|instadelivery\.com\.br|anota\.ai|goomer\.app|goomer\.com\.br|saipos\.com|livemenu\.app|deliverydireto\.com\.br|menu\.aiqfome\.com|aiqfome\.com|menudino\.com|dino\.com\.br|pedir\.delivery)$/i.test(host);
};

const isLinkHub = (url) => {
  const host = hostOf(url);
  return /(?:linktr\.ee|linktree\.com|bio\.site|beacons\.ai|campsite\.bio|taplink\.cc|meuslinks|linkbio|instabio|msha\.ke|flowcode\.com|linkr\.bio|lnk\.bio|linklist\.bio|solo\.to)$/i.test(host);
};

const menuLikeText = (value) => /card[aá]pio|menu|pedido|pedir|pe[çc]a|delivery|deliveri|encomenda|order|comprar|site\s+para\s+pedidos?|fazer\s+pedido/i.test(String(value || ''));

const labelFor = (candidate) => {
  const host = hostOf(candidate.url);
  const text = `${candidate.label || ''} ${candidate.text || ''}`;
  if (/cardapioweb/i.test(host)) return 'Cardapio Web';
  if (/ola\.click/i.test(host)) return 'OlaClick';
  if (/anota\.ai/i.test(host)) return 'Anota AI';
  if (/goomer/i.test(host)) return 'Goomer';
  if (/saipos/i.test(host)) return 'Saipos';
  if (/livemenu/i.test(host)) return 'LiveMenu';
  if (/instadelivery/i.test(host)) return 'InstaDelivery';
  if (/deliverydireto|much/i.test(host)) return 'Delivery Direto';
  if (/aiqfome|menudino|dino/i.test(host)) return 'Cardapio digital';
  if (menuLikeText(text)) return 'Cardapio digital';
  return 'Site oficial';
};

const classifyUrl = (url, label = '', source = 'bio') => {
  const normalized = normalizeUrl(url);
  if (!normalized || /^(?:tel|mailto|sms):/i.test(normalized)) return null;
  if (isMediaAssetUrl(normalized)) return null;
  if (isContactShortcutUrl(normalized, label)) {
    return { url: normalized, label: clean(label), source, kind: 'whatsapp_shortlink', importable: false, priority: 1 };
  }
  if (isGenericShortener(normalized)) {
    return { url: normalized, label: clean(label), source, kind: 'shortlink', importable: false, priority: 2 };
  }
  if (isMarketplaceAppLink(normalized)) {
    return { url: normalized, label: clean(label), source, kind: 'marketplace_app_link', importable: false, priority: 0 };
  }
  try {
    const parsed = new URL(normalized);
    if (/(?:^|\.)canva\.com$/i.test(parsed.hostname) && /\/design\/[^/]+\/[^/]+\/edit\/?$/i.test(parsed.pathname)) {
      return { url: normalized, label: clean(label), source, kind: 'canva_edit_link', importable: false, priority: 0 };
    }
    if (/^\/lojas\/?$/i.test(parsed.pathname) && !knownMenuHost(normalized)) {
      return { url: normalized, label: clean(label), source, kind: 'generic_store_locator', importable: false, priority: 0 };
    }
  } catch {
    // already normalized as URL above.
  }
  if (hasOtherStatePlatformSubdomain(normalized)) {
    return { url: normalized, label: clean(label), source, kind: 'platform_other_state_subdomain', importable: false, priority: 0 };
  }
  if (isSocialOrNoise(normalized)) return null;
  const text = String(label || '');
  const host = hostOf(normalized);
  const pathText = (() => {
    try {
      const parsed = new URL(normalized);
      return `${parsed.hostname}${parsed.pathname}${parsed.search}`;
    } catch {
      return normalized;
    }
  })();
  if (isIfoodMirrorUrl(normalized)) {
    return { url: normalized, label: clean(label), source, kind: 'ifood', importable: false, priority: 0 };
  }
  if (isWhatsappUrl(normalized)) {
    return { url: normalized, label: clean(label), source, kind: 'whatsapp', importable: false, priority: 1, phone: digits(normalized) };
  }
  if (knownMenuHost(normalized)) {
    return { url: normalized, label: clean(label), source, kind: 'known_menu_platform', importable: true, priority: 5 };
  }
  if (isLinkHub(normalized)) {
    return { url: normalized, label: clean(label), source, kind: 'link_hub', importable: false, priority: 2 };
  }
  if (menuLikeText(`${text} ${pathText}`)) {
    return { url: normalized, label: clean(label), source, kind: 'menu_like_site', importable: true, priority: 4 };
  }
  if (host && !/\b(?:api|wa)\.whatsapp\.com$/i.test(host)) {
    return { url: normalized, label: clean(label), source, kind: 'official_site_candidate', importable: false, priority: 1 };
  }
  return null;
};

const collectUrlsFromText = (text, source = 'profile_text') => {
  const candidates = [];
  for (const match of String(text || '').matchAll(/(?:https?:\/\/)?(?:app\.cardapioweb\.com|integracao\.cardapioweb\.com|ola\.click|instadelivery\.com\.br|anota\.ai|goomer\.app|goomer\.com\.br|saipos\.com|livemenu\.app|deliverydireto\.com\.br|menu\.aiqfome\.com|ifood\.com\.br|wa\.me|api\.whatsapp\.com|whatsapp\.com)\/[^\s"'<>)]+/gi)) {
    const raw = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;
    const classified = classifyUrl(raw, '', source);
    if (classified) candidates.push(classified);
  }
  return candidates;
};

const getCardapioWebSlug = (url) => {
  try {
    const parsed = new URL(url);
    if (!/^app\.cardapioweb\.com$/i.test(parsed.hostname)) return '';
    return parsed.pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    return '';
  }
};

const fetchCardapioWebProfileEvidence = async (url) => {
  const slug = getCardapioWebSlug(url);
  if (!slug) return null;
  const apiUrl = `https://integracao.cardapioweb.com/api/menu/company/profile?company=${encodeURIComponent(slug)}&hostname=app.cardapioweb.com`;
  const response = await fetch(apiUrl, {
    headers: {
      accept: 'application/json, text/plain, */*',
      origin: 'https://app.cardapioweb.com',
      referer: `https://app.cardapioweb.com/${encodeURIComponent(slug)}`,
      'user-agent': 'Mozilla/5.0',
    },
  });
  if (!response.ok) return { kind: 'cardapioweb_profile', url, apiUrl, ok: false, status: response.status };
  const data = await response.json();
  return {
    kind: 'cardapioweb_profile',
    url,
    apiUrl,
    ok: true,
    slug,
    name: data.name || null,
    instagram: data.instagram || null,
    city: data.city || null,
    state: data.state || null,
    phone: data.order_whatsapp || data.phone_number || null,
    address: [data.street, data.address_number, data.neighborhood, data.city, data.state].filter(Boolean).join(', '),
  };
};

const fetchLinkHubLinks = async (candidate) => {
  try {
    const response = await fetch(candidate.url, {
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0',
      },
    });
    if (!response.ok) return [];
    const html = await response.text();
    const decodedHtml = decodeHtml(html);
    const found = [];
    const redirected = classifyUrl(response.url, candidate.label, `redirect:${candidate.url}`);
    if (redirected && redirected.url !== candidate.url) found.push(redirected);
    const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of decodedHtml.matchAll(anchorRe)) {
      const href = decodeHtml(match[1]);
      const label = decodeHtml(match[2].replace(/<[^>]+>/g, ' '));
      const classified = classifyUrl(href, label, `link_hub:${candidate.url}`);
      if (classified) found.push(classified);
    }
    for (const match of decodedHtml.matchAll(/https?:\\?\/\\?\/[^"'<>\s)]+/gi)) {
      const href = match[0].replace(/\\\//g, '/');
      const classified = classifyUrl(href, '', `link_hub:${candidate.url}`);
      if (classified) found.push(classified);
    }
    return found;
  } catch (error) {
    return [{ url: candidate.url, label: candidate.label, source: candidate.source, kind: 'link_hub_error', importable: false, error: error.message }];
  }
};

const uniqueCandidates = (candidates) => {
  const byUrl = new Map();
  for (const candidate of candidates.filter(Boolean)) {
    const key = candidate.url;
    const previous = byUrl.get(key);
    if (!previous || (candidate.priority || 0) > (previous.priority || 0)) {
      byUrl.set(key, candidate);
    } else if (previous && candidate.label && !previous.label) {
      previous.label = candidate.label;
    }
  }
  return [...byUrl.values()];
};

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

const candidateMatchesRowSlug = (row, candidate) => {
  const slug = platformSlugForIdentity(candidate.url);
  if (!slug) return true;
  const tokens = getDistinctiveTokens(row);
  if (!tokens.length) return true;
  const haystack = compact(decodeURIComponent(`${slug} ${candidate.label || ''}`));
  if (tokens.length === 1 && commonPersonalTokens.has(tokens[0])) {
    return haystack.includes(compact(row.google_maps_name || row.name || ''));
  }
  return tokens.some((token) => tokenMatchesSlug(haystack, token));
};

const selectBestMenuCandidate = (candidates, row) => candidates
  .filter((candidate) => candidate.importable && !isIfoodMirrorUrl(candidate.url) && candidateMatchesRowSlug(row, candidate))
  .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.url.length - b.url.length)[0] || null;

const extractInstagramUrl = (row) => {
  if (row.instagram) return normalizeUrl(row.instagram);
  const socials = Array.isArray(row.social_networks) ? row.social_networks : [];
  const social = socials.find((item) => String(item?.platform || '').toLowerCase() === 'instagram' && item?.url);
  return social?.url ? normalizeUrl(social.url) : '';
};

async function fetchAllRestaurants() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,address,neighborhood,city,state,phone,whatsapp_url,instagram,social_networks,menu_status,menu_status_reason,menu_last_checked_at,other_url,external_url,other_url_label,coleta_logs,is_deleted')
      .eq('city', 'Campina Grande')
      .eq('state', 'PB')
      .eq('is_deleted', false)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

const alreadyHasNonIfoodSource = (row) =>
  (row.other_url && !isIfoodUrl(row.other_url)) || (row.external_url && !isIfoodUrl(row.external_url));

const alreadyProcessed = (row) => {
  if (REDO) return false;
  const logs = parseJson(row.coleta_logs);
  return Boolean(logs?.[LOG_KEY]?.status);
};

const isTarget = (row) => {
  if (IDS.length) return IDS.includes(row.id);
  if (!extractInstagramUrl(row)) return false;
  if (alreadyHasNonIfoodSource(row)) return false;
  if (row.menu_status === 'found') return false;
  if (alreadyProcessed(row)) return false;
  return true;
};

const makePageExtractor = () => {
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 4 && rect.height > 4 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > 0;
  };
  const links = [...document.querySelectorAll('a[href]')]
    .filter(visible)
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(),
        href: el.href,
        aria: el.getAttribute('aria-label') || '',
        title: el.getAttribute('title') || '',
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });
  const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
  const metaDescription = document.querySelector('meta[name="description"]')?.content
    || document.querySelector('meta[property="og:description"]')?.content
    || '';
  const clickableCandidates = [...document.querySelectorAll('a[href],button,[role="button"],div,span')]
    .filter(visible)
    .map((el) => {
      const rect = el.getBoundingClientRect();
      const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      const href = el.href || el.getAttribute('href') || '';
      const cursor = window.getComputedStyle(el).cursor || '';
      const tag = el.tagName;
      const role = el.getAttribute('role') || '';
      return {
        text,
        href,
        cursor,
        tag,
        role,
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    })
    .filter((item) =>
      item.text.length <= 220
      && item.y >= 0
      && item.y <= Math.max(900, window.innerHeight * 1.2)
      && (
        /(e\s+mais\s+\d+|mais\s+\d+|wa\.me|whatsapp|api\.whatsapp|card[aá]pio|menu|pedido|delivery|site|link|pedir|ifood|cardapioweb|ola\.click|anota|goomer|livemenu)/i.test(`${item.text} ${item.href}`)
        || ((item.tag === 'A' || item.role === 'link') && item.href && !/instagram\.com/i.test(item.href))
        || (item.cursor === 'pointer' && /(?:https?:\/\/|wa\.me|e\s+mais)/i.test(item.text))
      )
    )
    .sort((a, b) => {
      const score = (item) =>
        (/(e\s+mais\s+\d+|mais\s+\d+)/i.test(item.text) ? 100 : 0)
        + (/^(A|BUTTON)$/i.test(item.tag) || item.role === 'button' || item.role === 'link' ? 20 : 0)
        + (item.cursor === 'pointer' ? 10 : 0)
        - Math.min(30, item.width / 40);
      return score(b) - score(a);
    })
    .slice(0, 12);
  const dialogLinks = [...document.querySelectorAll('[role="dialog"] a[href], div[role="dialog"] a[href]')]
    .filter(visible)
    .map((el) => ({
      text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(),
      href: el.href,
      aria: el.getAttribute('aria-label') || '',
    }));
  return { bodyText, metaDescription, links, clickableCandidates, dialogLinks, url: location.href, title: document.title };
};

async function expandBio(page) {
  try {
    const target = await page.evaluate(() => {
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 4 && rect.height > 4 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const candidates = [...document.querySelectorAll('button,[role="button"],span,div')]
        .filter(visible)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
          return { text, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })
        .filter((item) => /^(mais|more)$|clique\.\.\.\s*mais|\.{3}\s*mais/i.test(item.text));
      return candidates[0] || null;
    });
    if (target) {
      await page.mouse.click(target.x, target.y);
      await sleep(700);
    }
  } catch {
    // Instagram often shifts the bio DOM while loading; failing to expand is non-fatal.
  }
}

async function maybeClickBioLinksControl(page, extractedBefore) {
  const hasMultiLinkText = /(?:e\s+mais\s+\d+|mais\s+\d+)/i.test(extractedBefore.bodyText || '')
    || extractedBefore.clickableCandidates.some((item) => /(?:e\s+mais\s+\d+|mais\s+\d+)/i.test(item.text));
  const hasUsefulDirectLink = extractedBefore.links.some((link) => {
    const classified = classifyUrl(link.href, link.text || link.aria || 'direct_link');
    return classified && (classified.importable || classified.kind === 'ifood' || classified.kind === 'link_hub');
  });
  if (!hasMultiLinkText && hasUsefulDirectLink) return null;

  const target = hasMultiLinkText
    ? extractedBefore.clickableCandidates[0]
    : extractedBefore.clickableCandidates.find((item) => {
        const classified = classifyUrl(item.href || item.text, item.text, 'clickable_candidate');
        return classified && !['whatsapp', 'whatsapp_shortlink'].includes(classified.kind)
          && (classified.importable || classified.kind === 'link_hub' || classified.kind === 'shortlink');
      });
  if (!target) return null;
  const beforeUrl = page.url();
  await page.mouse.click(target.x, target.y);
  await sleep(1800);
  const afterUrl = page.url();
  if (afterUrl !== beforeUrl && !/instagram\.com/i.test(afterUrl)) {
    const navigated = { text: target.text, href: afterUrl, navigated: true };
    await page.goto(beforeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleep(1000);
    return navigated;
  }
  return { text: target.text, href: target.href || '', navigated: false };
}

async function closeAutomationTabs(browser, keepPage) {
  const automationUrlRe = /instagram\.com|threads\.com|google\.com\/search|whatsapp\.com|wa\.me|flow\.page|hubt\.com\.br|linktr\.ee|bio\.site|beacons\.ai|campsite\.bio|taplink\.cc|lnk\.bio|solo\.to/i;
  const pages = await browser.pages().catch(() => []);
  for (const candidate of pages) {
    if (candidate === keepPage) continue;
    const url = candidate.url();
    if (!automationUrlRe.test(url)) continue;
    await candidate.close({ runBeforeUnload: false }).catch(() => {});
  }
}

async function collectProfileEvidence(page, instagramUrl) {
  await page.goto(instagramUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(WAIT_MS);
  await expandBio(page);

  const extractedBefore = await page.evaluate(makePageExtractor);
  const clickResult = await maybeClickBioLinksControl(page, extractedBefore);
  const extractedAfter = await page.evaluate(makePageExtractor).catch(() => extractedBefore);

  const candidates = [];
  for (const link of [...extractedBefore.links, ...extractedAfter.links, ...extractedAfter.dialogLinks]) {
    const label = clean([link.text, link.aria, link.title].filter(Boolean).join(' '));
    const classified = classifyUrl(link.href, label, 'instagram_bio');
    if (classified) candidates.push(classified);
  }
  for (const textCandidate of collectUrlsFromText(`${extractedBefore.metaDescription}\n${extractedBefore.bodyText}\n${extractedAfter.bodyText}`)) {
    candidates.push(textCandidate);
  }
  if (clickResult?.navigated && clickResult.href) {
    const classified = classifyUrl(clickResult.href, clickResult.text, 'bio_click_navigation');
    if (classified) candidates.push(classified);
  }

  let unique = uniqueCandidates(candidates);
  const hubCandidates = unique.filter((candidate) => candidate.kind === 'link_hub' || candidate.kind === 'shortlink').slice(0, 4);
  for (const hub of hubCandidates) {
    const hubLinks = await fetchLinkHubLinks(hub);
    unique = uniqueCandidates([...unique, ...hubLinks]);
  }

  const cardapioEvidence = [];
  for (const candidate of unique.filter((item) => getCardapioWebSlug(item.url)).slice(0, 3)) {
    try {
      cardapioEvidence.push(await fetchCardapioWebProfileEvidence(candidate.url));
    } catch (error) {
      cardapioEvidence.push({ kind: 'cardapioweb_profile', url: candidate.url, ok: false, error: error.message });
    }
  }
  const conflictingCardapioUrls = new Set(
    cardapioEvidence
      .filter((item) => {
        if (!item?.ok) return false;
        const city = normalize(item.city || '');
        const state = normalize(item.state || '');
        return (city || state) && !inCampinaScopeCity(item.city, item.state);
      })
      .map((item) => normalizeUrl(item.url)),
  );
  if (conflictingCardapioUrls.size) {
    unique = unique.map((candidate) => conflictingCardapioUrls.has(normalizeUrl(candidate.url))
      ? { ...candidate, kind: 'cardapioweb_location_conflict', importable: false, priority: 0 }
      : candidate);
  }

  return {
    page: {
      url: extractedAfter.url || extractedBefore.url,
      title: extractedAfter.title || extractedBefore.title,
      bodyText: clean(extractedAfter.bodyText || extractedBefore.bodyText).slice(0, 1800),
      metaDescription: clean(extractedAfter.metaDescription || extractedBefore.metaDescription).slice(0, 800),
    },
    clickResult,
    candidates: unique,
    cardapioEvidence: cardapioEvidence.filter(Boolean),
  };
}

async function updateRestaurant(row, result) {
  const now = new Date().toISOString();
  const previousLogs = parseJson(row.coleta_logs);
  const best = result.bestMenuCandidate;
  const importableCandidates = result.evidence.candidates.filter((candidate) => candidate.importable && !isIfoodUrl(candidate.url));
  const ifoodCandidates = result.evidence.candidates.filter((candidate) => candidate.kind === 'ifood');
  const logEntry = {
    status: result.status,
    checkedAt: now,
    instagram: result.instagramUrl,
    selectedUrl: best?.url || null,
    selectedLabel: best ? labelFor(best) : null,
    importableCount: importableCandidates.length,
    ifoodCount: ifoodCandidates.length,
    candidates: result.evidence.candidates.slice(0, 15).map((candidate) => ({
      url: candidate.url,
      label: candidate.label || null,
      source: candidate.source,
      kind: candidate.kind,
      importable: candidate.importable,
      priority: candidate.priority,
      error: candidate.error || null,
    })),
    cardapioEvidence: result.evidence.cardapioEvidence,
    clickResult: result.evidence.clickResult,
    profileTextExcerpt: result.evidence.page.bodyText,
  };

  const update = {
    menu_last_checked_at: now,
    coleta_logs: {
      ...previousLogs,
      [LOG_KEY]: logEntry,
      [MENU_COLLECTION_LOG_KEY]: best
        ? {
            status: 'bio_menu_source_found',
            source: 'instagram_bio',
            checkedAt: now,
            url: best.url,
            label: labelFor(best),
          }
        : {
            ...(previousLogs?.[MENU_COLLECTION_LOG_KEY] || {}),
            status: result.status,
            source: 'instagram_bio',
            checkedAt: now,
            reason: result.reason || null,
            onlyIfood: ifoodCandidates.length > 0 && importableCandidates.length === 0,
          },
    },
  };

  if (best) {
    update.other_url = best.url;
    update.external_url = best.url;
    update.other_url_label = labelFor(best);
    update.menu_status = row.menu_status === 'found' ? row.menu_status : 'needs_recollection';
    update.menu_status_reason = `Fonte publica de cardapio encontrada no link da bio do Instagram (${labelFor(best)}); aguardando coleta estruturada.`;
  }

  if (!APPLY) return { applied: false, update };
  const { error } = await supabase
    .from('restaurants')
    .update(update)
    .eq('id', row.id);
  if (error) throw error;
  return { applied: true, update };
}

async function processRestaurant(row, page) {
  const instagramUrl = extractInstagramUrl(row);
  const evidence = await collectProfileEvidence(page, instagramUrl);
  const bestMenuCandidate = selectBestMenuCandidate(evidence.candidates, row);
  const importableCount = evidence.candidates.filter((candidate) => candidate.importable && !isIfoodUrl(candidate.url)).length;
  const ifoodCount = evidence.candidates.filter((candidate) => candidate.kind === 'ifood').length;
  const blocked = /sorry|try again later|temporarily blocked|challenge|required|login/i.test(`${evidence.page.title} ${evidence.page.bodyText}`)
    && !/posts|seguidores|followers|card/i.test(evidence.page.bodyText);
  let status = 'bio_no_public_menu_link';
  let reason = 'no_menu_like_url_in_instagram_bio';
  if (bestMenuCandidate) {
    status = 'bio_menu_source_found';
    reason = 'public_non_ifood_menu_source_found';
  } else if (ifoodCount > 0) {
    status = 'bio_only_ifood';
    reason = 'only_ifood_link_found';
  } else if (blocked) {
    status = 'blocked_or_login_required';
    reason = 'instagram_profile_not_readable';
  }
  const result = { rowId: row.id, name: row.google_maps_name || row.name, instagramUrl, status, reason, evidence, bestMenuCandidate, importableCount, ifoodCount };
  const updateResult = await updateRestaurant(row, result);
  return { ...result, updateResult };
}

const rows = (await fetchAllRestaurants())
  .filter(isTarget)
  .slice(OFFSET, LIMIT ? OFFSET + LIMIT : undefined);

console.log(JSON.stringify({
  apply: APPLY,
  runId: RUN_ID,
  totalTargetsThisRun: rows.length,
  offset: OFFSET,
  limit: LIMIT,
  outDir: OUT_DIR,
}, null, 2));

if (!rows.length) process.exit(0);

const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
const page = await browser.newPage();
page.setDefaultTimeout(30000);

const summary = {
  processed: 0,
  found: 0,
  onlyIfood: 0,
  notFound: 0,
  blocked: 0,
  errors: 0,
};

try {
  for (const row of rows) {
    const label = row.google_maps_name || row.name;
    try {
      if (!COMPACT || summary.processed % 10 === 0) console.log(`[${summary.processed + 1}/${rows.length}] ${label}`);
      await closeAutomationTabs(browser, page);
      const result = await processRestaurant(row, page);
      summary.processed += 1;
      if (result.status === 'bio_menu_source_found') summary.found += 1;
      else if (result.status === 'bio_only_ifood') summary.onlyIfood += 1;
      else if (result.status === 'blocked_or_login_required') summary.blocked += 1;
      else summary.notFound += 1;
      fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify({
        id: row.id,
        name: label,
        instagram: result.instagramUrl,
        status: result.status,
        reason: result.reason,
        selectedUrl: result.bestMenuCandidate?.url || null,
        selectedLabel: result.bestMenuCandidate ? labelFor(result.bestMenuCandidate) : null,
        importableCount: result.importableCount,
        ifoodCount: result.ifoodCount,
      })}\n`);
      if (!COMPACT || result.status !== 'bio_no_public_menu_link') {
        console.log(`  -> ${label} | ${result.status}${result.bestMenuCandidate ? ` | ${labelFor(result.bestMenuCandidate)} | ${result.bestMenuCandidate.url}` : ''}`);
      }
      await closeAutomationTabs(browser, page);
      await sleep(1200 + Math.floor(Math.random() * 900));
    } catch (error) {
      summary.processed += 1;
      summary.errors += 1;
      fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify({
        id: row.id,
        name: label,
        instagram: extractInstagramUrl(row),
        status: 'error',
        error: error.message,
      })}\n`);
      console.error(`  !! ${error.message}`);
      await closeAutomationTabs(browser, page);
      await sleep(2500);
    }
  }
} finally {
  await page.close().catch(() => {});
  await browser.disconnect();
}

console.log(JSON.stringify(summary, null, 2));
