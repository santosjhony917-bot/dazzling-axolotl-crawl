import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const REDO = process.argv.includes('--redo');
const ALL = process.argv.includes('--all');
const COMPACT = process.argv.includes('--compact');
const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0) || null;
const OFFSET = Number(process.argv.find((arg) => arg.startsWith('--offset='))?.split('=')[1] || 0);
const WAIT_MS = Number(process.argv.find((arg) => arg.startsWith('--wait-ms='))?.split('=')[1] || 3000);
const IDS = (process.argv.find((arg) => arg.startsWith('--ids='))?.split('=')[1] || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const LOG_KEY = 'campina_google_menu_search_v1';
const MENU_COLLECTION_LOG_KEY = 'campina_menu_collection_v1';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'campina-google-menu-sources', RUN_ID);
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
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const digits = (value) => String(value || '').replace(/\D/g, '');
const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' e ')
  .replace(/[^a-z0-9\s._-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const compact = (value) => normalize(value).replace(/[^a-z0-9]+/g, '');

const parseJson = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return {};
};

const decodeExternalUrl = (href) => {
  const raw = String(href || '').trim();
  if (!raw) return '';
  if (/^(?:tel|mailto|sms):/i.test(raw)) return raw;
  try {
    const parsed = new URL(raw, 'https://www.google.com');
    if (/google\./i.test(parsed.hostname) && parsed.pathname === '/url') {
      return parsed.searchParams.get('q') || raw;
    }
    if (/^(?:l|lm)\.instagram\.com$/i.test(parsed.hostname)) {
      return parsed.searchParams.get('u') || raw;
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
  try { return new URL(url).hostname.replace(/^www\./i, '').toLowerCase(); } catch { return ''; }
};

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
const isGenericShortener = (url) =>
  /^(?:bit\.ly|bitly\.com|tinyurl\.com|cutt\.ly|t\.ly|is\.gd|abre\.ai|encurtador\.com\.br|shorturl\.at|rebrand\.ly|tiny\.cc)$/i.test(hostOf(url))
  || /(?:^|\.)page\.link$/i.test(hostOf(url));
const isMediaAssetUrl = (url) => {
  try {
    const parsed = new URL(url);
    return /\.(?:png|jpe?g|webp|gif|svg|pdf)(?:$|[?#])/i.test(parsed.pathname)
      || /^img\.deliverydireto\.com\.br$/i.test(hostOf(url))
      || /(?:cloudfront|fbcdn|cdninstagram|googleusercontent)\.net$/i.test(hostOf(url));
  } catch {
    return false;
  }
};
const isSocialOrNoise = (url) => {
  const host = hostOf(url);
  return !host
    || /(?:^|\.)instagram\.com$/i.test(host)
    || /(?:^|\.)facebook\.com$/i.test(host)
    || /(?:^|\.)tiktok\.com$/i.test(host)
    || /(?:^|\.)youtube\.com$/i.test(host)
    || /(?:^|\.)youtu\.be$/i.test(host)
    || /(?:^|\.)threads\.net$/i.test(host)
    || /(?:^|\.)threads\.com$/i.test(host)
    || /(?:^|\.)google\.com$/i.test(host)
    || /(?:^|\.)google\.com\.br$/i.test(host)
    || /^share\.google$/i.test(host)
    || /maps\.app\.goo\.gl$/i.test(host)
    || /(?:^|\.)googleusercontent\.com$/i.test(host);
};
const isMarketplaceAppLink = (url) =>
  /^(?:oia\.99app\.com|rappi\.com\.br|ubereats\.com)$/i.test(hostOf(url));
const isDirectoryOrReviewUrl = (url) =>
  /(?:^|\.)?(?:tripadvisor\.com\.br|tripadvisor\.com|foursquare\.com|yelp\.com|restaurantguru\.com\.br|restaurantguru\.com|restaurantji\.com|cardapio\.menu|solutudo\.com\.br|apontador\.com\.br|guiamais\.com\.br|telelistas\.net|duogourmet\.com\.br)$/i.test(hostOf(url));
const hasOtherStatePlatformSubdomain = (url) => {
  const host = hostOf(url);
  const match = host.match(/^([a-z0-9-]+)\.(?:saipos\.com|ola\.click)$/i);
  if (!match) return false;
  const subdomain = match[1];
  if (/(?:cg|pb|campina)$/i.test(subdomain)) return false;
  return /(?:^|-|_)?(?:sp|rj|mg|pe|ce|ba|pr|rs|sc|df|go|rn|al|se|pi|ma|pa|am|mt|ms|es|to|ro|rr|ap|ac)$/i.test(subdomain);
};
const knownMenuHost = (url) => {
  const host = hostOf(url);
  if (/^ola\.click$/i.test(host)) return false;
  if (/^saipos\.com$/i.test(host)) return false;
  if (/(?:^|\.)ola\.click$/i.test(host)) return true;
  return /(?:app\.cardapioweb\.com|integracao\.cardapioweb\.com|instadelivery\.com\.br|anota\.ai|goomer\.app|goomer\.com\.br|saipos\.com|livemenu\.app|deliverydireto\.com\.br|menu\.aiqfome\.com|aiqfome\.com|menudino\.com|dino\.com\.br|pedir\.delivery|meucarrinho\.delivery|cardapiodigital\.io|app\.cardapiodigital\.net|whatsmenu\.com\.br)$/i.test(host);
};
const isLinkHub = (url) =>
  /(?:linktr\.ee|linktree\.com|bio\.site|beacons\.ai|campsite\.bio|taplink\.cc|meuslinks|linkbio|instabio|msha\.ke|flowcode\.com|linkr\.bio|lnk\.bio|linklist\.bio|solo\.to)$/i.test(hostOf(url));
const menuLikeText = (value) =>
  /cardapio|card[aá]pio|menu|pedido|pedir|peca|pe[çc]a|delivery|deliveri|encomenda|order|comprar|site\s+para\s+pedidos?|fazer\s+pedido/i.test(String(value || ''));

const classifyUrl = (url, label = '', source = 'google') => {
  const normalized = normalizeUrl(url);
  if (!normalized || /^(?:tel|mailto|sms):/i.test(normalized)) return null;
  if (isIfoodMirrorUrl(normalized)) return { url: normalized, label: clean(label), source, kind: 'ifood', importable: false, priority: 0 };
  if (isWhatsappUrl(normalized)) return { url: normalized, label: clean(label), source, kind: 'whatsapp', importable: false, priority: 1 };
  if (isGenericShortener(normalized)) return { url: normalized, label: clean(label), source, kind: 'shortlink', importable: false, priority: 2 };
  if (isMediaAssetUrl(normalized)) return null;
  if (isDirectoryOrReviewUrl(normalized)) return null;
  if (isMarketplaceAppLink(normalized)) return { url: normalized, label: clean(label), source, kind: 'marketplace_app_link', importable: false, priority: 0 };
  if (hasOtherStatePlatformSubdomain(normalized)) return { url: normalized, label: clean(label), source, kind: 'platform_other_state_subdomain', importable: false, priority: 0 };
  try {
    const parsed = new URL(normalized);
    if (/(?:^|\.)canva\.com$/i.test(parsed.hostname) && /\/design\/[^/]+\/[^/]+\/edit\/?$/i.test(parsed.pathname)) return null;
    if (/^\/lojas\/?$/i.test(parsed.pathname) && !knownMenuHost(normalized)) return { url: normalized, label: clean(label), source, kind: 'generic_store_locator', importable: false, priority: 0 };
  } catch {}
  if (isSocialOrNoise(normalized)) return null;
  const pageText = `${label} ${normalized}`;
  if (knownMenuHost(normalized)) return { url: normalized, label: clean(label), source, kind: 'known_menu_platform', importable: true, priority: 6 };
  if (isLinkHub(normalized)) return { url: normalized, label: clean(label), source, kind: 'link_hub', importable: false, priority: 2 };
  if (menuLikeText(pageText)) return { url: normalized, label: clean(label), source, kind: 'menu_like_site', importable: true, priority: 4 };
  return { url: normalized, label: clean(label), source, kind: 'official_site_candidate', importable: false, priority: 1 };
};

const labelFor = (candidate) => {
  const host = hostOf(candidate.url);
  if (/cardapioweb/i.test(host)) return 'Cardapio Web';
  if (/ola\.click/i.test(host)) return 'OlaClick';
  if (/anota\.ai/i.test(host)) return 'Anota AI';
  if (/goomer/i.test(host)) return 'Goomer';
  if (/saipos/i.test(host)) return 'Saipos';
  if (/livemenu/i.test(host)) return 'LiveMenu';
  if (/instadelivery/i.test(host)) return 'InstaDelivery';
  if (/deliverydireto|much/i.test(host)) return 'Delivery Direto';
  if (/aiqfome|menudino|dino|cardapiodigital|whatsmenu|meucarrinho/i.test(host)) return 'Cardapio digital';
  if (menuLikeText(`${candidate.label || ''} ${candidate.url}`)) return 'Cardapio digital';
  return 'Site oficial';
};

const inCampinaScopeCity = (city, state) => {
  const normalizedCity = normalize(city || '');
  const normalizedState = normalize(state || '');
  const allowedCities = new Set(['campina grande', 'galante', 'sao jose da mata', 'catole de boa vista']);
  return normalizedState === 'pb' && allowedCities.has(normalizedCity);
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

const fetchCardapioWebProfile = async (url) => {
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
  if (!response.ok) return { ok: false, status: response.status, apiUrl, slug };
  const data = await response.json();
  return {
    ok: true,
    apiUrl,
    slug,
    name: data.name || null,
    city: data.city || null,
    state: data.state || null,
    phone: data.order_whatsapp || data.phone_number || null,
    address: [data.street, data.address_number, data.neighborhood, data.city, data.state].filter(Boolean).join(', '),
  };
};

const nameStopwords = new Set([
  'restaurante', 'bar', 'lanchonete', 'pizzaria', 'pizza', 'hamburgueria', 'hamburguer',
  'burger', 'burguer', 'lanche', 'lanches', 'delivery', 'campina', 'grande', 'pb',
  'acai', 'acaiteria', 'sorveteria', 'doceria', 'confeitaria', 'pastelaria', 'pastel',
  'salgado', 'salgados', 'marmitaria', 'marmita', 'quentinha', 'quentinhas', 'grill',
  'espeto', 'espetos', 'espetinho', 'espetaria', 'petiscaria', 'pesticaria', 'sanduiche', 'sanduiches',
  'self', 'service', 'unidade', 'loja', 'centro', 'casa', 'dona', 'seu', 'sua',
  'do', 'da', 'de', 'dos', 'das', 'e', 'a', 'o', 'as', 'os', 'cg', 'cafeteria', 'cafe',
]);
const commonPersonalTokens = new Set(['chica', 'bia', 'taty', 'socorro', 'mara', 'valdo', 'assis', 'edu', 'genival', 'jailson', 'sandra', 'cida', 'nini']);

const distinctiveTokens = (row) => normalize(row.google_maps_name || row.name || '')
  .split(/\s+/)
  .map((token) => token.replace(/^[._-]+|[._-]+$/g, ''))
  .filter((token) => token.length >= 3 && !nameStopwords.has(token))
  .slice(0, 8);

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
  const tokens = distinctiveTokens(row);
  if (!tokens.length) return true;
  const haystack = compact(decodeURIComponent(`${slug} ${candidate.label || ''}`));
  if (tokens.length === 1 && commonPersonalTokens.has(tokens[0])) {
    return haystack.includes(compact(row.google_maps_name || row.name || ''));
  }
  return tokens.some((token) => tokenMatchesSlug(haystack, token));
};

const rowPhoneDigits = (row) => {
  const all = [row.phone, row.whatsapp_url].map(digits).filter((value) => value.length >= 8);
  return [...new Set(all.map((value) => value.slice(-8)))];
};

const addressNeedles = (row) => {
  const parts = [row.address, row.number, row.neighborhood].filter(Boolean);
  const normalized = normalize(parts.join(' '));
  const streetTokens = normalize(row.address || '')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !['rua', 'avenida', 'av', 'r', 'travessa', 'rodovia', 'br'].includes(token))
    .slice(0, 4);
  return {
    normalized,
    streetTokens,
    number: clean(row.number || '').replace(/[^\w/-]/g, ''),
    neighborhood: normalize(row.neighborhood || ''),
  };
};

const evidenceScores = (row, evidenceText, url = '') => {
  const haystack = normalize(`${evidenceText} ${decodeURIComponent(url)}`);
  const compactHaystack = compact(haystack);
  const tokens = distinctiveTokens(row);
  const tokenHits = tokens.filter((token) => compactHaystack.includes(compact(token)));
  const phones = rowPhoneDigits(row);
  const phoneMatch = phones.some((phone) => digits(evidenceText).includes(phone) || digits(url).includes(phone));
  const needles = addressNeedles(row);
  const numberMatch = needles.number && haystack.includes(normalize(needles.number));
  const streetHitCount = needles.streetTokens.filter((token) => haystack.includes(token)).length;
  const addressMatch = Boolean(numberMatch && streetHitCount >= 1);
  const neighborhoodMatch = Boolean(needles.neighborhood && needles.neighborhood.length >= 4 && haystack.includes(needles.neighborhood));
  const campinaSignal = /\bcampina grande\b|\bcg\b|campinagrande/.test(haystack) && !/campina grande do sul/.test(haystack);
  const pbSignal = /(^|[^a-z])pb([^a-z]|$)|paraiba/.test(haystack);
  const locationSignal = phoneMatch || addressMatch || neighborhoodMatch || campinaSignal || (campinaSignal && pbSignal);
  const compactRowName = compact(row.google_maps_name || row.name || '');
  const compactNameHit = compactRowName.length >= 8 && compactHaystack.includes(compactRowName);
  const nameSignal = compactNameHit || tokenHits.length >= Math.min(2, Math.max(1, tokens.length)) || (tokens.length === 1 && tokenHits.length === 1);
  return {
    tokens,
    tokenHits,
    phoneMatch,
    addressMatch,
    neighborhoodMatch,
    campinaSignal,
    pbSignal,
    nameSignal,
    locationSignal,
    compactNameHit,
  };
};

const validateMenuCandidate = async (page, row, candidate) => {
  let profile = null;
  if (getCardapioWebSlug(candidate.url)) {
    profile = await fetchCardapioWebProfile(candidate.url).catch((error) => ({ ok: false, error: error.message }));
    if (profile?.ok) {
      const text = `${profile.name || ''} ${profile.address || ''} ${profile.city || ''} ${profile.state || ''} ${profile.phone || ''}`;
      const scores = evidenceScores(row, text, candidate.url);
      const locationOk = inCampinaScopeCity(profile.city, profile.state) || scores.phoneMatch || scores.addressMatch;
      const accepted = locationOk && (scores.nameSignal || scores.phoneMatch || scores.addressMatch);
      return {
        accepted,
        reason: accepted ? 'cardapioweb_profile_matches_unit' : 'cardapioweb_profile_did_not_match_unit',
        candidate,
        scores,
        profile,
        finalUrl: candidate.url,
        pageTitle: null,
        textExcerpt: text,
      };
    }
  }

  await page.goto(candidate.url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await sleep(WAIT_MS);
  const snapshot = await page.evaluate(() => {
    const compactText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const links = [...document.querySelectorAll('a[href]')].slice(0, 180).map((el) => ({
      text: compactText(el.innerText || el.textContent || ''),
      href: el.href,
      aria: el.getAttribute('aria-label') || '',
    }));
    return {
      url: location.href,
      title: document.title,
      meta: document.querySelector('meta[name="description"]')?.content
        || document.querySelector('meta[property="og:description"]')?.content
        || '',
      bodyText: compactText(document.body?.innerText || '').slice(0, 12000),
      links,
    };
  }).catch(() => ({ url: page.url(), title: '', meta: '', bodyText: '', links: [] }));

  const finalUrl = normalizeUrl(snapshot.url || candidate.url);
  const finalClass = classifyUrl(finalUrl, candidate.label, 'candidate_final_url') || candidate;
  const pageText = `${snapshot.title} ${snapshot.meta} ${snapshot.bodyText}`;
  const scores = evidenceScores(row, pageText, finalUrl);
  const pageHasMenuSignal = knownMenuHost(finalUrl) || menuLikeText(`${candidate.label} ${finalUrl} ${pageText}`);
  const accepted = !isIfoodMirrorUrl(finalUrl)
    && !isWhatsappUrl(finalUrl)
    && !isSocialOrNoise(finalUrl)
    && !isDirectoryOrReviewUrl(finalUrl)
    && !isMediaAssetUrl(finalUrl)
    && pageHasMenuSignal
    && candidateMatchesRowSlug(row, { ...candidate, url: finalUrl })
    && (scores.nameSignal || scores.phoneMatch || scores.addressMatch)
    && scores.locationSignal;

  return {
    accepted,
    reason: accepted ? 'page_matches_name_and_unit' : 'page_not_enough_unit_evidence',
    candidate: { ...candidate, url: finalUrl, kind: finalClass.kind || candidate.kind },
    scores,
    profile,
    finalUrl,
    pageTitle: snapshot.title || null,
    textExcerpt: clean(pageText).slice(0, 1800),
    links: snapshot.links.slice(0, 40),
  };
};

const extractGoogleCandidates = async (page) => {
  await page.waitForSelector('body', { timeout: 30000 }).catch(() => {});
  await sleep(WAIT_MS);
  const raw = await page.evaluate(() => {
    const compactText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const anchors = [...document.querySelectorAll('a[href]')].map((el) => {
      const container = el.closest('div');
      return {
        href: el.href,
        text: compactText(el.innerText || el.textContent || ''),
        aria: el.getAttribute('aria-label') || '',
        title: el.getAttribute('title') || '',
        snippet: compactText(container?.innerText || '').slice(0, 700),
      };
    });
    return {
      title: document.title,
      bodyText: compactText(document.body?.innerText || '').slice(0, 6000),
      anchors,
    };
  });
  const candidates = [];
  for (const item of raw.anchors) {
    const label = clean([item.text, item.aria, item.title, item.snippet].filter(Boolean).join(' '));
    const classified = classifyUrl(item.href, label, 'google_result');
    if (!classified) continue;
    if (['ifood', 'whatsapp', 'marketplace_app_link', 'generic_store_locator', 'platform_other_state_subdomain'].includes(classified.kind)) continue;
    candidates.push(classified);
  }
  const byUrl = new Map();
  for (const candidate of candidates) {
    const previous = byUrl.get(candidate.url);
    if (!previous || (candidate.priority || 0) > (previous.priority || 0)) byUrl.set(candidate.url, candidate);
  }
  return {
    page: raw,
    candidates: [...byUrl.values()]
      .filter((candidate) => candidate.kind !== 'official_site_candidate' || menuLikeText(`${candidate.label} ${candidate.url}`))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.url.length - b.url.length)
      .slice(0, 10),
  };
};

const extractPageLinks = async (page, sourceUrl) => {
  const snapshot = await page.evaluate(() => {
    const compactText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('a[href]')].slice(0, 180).map((el) => ({
      href: el.href,
      text: compactText(el.innerText || el.textContent || ''),
      aria: el.getAttribute('aria-label') || '',
    }));
  }).catch(() => []);
  const found = [];
  for (const link of snapshot) {
    const label = clean([link.text, link.aria].filter(Boolean).join(' '));
    const classified = classifyUrl(link.href, label, `links_from:${sourceUrl}`);
    if (!classified) continue;
    if (classified.kind === 'ifood' || classified.kind === 'whatsapp') continue;
    if (classified.importable || classified.kind === 'link_hub' || menuLikeText(`${classified.label} ${classified.url}`)) {
      found.push(classified);
    }
  }
  return found.slice(0, 8);
};

async function fetchAllRestaurants() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,address,number,neighborhood,city,state,phone,whatsapp_url,instagram,social_networks,rating,reviews_count,menu_status,menu_status_reason,menu_last_checked_at,other_url,external_url,other_url_label,coleta_logs,is_deleted')
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

const isTarget = (row) => {
  if (IDS.length) return IDS.includes(row.id);
  if (alreadyHasNonIfoodSource(row)) return false;
  if (row.menu_status === 'found') return false;
  const logs = parseJson(row.coleta_logs);
  if (!REDO && logs?.[LOG_KEY]?.status) return false;
  if (!ALL && !logs?.campina_instagram_bio_menu_v1?.status && !logs?.campina_instagram_search_v1?.status) return false;
  return true;
};

const buildSearchQuery = (row) => {
  const parts = [
    row.google_maps_name || row.name,
    row.neighborhood,
    row.address,
    row.phone ? digits(row.phone).slice(-8) : '',
    'Campina Grande PB cardapio pedido delivery',
  ];
  return parts.filter(Boolean).join(' ');
};

const priorityScore = (row) => {
  const text = normalize(`${row.google_maps_name || row.name || ''} ${row.category || ''}`);
  const reviews = Number(row.reviews_count || 0);
  const rating = Number(row.rating || 0);
  const categoryBoost =
    (/\bpizz|hamburg|burguer|burger|sushi|temaki|restaurante|bistro|cafe|cafeteria|lanch|pastel|acai|sorv|marmit|quent|churras|espet|bar\b/.test(text) ? 40 : 0)
    + (/\bdelivery|pedido|pizzaria|hamburgueria|restaurante\b/.test(text) ? 20 : 0);
  const reviewBoost = Math.min(120, reviews);
  const ratingBoost = Number.isFinite(rating) ? Math.round(rating * 5) : 0;
  return categoryBoost + reviewBoost + ratingBoost;
};

async function closeAutomationTabs(browser, keepPage) {
  const pages = await browser.pages().catch(() => []);
  for (const candidate of pages) {
    if (candidate === keepPage) continue;
    const url = candidate.url();
    if (!/google\.com\/search|instagram\.com|threads\.com|whatsapp\.com|wa\.me|linktr\.ee|bio\.site|beacons\.ai|taplink\.cc/i.test(url)) continue;
    await candidate.close({ runBeforeUnload: false }).catch(() => {});
  }
}

async function processRestaurant(row, page) {
  const query = buildSearchQuery(row);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const searchEvidence = await extractGoogleCandidates(page);
  const queue = [...searchEvidence.candidates];
  const tried = [];
  let best = null;

  for (let index = 0; index < queue.length && index < 14; index += 1) {
    const candidate = queue[index];
    if (tried.some((item) => item.url === candidate.url)) continue;
    tried.push(candidate);
    if (candidate.kind === 'link_hub' || candidate.kind === 'shortlink' || candidate.kind === 'official_site_candidate') {
      await page.goto(candidate.url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      await sleep(WAIT_MS);
      const nested = await extractPageLinks(page, candidate.url);
      for (const item of nested) {
        if (!queue.some((existing) => existing.url === item.url) && !tried.some((existing) => existing.url === item.url)) queue.push(item);
      }
      if (!candidate.importable) continue;
    }

    const validation = await validateMenuCandidate(page, row, candidate);
    tried[tried.length - 1] = { ...candidate, validation };
    if (validation.accepted) {
      best = validation;
      break;
    }
  }

  const status = best ? 'google_menu_source_found' : 'google_no_verified_menu_source';
  return {
    rowId: row.id,
    name: row.google_maps_name || row.name,
    status,
    query,
    searchUrl,
    best,
    tried,
    googleCandidates: searchEvidence.candidates,
    googleTextExcerpt: clean(searchEvidence.page.bodyText).slice(0, 1200),
  };
}

async function updateRestaurant(row, result) {
  const now = new Date().toISOString();
  const previousLogs = parseJson(row.coleta_logs);
  const selected = result.best?.candidate || null;
  const logEntry = {
    status: result.status,
    checkedAt: now,
    query: result.query,
    searchUrl: result.searchUrl,
    selectedUrl: selected?.url || null,
    selectedLabel: selected ? labelFor(selected) : null,
    candidates: result.tried.slice(0, 12).map((candidate) => ({
      url: candidate.url,
      label: candidate.label || null,
      kind: candidate.kind,
      source: candidate.source,
      accepted: Boolean(candidate.validation?.accepted),
      reason: candidate.validation?.reason || null,
      scores: candidate.validation?.scores || null,
      profile: candidate.validation?.profile || null,
      pageTitle: candidate.validation?.pageTitle || null,
      textExcerpt: candidate.validation?.textExcerpt || null,
    })),
    googleCandidates: result.googleCandidates.slice(0, 10).map((candidate) => ({
      url: candidate.url,
      label: candidate.label || null,
      kind: candidate.kind,
      source: candidate.source,
      priority: candidate.priority,
    })),
  };
  const update = {
    menu_last_checked_at: now,
    coleta_logs: {
      ...previousLogs,
      [LOG_KEY]: logEntry,
      [MENU_COLLECTION_LOG_KEY]: selected
        ? {
            status: 'google_menu_source_found',
            source: 'google_search',
            checkedAt: now,
            url: selected.url,
            label: labelFor(selected),
          }
        : {
            ...(previousLogs?.[MENU_COLLECTION_LOG_KEY] || {}),
            status: result.status,
            source: 'google_search',
            checkedAt: now,
            reason: 'Nenhum resultado do Google abriu uma pagina de cardapio com prova suficiente de unidade.',
          },
    },
  };
  if (selected) {
    update.other_url = selected.url;
    update.external_url = selected.url;
    update.other_url_label = labelFor(selected);
    update.menu_status = row.menu_status === 'found' ? row.menu_status : 'needs_recollection';
    update.menu_status_reason = `Fonte publica de cardapio encontrada no Google (${labelFor(selected)}) apos validar nome e unidade; aguardando coleta estruturada.`;
  }
  if (!APPLY) return { applied: false, update };
  const { error } = await supabase.from('restaurants').update(update).eq('id', row.id);
  if (error) throw error;
  return { applied: true, update };
}

const rows = (await fetchAllRestaurants())
  .filter(isTarget)
  .sort((a, b) => priorityScore(b) - priorityScore(a) || String(a.google_maps_name || a.name).localeCompare(String(b.google_maps_name || b.name)))
  .slice(OFFSET, LIMIT ? OFFSET + LIMIT : undefined);

console.log(JSON.stringify({
  apply: APPLY,
  runId: RUN_ID,
  totalTargetsThisRun: rows.length,
  offset: OFFSET,
  limit: LIMIT,
  all: ALL,
  outDir: OUT_DIR,
}, null, 2));

if (!rows.length) process.exit(0);

const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
page.setDefaultTimeout(30000);

const summary = { processed: 0, found: 0, notFound: 0, errors: 0 };
try {
  for (const row of rows) {
    const label = row.google_maps_name || row.name;
    try {
      if (!COMPACT || summary.processed % 10 === 0) console.log(`[${summary.processed + 1}/${rows.length}] ${label}`);
      await closeAutomationTabs(browser, page);
      const result = await processRestaurant(row, page);
      await updateRestaurant(row, result);
      summary.processed += 1;
      if (result.status === 'google_menu_source_found') summary.found += 1;
      else summary.notFound += 1;
      fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify({
        id: row.id,
        name: label,
        status: result.status,
        selectedUrl: result.best?.candidate?.url || null,
        selectedLabel: result.best?.candidate ? labelFor(result.best.candidate) : null,
        query: result.query,
      })}\n`);
      if (!COMPACT || result.best) {
        console.log(`  -> ${label} | ${result.status}${result.best ? ` | ${labelFor(result.best.candidate)} | ${result.best.candidate.url}` : ''}`);
      }
      await closeAutomationTabs(browser, page);
      await sleep(1200 + Math.floor(Math.random() * 900));
    } catch (error) {
      summary.processed += 1;
      summary.errors += 1;
      fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify({
        id: row.id,
        name: label,
        status: 'error',
        error: error.message,
      })}\n`);
      console.error(`  !! ${label}: ${error.message}`);
      await sleep(2500);
    }
  }
} finally {
  await page.close().catch(() => {});
  await browser.disconnect();
}

console.log(JSON.stringify(summary, null, 2));
