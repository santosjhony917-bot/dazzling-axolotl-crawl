import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const REDO = process.argv.includes('--redo');
const REDO_NOT_FOUND_BEFORE = process.argv.find((arg) => arg.startsWith('--redo-not-found-before='))?.split('=')[1] || '';
const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0) || null;
const OFFSET = Number(process.argv.find((arg) => arg.startsWith('--offset='))?.split('=')[1] || 0);
const IDS = (process.argv.find((arg) => arg.startsWith('--ids='))?.split('=')[1] || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const WAIT_MS = Number(process.argv.find((arg) => arg.startsWith('--wait-ms='))?.split('=')[1] || 4200);
const SEARCH_CANDIDATE_LIMIT = Number(process.argv.find((arg) => arg.startsWith('--search-candidates='))?.split('=')[1] || 6);
const PROFILE_CANDIDATE_LIMIT = Number(process.argv.find((arg) => arg.startsWith('--profile-candidates='))?.split('=')[1] || 6);
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'campina-instagram-search', RUN_ID);
const CHECKPOINT_FILE = path.join(OUT_DIR, 'results.jsonl');
const SUMMARY_FILE = 'scratch/campina-instagram-search-summary.json';
const LOG_KEY = 'campina_instagram_search_v1';

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
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' e ')
  .replace(/[^a-z0-9@\s._-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const compact = (value) => normalize(value).replace(/[^a-z0-9]+/g, '');
const digits = (value) => String(value || '').replace(/\D/g, '');
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tokenAppears = ({ normalizedText, packedText, handle, token }) => {
  if (!token) return false;
  if (handle.includes(token)) return true;
  if (token.length <= 4) {
    return new RegExp(`(?:^|[^a-z0-9])${escapeRegex(token)}(?:$|[^a-z0-9])`).test(normalizedText);
  }
  return packedText.includes(token);
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

const validInstagramProfileUrl = (url) =>
  /^https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]+\/?(?:[?#].*)?$/i.test(String(url || ''))
  && !/instagram\.com\/(?:p|reel|reels|stories|explore|tags|tv|developer|accounts|about|privacy|legal|popular|directory|web|api)\b/i.test(String(url || ''))
  && !/instagram\.com\/(?:undefined|null)\b/i.test(String(url || ''));

const extractInstagramUrl = (href) => {
  let url = String(href || '').trim();
  if (!url) return '';
  if (url.includes('/url?') || url.includes('url?q=')) {
    try {
      const parsed = new URL(url, 'https://www.google.com');
      url = parsed.searchParams.get('q') || url;
    } catch {
      const match = url.match(/[?&]q=([^&]+)/);
      if (match) url = decodeURIComponent(match[1]);
    }
  }
  try {
    const parsed = new URL(url);
    if (!/instagram\.com$/i.test(parsed.hostname.replace(/^www\./i, ''))) return '';
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length !== 1) return '';
    const handle = segments[0] || '';
    if (!/^[A-Za-z0-9._]+$/.test(handle)) return '';
    const clean = `https://www.instagram.com/${handle}/`;
    return validInstagramProfileUrl(clean) ? clean : '';
  } catch {
    return '';
  }
};

const decodeExternalUrl = (href) => {
  const raw = String(href || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, 'https://www.instagram.com');
    if (/^(?:l|lm)\.instagram\.com$/i.test(parsed.hostname)) {
      return parsed.searchParams.get('u') || raw;
    }
    if (parsed.hostname === 'www.google.com' && parsed.pathname === '/url') {
      return parsed.searchParams.get('q') || raw;
    }
    return parsed.href;
  } catch {
    return raw;
  }
};

const extractExternalUrls = (profile) => {
  const urls = [];
  for (const link of profile.links || []) {
    const decoded = decodeExternalUrl(link.href);
    if (decoded && !/instagram\.com/i.test(decoded)) urls.push(decoded);
  }
  const text = `${profile.metaDescription || ''}\n${profile.text || ''}`;
  for (const match of text.matchAll(/(?:https?:\/\/)?(?:app\.cardapioweb\.com|instadelivery\.com\.br|wa\.me|api\.whatsapp\.com|whatsapp\.com)\/[^\s"'<>)]+/gi)) {
    const raw = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;
    urls.push(raw.replace(/[.,;:]+$/g, ''));
  }
  return [...new Set(urls)].slice(0, 5);
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
  if (!response.ok) return null;
  const data = await response.json();
  const city = String(data.city || '').trim();
  const state = String(data.state || '').trim();
  const normalizedCity = normalize(city);
  const normalizedState = normalize(state);
  const locationConflict = Boolean(city || state)
    && !(normalizedCity === 'campina grande' && normalizedState === 'pb');
  const text = [
    'Cardapio Web official profile',
    data.name,
    data.url_name,
    data.instagram,
    data.street,
    data.address_number,
    data.address_complement,
    data.neighborhood,
    city,
    state,
    data.order_whatsapp,
    data.phone_number,
    data.cnpj,
  ].filter((value) => value && String(value) !== 'null').join(' ');
  return {
    kind: 'cardapioweb_profile',
    url,
    apiUrl,
    slug,
    name: data.name || null,
    instagram: data.instagram || null,
    city: city || null,
    state: state || null,
    phone: data.order_whatsapp || data.phone_number || null,
    address: [data.street, data.address_number, data.neighborhood, city, state].filter(Boolean).join(', '),
    locationConflict,
    text,
  };
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

const getOlaClickProfileUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (!/(?:^|\.)ola\.click$/i.test(parsed.hostname)) return '';
    return `${parsed.protocol}//${parsed.hostname}/products`;
  } catch {
    return '';
  }
};

const fetchOlaClickProfileEvidence = async (url) => {
  const profileUrl = getOlaClickProfileUrl(url);
  if (!profileUrl) return null;
  const response = await fetch(profileUrl, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0',
    },
  });
  if (!response.ok) return null;
  const html = await response.text();
  const meta = (name) => decodeHtml(
    html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i'))?.[1]
    || '',
  );
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const address = decodeHtml(
    html.match(/\baddress:"([^"]+)"/)?.[1]
    || html.match(/class="label[^"]*"[^>]*>\s*([^<]*(?:Campina Grande|PB|Brasil)[^<]*)\s*<\/span>/i)?.[1]
    || '',
  );
  const phone = digits(
    html.match(/phone=(55\d{10,13})/i)?.[1]
    || html.match(/\bwhatsapp:"(\d{10,15})"/i)?.[1]
    || '',
  );
  const name = (meta('og:site_name') || meta('og:title') || title)
    .replace(/\s+-\s+(?:Card[aá]pio digital|Pe[çc]a Online|Delivery).*$/i, '')
    .trim();
  const normalizedAddress = normalize(address);
  const city = normalizedAddress.includes('campina grande') ? 'Campina Grande' : null;
  const state = /(?:^|[^a-z0-9])pb(?:$|[^a-z0-9])/.test(normalizedAddress) ? 'PB' : null;
  const locationConflict = Boolean(address)
    && !(normalizedAddress.includes('campina grande') && /(?:^|[^a-z0-9])pb(?:$|[^a-z0-9])/.test(normalizedAddress));
  const text = [
    'OlaClick official profile',
    name,
    address,
    city,
    state,
    phone,
    profileUrl,
  ].filter(Boolean).join(' ');
  return {
    kind: 'olaclick_profile',
    url,
    profileUrl,
    name: name || null,
    instagram: null,
    city,
    state,
    phone: phone || null,
    address: address || null,
    locationConflict,
    text,
  };
};

const fetchWhatsAppLinkEvidence = async (url) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (!/^(?:wa\.me|api\.whatsapp\.com|whatsapp\.com)$/.test(host)) return null;
    const phone = digits(parsed.searchParams.get('phone') || parsed.pathname);
    if (phone.length < 10) return null;
    return {
      kind: 'whatsapp_link',
      url,
      phone,
      text: ['WhatsApp official bio link', phone].join(' '),
    };
  } catch {
    return null;
  }
};

const collectExternalEvidence = async (profile) => {
  const urls = extractExternalUrls(profile);
  const sources = [];
  for (const url of urls) {
    try {
      const evidence = await fetchWhatsAppLinkEvidence(url);
      if (evidence) sources.push(evidence);
    } catch (error) {
      sources.push({ kind: 'whatsapp_link', url, error: error.message, text: '' });
    }
    if (getCardapioWebSlug(url)) {
      try {
        const evidence = await fetchCardapioWebProfileEvidence(url);
        if (evidence) sources.push(evidence);
      } catch (error) {
        sources.push({ kind: 'cardapioweb_profile', url, error: error.message, text: '' });
      }
    }
    if (getOlaClickProfileUrl(url)) {
      try {
        const evidence = await fetchOlaClickProfileEvidence(url);
        if (evidence) sources.push(evidence);
      } catch (error) {
        sources.push({ kind: 'olaclick_profile', url, error: error.message, text: '' });
      }
    }
  }
  return {
    urls,
    sources,
    text: sources.map((source) => source.text).filter(Boolean).join(' '),
  };
};

const hasSavedInstagram = (row) => {
  const urls = [];
  if (row.instagram) urls.push(row.instagram);
  const socials = Array.isArray(row.social_networks) ? row.social_networks : [];
  for (const item of socials) {
    if (item?.platform === 'instagram' && item?.url) urls.push(item.url);
  }
  return urls.some(validInstagramProfileUrl);
};

const alreadyProcessed = (row) => {
  if (REDO) return false;
  const logs = parseJson(row.coleta_logs);
  const status = logs?.[LOG_KEY]?.status;
  if (REDO_NOT_FOUND_BEFORE) {
    if (status === 'not_found') {
      const checkedAt = Date.parse(logs?.[LOG_KEY]?.checkedAt || '');
      const cutoff = Date.parse(REDO_NOT_FOUND_BEFORE);
      return Number.isFinite(checkedAt) && Number.isFinite(cutoff) && checkedAt >= cutoff;
    }
    return status === 'found' || status === 'blocked';
  }
  return status === 'found' || status === 'not_found' || status === 'blocked';
};

const nameStopwords = new Set([
  'restaurante', 'bar', 'lanchonete', 'pizzaria', 'hamburgueria', 'hamburguer',
  'fast', 'food', 'house',
  'burguer', 'burger', 'lanche', 'lanches', 'hot', 'dog', 'dogs', 'big',
  'pizza', 'pizzas',
  'churrascaria', 'campina', 'grande', 'pb', 'paraiba',
  'oficial', 'delivery', 'self', 'service', 'unidade', 'loja', 'centro', 'em',
  'portal',
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'ao', 'na', 'no',
  'la', 'el', 'le', 's',
  'casa', 'dona', 'seu', 'sua', 'tia', 'tio',
  'espaco',
  'fit', 'caseiras', 'cardapio', 'comida', 'marmita', 'marmitas', 'marmitaria',
  'quentinha', 'quentinhas', 'grill', 'acai', 'salgado', 'salgados', 'espetinho', 'espetinhos',
  'donut', 'donuts', 'brownie', 'brownies', 'coxinha', 'coxinhas', 'delicia', 'delicias',
  'coco', 'verde', 'engarrafada', 'engarrafado',
  'pastel', 'pastelaria', 'gourmet', 'rest', 'cg', 'acaiteria', 'esfiharia', 'petiscaria',
  'bododromo', 'carne', 'sol', 'china', 'frango', 'frangos',
]);

const getNameTokens = (row) => {
  const source = normalize(row.google_maps_name || row.name || '')
    .replace(/\bcampina grande\b/g, ' ')
    .replace(/\bpb\b/g, ' ');
  const tokens = source
    .split(/\s+/)
    .map((token) => token.replace(/^[._-]+|[._-]+$/g, ''))
    .filter((token) => token.length >= 3 && !nameStopwords.has(token));
  return [...new Set(tokens)].slice(0, 6);
};

const genericLeadNames = new Set([
  'acai', 'acaí', 'pizza', 'pizzaria', 'restaurante', 'bar', 'lanches', 'lanche',
  'lanchonete', 'hamburgueria', 'sushi', 'pastel', 'pastelaria', 'portal', 'salgado',
  'acaiteria', 'açaiteria', 'sorveteria', 'cafeteria', 'doceria', 'petiscaria', 'churrascaria',
  'salgados', 'container', 'marmita', 'marmitas', 'marmitaria', 'quentinha', 'quentinhas',
  'donut', 'donuts', 'coxinha', 'coxinhas', 'delicia', 'delicias',
  'coco verde', 'coco', 'engarrafada', 'engarrafado', 'cafe da manha', 'cafedamanha',
  'frango', 'frangos',
  'churrasco', 'churrasquinho', 'espetinho', 'espetinhos', 'grill',
  'delivery', 'fast food', 'comida caseira', 'praca de alimentacao', 'la pizza', 'acai food house',
  'forno a lenha', 'pizzaria forno a lenha',
]);

const commonPersonNameTokens = new Set([
  'joao', 'jose', 'maria', 'ana', 'alex', 'paulo', 'pedro', 'carlos', 'carlinhos',
  'beth', 'raul', 'robertinho', 'regis', 'guga', 'chica', 'bia', 'nadja', 'fofa',
  'taty', 'socorro', 'mara', 'valdo', 'assis', 'edu', 'genival', 'jailson',
]);

const isGenericLeadName = (row) => {
  const source = normalize(row.google_maps_name || row.name || '')
    .replace(/\bcampina grande\b/g, ' ')
    .replace(/\bpb\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (genericLeadNames.has(source)) return true;
  if (genericLeadNames.has(compact(source))) return true;
  const tokens = source.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1 && genericLeadNames.has(tokens[0] || '')) return true;
  return getNameTokens(row).length === 0 && tokens.some((token) => genericLeadNames.has(token) || nameStopwords.has(token));
};

const hasDistinctiveNamePart = (row) => {
  const source = normalize(row.google_maps_name || row.name || '')
    .replace(/\bcampina grande\b/g, ' ')
    .replace(/\bpb\b/g, ' ')
    .replace(/\bcg\b/g, ' ');
  const weakArticles = new Set(['e', 'a', 'o', 'as', 'os']);
  return source
    .split(/\s+/)
    .filter(Boolean)
    .some((token) => (token.length >= 2 || (token.length === 1 && !weakArticles.has(token)))
      && !nameStopwords.has(token)
      && !genericLeadNames.has(token)
      && !/^\d+$/.test(token));
};

const getRowFoodIdentityVariants = (row) => {
  const source = normalize([
    row.google_maps_name,
    row.name,
    row.category,
  ].filter(Boolean).join(' '));
  const groups = [
    { pattern: /\brestaurante\b|\brestaurant\b|\bself[-\s]?service\b|\bcozinha\b/, variants: ['restaurante', 'restaurant', 'self service', 'selfservice', 'cozinha'] },
    { pattern: /\blanches?\b|\blanchonete\b/, variants: ['lanche', 'lanches', 'lanchonete'] },
    { pattern: /\bhot\s*dogs?\b|\bdogs?\b/, variants: ['hotdog', 'hot dog', 'dog', 'dogs'] },
    { pattern: /\bpizzas?\b|\bpizzaria\b/, variants: ['pizza', 'pizzas', 'pizzaria'] },
    { pattern: /\bhamburguer(?:ia)?\b|\bburguer(?:ia)?\b|\bburger\b/, variants: ['hamburguer', 'hamburgueria', 'burguer', 'burgueria', 'burger'] },
    { pattern: /\bsushi\b|\btemaki\b|\btemakeria\b/, variants: ['sushi', 'temaki', 'temakeria'] },
    { pattern: /\bpastel(?:aria)?\b/, variants: ['pastel', 'pastelaria'] },
    { pattern: /\bsalgados?\b/, variants: ['salgado', 'salgados'] },
    { pattern: /\bespetinhos?\b/, variants: ['espetinho', 'espetinhos'] },
    { pattern: /\bacai(?:teria)?\b/, variants: ['acai', 'acaiteria'] },
    { pattern: /\bsorvetes?\b|\bsorveteria\b/, variants: ['sorvete', 'sorvetes', 'sorveteria'] },
    { pattern: /\bmarmitas?\b|\bmarmitaria\b|\bquentinha\b/, variants: ['marmita', 'marmitas', 'marmitaria', 'quentinha'] },
  ];
  return [...new Set(groups.flatMap((group) => (group.pattern.test(source) ? group.variants : [])))];
};

const getRowAddressEvidence = (row) => {
  const logs = parseJson(row.coleta_logs);
  const googleBase = logs?.google_maps_base || {};
  const text = normalize([
    row.address,
    row.number,
    row.neighborhood,
    googleBase.address,
  ].filter(Boolean).join(' '));
  const addressStopwords = new Set([
    'rua', 'r', 'avenida', 'av', 'pres', 'presidente', 'rodovia', 'travessa', 'tv',
    'bairro', 'centro', 'campina', 'grande', 'pb', 'paraiba', 'brasil', 'numero',
    'n', 'loja', 'sala', 'andar', 'cep',
  ]);
  const numbers = [...new Set(
    [...text.matchAll(/\b\d{2,5}[a-z]?\b/g)]
      .map((match) => match[0].replace(/[a-z]$/i, ''))
      .filter(Boolean),
  )];
  const tokens = [...new Set(
    text.split(/\s+/)
      .map((token) => token.replace(/^[._-]+|[._-]+$/g, ''))
      .filter((token) => token.length >= 5 && !addressStopwords.has(token) && !/^\d/.test(token)),
  )].slice(0, 8);
  return { text, numbers, tokens };
};

const getRowNamedLocationEvidence = (row) => {
  const fields = [
    row.google_maps_name,
    row.name,
    row.address,
    row.neighborhood,
  ].filter(Boolean).map((value) => normalize(value));
  const phrases = [];
  const venuePattern = /\b(?:arena|complexo|shopping|partage|boulevard|mall|patio|food park|parque)\s+[a-z0-9]{1,24}(?:\s+[a-z0-9]{1,24})?/g;
  for (const text of fields) {
    for (const match of text.matchAll(venuePattern)) {
      phrases.push(match[0]);
    }
    for (const part of text.split(/\s*[-|]\s*/)) {
      const phrase = part.trim();
      if (phrase.length >= 5 && /\b(?:arena|complexo|shopping|partage|boulevard|mall|patio|food park|parque)\b/.test(phrase)) {
        phrases.push(phrase);
      }
    }
  }
  return [...new Map(
    phrases
      .map((phrase) => normalize(phrase).replace(/\b(?:campina grande|paraiba|pb|brasil)\b/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((phrase) => compact(phrase).length >= 5)
      .map((phrase) => [compact(phrase), { text: phrase, packed: compact(phrase) }]),
  ).values()].slice(0, 8);
};

const extractAddressSnippets = (value) => {
  const text = normalize(value);
  if (!text) return [];
  const patterns = [
    /\b(?:rua|r\.?|avenida|av\.?|travessa|tv\.?|rodovia)\s+[a-z0-9\s._-]{0,90}/g,
    /\bbr\s*-?\s*\d{2,4}[a-z0-9\s._-]{0,80}/g,
  ];
  const snippets = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const snippet = String(match[0] || '').replace(/\s+/g, ' ').trim();
      if (snippet.length >= 8) snippets.push(snippet);
    }
  }
  return [...new Set(snippets)].slice(0, 6);
};

const getCandidateAddressEvidence = ({ profileText, externalSources }) => {
  const externalAddresses = (externalSources || [])
    .map((source) => source?.address)
    .filter(Boolean);
  const snippets = [
    ...externalAddresses,
    ...extractAddressSnippets(profileText),
  ];
  const text = normalize(snippets.join(' '));
  const numbers = [...new Set(
    [...text.matchAll(/\b\d{2,5}[a-z]?\b/g)]
      .map((match) => match[0].replace(/[a-z]$/i, ''))
      .filter(Boolean),
  )];
  return {
    snippets,
    text,
    packed: compact(text),
    numbers,
  };
};

const isExcludedFoodAdjacentLead = (row) => {
  const text = normalize([
    row.google_maps_name,
    row.name,
    row.category,
  ].filter(Boolean).join(' '));
  return /^(?:rua|r|avenida|av)\s+[a-z0-9]+(?:\s+[a-z0-9]+)?$/.test(text)
    || /padaria|panificadora|acougue|\bcarnes\b|casa de carnes|frango abatido|frango fresco|frango congelado|distribuidora de frango|frango e derivados|\bgranja\b|peixaria|quitanda|hortifruti|sacolao|frutaria|mercearia|mercadinho|conveniencia|mini\s*box|minibox|\bnet\b|telecom|provedor|internet|magazine luiza|\bmagalu\b|\bmagazine\b|\bvariedades\b|\bpresentes\b|\bbrinquedos\b|lan house|cyber cafe|\bcopias\b|xerox|papelaria|estamparia|master fogao|master fogoes|\bcuite\b|centro de beleza|salao de beleza|maquiagem|maquiadora|makeup|area de lazer|\blazer\b|recanto da serra|buffet|catering|recep(?:cao|coes)?|cerimonial|eventos|\bfestas?\b|kits? festas?|loja de bolo|loja de bolos|\bbolos?\b|\bcakes?\b|\btortas?\b/.test(text);
};

const rowLooksLikeFoodBusiness = (row) => {
  const text = normalize([
    row.google_maps_name,
    row.name,
    row.category,
  ].filter(Boolean).join(' '));
  return /restaurante|cozinha|cafeteria|cafe|bar|boteco|petiscaria|lanchonete|lanche|pizzaria|pizza|hamburguer|burguer|burger|hot\s*dog|dogao|sushi|marmita|quentinha|delivery|refeicao|cardapio|sorveteria|sorvete|acai|pastel|doceria|confeitaria|churrasco|espetinho/.test(text);
};

const rowLooksLikeFishRestaurant = (row) => {
  const text = normalize([
    row.google_maps_name,
    row.name,
    row.category,
  ].filter(Boolean).join(' '));
  return rowLooksLikeFoodBusiness(row)
    && /(tilapia|peixe|pescado|frutos do mar|camarao)/.test(text);
};

const rowLooksOutOfScopePublicPlace = (row) => {
  const name = normalize(row.google_maps_name || row.name || '');
  const category = normalize(row.category || '');
  return /\b(?:feira central|feira livre|mercado publico|mercado municipal|mercado central|parque|praca|rodoviaria|igreja|paroquia|capela|santuario)\b/.test(name)
    || /\b(?:mercado publico|mercado municipal|mercado central|shopping center|centro comercial|igreja|paroquia|capela|santuario|comunidade religiosa)\b/.test(category);
};

const otherLocations = [
  'joao pessoa', 'recife', 'natal', 'fortaleza', 'caruaru', 'patos', 'sape', 'lagoa seca',
  'cuite', 'queimadas', 'sao paulo', 'rio de janeiro', 'curitiba', 'belo horizonte', 'campinas',
  'salvador', 'maceio', 'aracaju', 'brasilia', 'distrito federal', 'gama',
  'taguatinga', 'goiania', 'anapolis', 'porto alegre', 'teresina', 'campina grande do sul',
  'areia', 'remigio', 'roraima', 'medianeira', 'parana', 'tambau', 'bayeux',
  'nilopolis', 'olinda', 'macae', 'volta redonda', 'bangu', 'sao luis',
];

const scoreCandidateText = (row, candidate, profile = {}) => {
  const handle = normalize((candidate.url || '').match(/instagram\.com\/([^/?#]+)/i)?.[1] || '');
  const profileDescriptions = [
    profile.title,
    profile.metaDescription,
    profile.ogDescription,
    profile.nameDescription,
    profile.text,
    profile.externalEvidenceText,
  ];
  const text = normalize([
    handle,
    candidate.title,
    candidate.context,
    ...profileDescriptions,
  ].filter(Boolean).join(' '));
  const evidenceText = normalize([
    handle,
    ...profileDescriptions,
  ].filter(Boolean).join(' '));
  const packed = compact(text);
  const evidencePacked = compact(evidenceText);
  const name = normalize(row.google_maps_name || row.name || '');
  const exactNameNoiseWords = new Set(['e', 'a', 'o', 'as', 'os']);
  const nameWordsForExact = name
    .replace(/\bcampina grande\b/g, ' ')
    .replace(/\bpb\b/g, ' ')
    .replace(/\bcg\b/g, ' ')
    .split(/\s+/)
    .filter((word, index) => word && !(index === 0 && exactNameNoiseWords.has(word)));
  const namePacked = compact(nameWordsForExact.join(' '));
  const namePackedVariants = [...new Set([
    namePacked,
    namePacked.replace(/burger/g, 'burguer'),
    namePacked.replace(/burguer/g, 'burger'),
    namePacked.replace(/hamburger/g, 'hamburguer'),
    namePacked.replace(/hamburguer/g, 'hamburger'),
  ].filter(Boolean))];
  const exactPackedAppears = (packedText) =>
    namePackedVariants.some((variant) => variant.length >= 7 && packedText.includes(variant));
  const exactPackedAppearsInHandle = namePackedVariants
    .some((variant) => variant.length >= 4 && handle.includes(variant));
  const tokens = getNameTokens(row);
  const phone = digits(row.phone);
  const neighborhood = normalize(row.neighborhood || '');
  const addressEvidence = getRowAddressEvidence(row);
  const namedLocationEvidence = getRowNamedLocationEvidence(row);
  const rawPhoneText = [
    candidate.context,
    profile.metaDescription,
    profile.text,
    profile.externalEvidenceText,
  ].filter(Boolean).join(' ');
  let score = candidate.googleScore || 0;
  let matchedTokens = 0;
  let evidenceMatchedTokens = 0;
  let reasons = [];
  const conflictLocations = [];
  const conflictDdds = [];
  const externalSources = Array.isArray(profile.externalEvidence?.sources) ? profile.externalEvidence.sources : [];
  const externalLocationConflicts = externalSources
    .filter((source) => source?.locationConflict)
    .map((source) => [source.city, source.state].filter(Boolean).join('/'))
    .filter(Boolean);
  const candidateAddressEvidence = getCandidateAddressEvidence({
    profileText: rawPhoneText,
    externalSources,
  });

  for (const token of tokens) {
    const tokenPacked = compact(token);
    if (!tokenPacked) continue;
    if (tokenAppears({ normalizedText: text, packedText: packed, handle, token: tokenPacked })) {
      matchedTokens += 1;
      score += handle.includes(tokenPacked) ? 24 : 16;
    }
    if (tokenAppears({ normalizedText: evidenceText, packedText: evidencePacked, handle, token: tokenPacked })) {
      evidenceMatchedTokens += 1;
    }
  }

  const exactSingleNameWord = nameWordsForExact.length === 1 ? nameWordsForExact[0] : '';
  const exactSingleWordInEvidence = Boolean(exactSingleNameWord)
    && new RegExp(`(?:^|[^a-z0-9])${escapeRegex(exactSingleNameWord)}(?:$|[^a-z0-9])`).test(evidenceText);
  const exactSingleWordInHandle = Boolean(exactSingleNameWord)
    && (
      handle === exactSingleNameWord
      || handle === `${exactSingleNameWord}cg`
      || handle === `${exactSingleNameWord}pb`
      || handle === `${exactSingleNameWord}oficial`
      || new RegExp(`(?:^|[._-])${escapeRegex(exactSingleNameWord)}(?:$|[._-])`).test(handle)
    );
  const exactNameInEvidence = namePacked.length >= 7
    && (exactSingleNameWord
      ? (exactSingleWordInEvidence || exactSingleWordInHandle)
      : (exactPackedAppearsInHandle || exactPackedAppears(evidencePacked)));
  const exactNameInHandle = namePacked.length >= 4
    && (exactSingleNameWord ? exactSingleWordInHandle : exactPackedAppearsInHandle);
  if (namePacked.length >= 7 && (exactPackedAppearsInHandle || exactPackedAppears(packed))) {
    score += 45;
    reasons.push('nome completo/compacto aparece no handle ou perfil');
  }
  if (/\bcampina grande\b/.test(text) || packed.includes('campinagrande') || /\bcg\b/.test(handle) || /(?:^|[._-])cg(?:$|[._-])/.test(handle) || /cg$/.test(handle)) {
    score += 30;
    reasons.push('sinal de Campina Grande/CG');
  }
  if (neighborhood && neighborhood.length >= 4 && text.includes(neighborhood)) {
    score += 18;
    reasons.push(`bairro aparece (${neighborhood})`);
  }
  if (phone.length >= 8) {
    const phoneTail = phone.slice(-8);
    if (packed.includes(phoneTail)) {
      score += 45;
      reasons.push('telefone confere');
    }
  }
  if (externalSources.some((source) => /^(?:cardapioweb|olaclick)_profile$/.test(source?.kind || '') && !source.error)) {
    score += 14;
    reasons.push('link oficial da bio conferido');
  }
  const matchedAddressNumber = addressEvidence.numbers.some((number) => evidencePacked.includes(number));
  const matchedAddressTokens = addressEvidence.tokens
    .filter((token) => tokenAppears({ normalizedText: evidenceText, packedText: evidencePacked, handle, token: compact(token) }));
  const addressSignal = Boolean(matchedAddressNumber && matchedAddressTokens.length >= 1);
  if (addressSignal) {
    score += 42;
    reasons.push(`endereco confere (${[...matchedAddressTokens, addressEvidence.numbers.find((number) => evidencePacked.includes(number))].filter(Boolean).slice(0, 3).join(', ')})`);
  }

  const profileDdds = [...new Set(
    [...text.matchAll(/(?:\+?55\s*)?\(?([1-9]\d)\)?\s*9?\d{4}[-\s]?\d{4}/g)]
      .map((match) => match[1])
      .filter(Boolean),
  )];
  for (const ddd of profileDdds) {
    if (ddd !== '83' && ddd !== '55') conflictDdds.push(ddd);
  }
  const knownConflictDdds = ['11', '21', '31', '41', '47', '51', '61', '71', '79', '81', '82', '84', '85', '86', '87', '88', '95'];
  for (const ddd of knownConflictDdds) {
    const separatedDdd = new RegExp(`(?:^|[._-])0?${ddd}(?:$|[._-])`).test(handle);
    const trailingZeroDdd = handle.endsWith(`0${ddd}`);
    if ((separatedDdd || trailingZeroDdd) && !conflictDdds.includes(ddd)) {
      conflictDdds.push(ddd);
    }
  }
  if (conflictDdds.length > 0 && !profileDdds.includes('83')) {
    score -= 120;
    reasons.push(`ddd conflitante: ${conflictDdds.join(', ')}`);
  }

  for (const location of otherLocations) {
    const locPacked = compact(location);
    if (!locPacked || location === 'campina grande') continue;
    const locationConflictAppears = location === 'campinas'
      ? (new RegExp(`(?:^|[^a-z0-9])${escapeRegex(location)}(?:$|[^a-z0-9])`).test(text)
        || new RegExp(`(?:^|[._-])${escapeRegex(locPacked)}(?:$|[._-])`).test(handle)
        || handle.endsWith(locPacked))
      : packed.includes(locPacked);
    if (locationConflictAppears && !packed.includes('campinagrande')) {
      score -= 120;
      conflictLocations.push(location);
      reasons.push(`possivel outra cidade: ${location}`);
    }
  }
  for (const location of externalLocationConflicts) {
    score -= 140;
    conflictLocations.push(location);
    reasons.push(`link oficial indica outra cidade: ${location}`);
  }
  const stateAbbreviationConflicts = [...new Set(
    [...text.matchAll(/(?:^|[^a-z0-9])(?:sp|pe|rj|rn|ce|al|ba|mg|df|go|pr|rs|sc|pa|ma|pi|se|mt|ms|es|am|rr|ro|ac|to)(?:$|[^a-z0-9])/g)]
      .map((match) => match[0].replace(/[^a-z0-9]/g, ''))
      .filter((code) => code && code !== 'pb'),
  )];
  if (stateAbbreviationConflicts.length > 0 && !/\bcampina grande\b/.test(text) && !packed.includes('campinagrande')) {
    score -= 120;
    reasons.push(`estado conflitante: ${stateAbbreviationConflicts.join(', ')}`);
  }

  const foodSignalRegex = /cardapio|delivery|whatsapp|pedido|peca|funcionamento|restaurante|lanchonete|pizzaria|\bbar\b|boteco|burguer|burger|hot\s*dog|dogao|sushi|pizza|marmita|churrasco|espetinho|pastel|acai|sorvete|cafeteria|cafe|confeitaria|doceria/;
  if (/perfil|profile|instagram/.test(text)) score += 4;
  if (foodSignalRegex.test(text)) {
    score += 8;
  }

  const businessSignal = foodSignalRegex.test(text);
  const genericInstagramPage = /discover trending and popular content|conteudo popular|instagram photos and videos/i.test(String(profile.metaDescription || profile.text || ''))
    && !businessSignal;
  const handleHasCgSignal = /(?:^|[._-])cg(?:$|[._-])/.test(handle) || /cg$/.test(handle);
  const handleHasCampinaSignal = /(?:^|[._-])campina(?:$|[._-])/.test(handle) || /campina$/.test(handle);
  const citySignal = /\bcampina grande\b/.test(text) || packed.includes('campinagrande') || handleHasCgSignal || handleHasCampinaSignal;
  const evidenceCitySignal = /\bcampina grande\b/.test(evidenceText) || evidencePacked.includes('campinagrande') || handleHasCgSignal || handleHasCampinaSignal;
  const phoneSignal = phone.length >= 8 && packed.includes(phone.slice(-8));
  const candidateAddressHasRowToken = addressEvidence.tokens.some((token) =>
    tokenAppears({
      normalizedText: candidateAddressEvidence.text,
      packedText: candidateAddressEvidence.packed,
      handle: '',
      token: compact(token),
    }));
  const candidateAddressHasRowNumber = addressEvidence.numbers.some((number) =>
    candidateAddressEvidence.numbers.includes(number));
  const preliminaryProfileAddressConflict = candidateAddressEvidence.snippets.length > 0
    && !phoneSignal
    && !addressSignal
    && (
      (addressEvidence.numbers.length > 0
        && candidateAddressEvidence.numbers.length > 0
        && !candidateAddressHasRowNumber)
      || (addressEvidence.numbers.length === 0
        && addressEvidence.tokens.length > 0
        && !candidateAddressHasRowToken)
    );
  const rowPhoneTail = phone.length >= 8 ? phone.slice(-8) : '';
  const profileLocalPhoneTails = [...new Set(
    [...rawPhoneText.matchAll(/(?:^|\D)((?:55\s*)?(?:83\s*)?9?\d{4}[-\s.]?\d{4})(?:\D|$)/g)]
      .map((match) => digits(match[1]).slice(-8))
      .filter((tail) => tail.length === 8),
  )];
  const rowScopeText = normalize([
    row.google_maps_name,
    row.name,
    row.address,
    row.neighborhood,
  ].filter(Boolean).join(' '));
  const branchLocationConflict = !phoneSignal && (
    (/\bboulevard\b/.test(rowScopeText) && /\bpartage\b/.test(text) && !/\bboulevard\b/.test(text))
    || (/\bpartage\b/.test(rowScopeText) && /\bboulevard\b/.test(text) && !/\bpartage\b/.test(text))
  );
  const separatedLocalityCodes = '(?:jp|sp|pe|rj|rn|ce|al|ba|mg|df|go|pr|rs|sc|rr|vca|fsa)';
  const strongTrailingLocalityCodes = '(?:jp|sp|rr|vca|fsa)';
  const handleHasStrongPeSuffix = handle.endsWith('pe')
    && !/(?:pepe|crepe)$/.test(handle)
    && /(?:pizza|pizzaria|burger|burguer|sushi|bar|grill|lanch|rest|food|delivery|acai|pastel)/.test(handle);
  const handleHasConflictingLocality = new RegExp(`(?:^|[._-])${separatedLocalityCodes}(?:$|[._-])`).test(handle)
    || new RegExp(`${strongTrailingLocalityCodes}$`).test(handle)
    || handleHasStrongPeSuffix
    || /(?:areia|remigio|cabo)(?:$|[._-])/.test(handle);
  const nameSignal = matchedTokens >= Math.min(2, Math.max(1, tokens.length)) || (namePacked.length >= 7 && (handle.includes(namePacked) || packed.includes(namePacked)));
  const evidenceNameSignal = evidenceMatchedTokens >= Math.min(2, Math.max(1, tokens.length)) || exactNameInEvidence;
  const namedLocationMatch = namedLocationEvidence.find((location) => evidencePacked.includes(location.packed));
  const nonLocationNameTokenSignal = tokens
    .filter((token) => !namedLocationEvidence.some((location) => location.packed.includes(compact(token))))
    .some((token) => tokenAppears({
      normalizedText: evidenceText,
      packedText: evidencePacked,
      handle,
      token: compact(token),
    }));
  const namedLocationSignal = Boolean(
    namedLocationMatch
    && citySignal
    && businessSignal
    && (exactNameInEvidence || exactNameInHandle || nonLocationNameTokenSignal),
  );
  if (namedLocationSignal) {
    score += 28;
    reasons.push(`unidade/local do lead aparece (${namedLocationMatch.text})`);
  }
  const profileAddressConflict = preliminaryProfileAddressConflict && !namedLocationSignal;
  const rowFoodIdentityVariants = getRowFoodIdentityVariants(row);
  const evidenceHasRowFoodIdentity = rowFoodIdentityVariants.some((variant) => {
    const token = compact(variant);
    return tokenAppears({ normalizedText: evidenceText, packedText: evidencePacked, handle, token });
  });
  const beautyBusinessSignal = /\b(?:salao de beleza|studio de beleza|nail designer|nails?|unhas?|cabeleireir[ao]|hair|mechas|selagem|cilios?|sobrancelhas?|manicure|pedicure|alongamento|auto[-\s]?estima|estetica|beleza)\b/.test(text);
  const giftBasketSignal = /\b(?:cestas?|cestas? personalizadas?|cestas? de presentes?|cestas? de cafe|cesta cafe da manha|cafe da manha na cesta)\b/.test(text)
    || /cestas?/.test(handle);
  const hardNonFoodSignal = beautyBusinessSignal || giftBasketSignal || /material de construcao|\bartigos para confeitaria\b|\bartigos para festas?\b|\bconfeitaria e festas?\b|\bplastfestas\b|frango abatido|frango fresco|frango congelado|distribuidora de frango|frango e derivados|\bgranja\b|quitanda|hortifruti|sacolao|frutaria|mercearia|mercadinho|magazine luiza|\bmagalu\b|\bmagazine\b|cartao luiza|consorcio magalu|loja de departamentos|\bvariedades\b|\bpresentes\b|\bbrinquedos\b|lan house|cyber cafe|\bcopias\b|xerox|papelaria|estamparia|master fogao|master fogoes|masterfogoes|\bfogoes\b|assistencia tecnica|conserto de fogao|area de lazer|\blazer\b|recanto da serra|\bsalao de beleza\b|\bmoda feminina\b|\bauto pecas\b|\bposto de gasolina\b|\bpet shop\b|\bmini\s*box\b|\bcomunidade religiosa\b|\bassistencia social\b|\bcozinha solidaria\b|\brestaurante popular\b|\b(?:cras|cadastro unico|construcao|barbearia|cosmetico|maquiagem|maquiadora|makeup|roupa|calcad\w*|imobiliaria|farmacia|clinica|odont\w*|mecanica|hotel|pousada|eletronico|moveis|oticas?|brecho|net|telecom|provedor|internet|supermercado|atacadao|acougue|carnes|padaria|panificadora|conveniencia|minibox|igreja|paroquia|capela|santuario|catolico|catolica|acessorios|automotivo|veiculos?|motos?|pecas)\b/.test(text);
  const eventVenueSignal = /\b(?:recep|recepcao|recepcoes|cerimonial|eventos|catering|buffet|kits? festas?|festa)\b/.test(text);
  const fishMarketSignal = /\b(?:peixaria|mercado de peixe|loja de frutos do mar|peixe vivo|pescados)\b/.test(text);
  const exactLocalFoodIdentity = exactNameInEvidence && citySignal && rowLooksLikeFoodBusiness(row) && businessSignal;
  const exactAddressFoodIdentity = exactNameInEvidence && addressSignal && rowLooksLikeFoodBusiness(row) && businessSignal;
  const hardNonFoodExactLocalException = hardNonFoodSignal && !beautyBusinessSignal && !giftBasketSignal && exactLocalFoodIdentity;
  const mixedFoodConvenienceException = /\bconveniencia\b/.test(text)
    && /\b(?:acai|sorvete|sorveteria|gelateria|gelato)\b/.test(text)
    && (exactLocalFoodIdentity || exactAddressFoodIdentity);
  const restaurantBuffetContext = /\bbuffet\b/.test(text)
    && rowLooksLikeFoodBusiness(row)
    && /\b(?:churrascaria|rodizio|restaurante|petiscaria|buffet completo|japones)\b/.test(text)
    && (citySignal || exactNameInEvidence || evidenceNameSignal);
  const hardFoodAdjacentExcludedText = /\b(?:padaria|panificadora|acougue|carnes|casa de carnes|frango abatido|frango fresco|frango congelado|distribuidora de frango|frango e derivados|granja|peixaria|mercado de peixe|loja de frutos do mar|catering|recep|recepcao|recepcoes|cerimonial|kits? festas?|cestas?|cestas? de presentes?)\b/.test(text)
    || (/\bbuffet\b/.test(text) && !restaurantBuffetContext);
  const dessertFoodAdjacentText = /\b(?:loja de bolos?|bolos? em chantininho|bolo em chantininho|bolos? decorados?|bolos? festivos?|bolos? de rolo|bento cake|mini bolo|tortas?|fatias de tortas?|doces gourmet e decorados|macarons?|bem casados?|docinhos de festa|bolos? de aniversario)\b/.test(text);
  const rowPacked = compact(rowScopeText);
  const rowSalgadosLead = rowPacked.includes('salgado') || rowPacked.includes('salagdo') || rowPacked.includes('salagdos');
  const mixedSalgadosDessertException = dessertFoodAdjacentText
    && !hardFoodAdjacentExcludedText
    && rowSalgadosLead
    && (/\bsalgados?\b/.test(text) || /salgados?/.test(handle))
    && (phoneSignal || addressSignal);
  const foodAdjacentExcludedText = hardFoodAdjacentExcludedText || dessertFoodAdjacentText;
  const foodAdjacentExcludedConflict = (
    (foodAdjacentExcludedText && !mixedSalgadosDessertException)
    || (/\b(?:loja de conveniencia|conveniencia|mini\s*box|minibox)\b/.test(text) && !mixedFoodConvenienceException)
  );
  const fishRestaurantExactLocalException = fishMarketSignal
    && !hardNonFoodSignal
    && rowLooksLikeFishRestaurant(row)
    && exactNameInEvidence
    && citySignal;
  const eventMentionOnExactFoodProfile = eventVenueSignal && exactLocalFoodIdentity;
  const eventMentionOnLocalFoodProfile = eventVenueSignal
    && rowLooksLikeFoodBusiness(row)
    && citySignal
    && businessSignal
    && evidenceNameSignal;
  const nonFoodSignal = hardNonFoodSignal || fishMarketSignal || eventVenueSignal;
  const locationConflict = externalLocationConflicts.length > 0
    || (stateAbbreviationConflicts.length > 0 && !citySignal && !phoneSignal && !addressSignal)
    || (conflictLocations.length > 0 && !citySignal && !phoneSignal);
  const dddConflict = conflictDdds.length > 0 && !profileDdds.includes('83') && !citySignal && !phoneSignal && !addressSignal;
  const singleToken = tokens.length === 1 ? compact(tokens[0]) : '';
  const singleTokenAppearsAsWord = Boolean(singleToken)
    && new RegExp(`(?:^|[^a-z0-9])${escapeRegex(singleToken)}(?:$|[^a-z0-9])`).test(evidenceText);
  const singleDistinctiveFoodBrandLocal = Boolean(singleToken)
    && tokens.length === 1
    && singleToken.length >= 5
    && !genericLeadNames.has(singleToken)
    && !commonPersonNameTokens.has(singleToken)
    && citySignal
    && businessSignal
    && (evidenceHasRowFoodIdentity || rowLooksLikeFoodBusiness(row))
    && evidenceMatchedTokens === 1
    && (handle.includes(singleToken) || singleTokenAppearsAsWord);
  const phoneMismatchConflict = Boolean(rowPhoneTail)
    && profileLocalPhoneTails.length > 0
    && !profileLocalPhoneTails.includes(rowPhoneTail)
    && !phoneSignal
    && !addressSignal
    && !exactNameInHandle
    && !singleDistinctiveFoodBrandLocal;
  const handleLocalityConflict = handleHasConflictingLocality && !phoneSignal;
  const nonFoodConflict = beautyBusinessSignal
    || giftBasketSignal
    || (hardNonFoodSignal && !phoneSignal && !addressSignal && !hardNonFoodExactLocalException)
    || (fishMarketSignal && !phoneSignal && !addressSignal && !fishRestaurantExactLocalException)
    || (eventVenueSignal && !phoneSignal && !addressSignal && !eventMentionOnExactFoodProfile && !eventMentionOnLocalFoodProfile);
  const exactLocalCommonName = exactNameInEvidence
    && (evidenceCitySignal || addressSignal || phoneSignal)
    && rowLooksLikeFoodBusiness(row)
    && hasDistinctiveNamePart(row);
  const exactLocalGenericNameWithExplicitCg = exactNameInEvidence
    && citySignal
    && rowLooksLikeFoodBusiness(row)
    && businessSignal
    && (
      /\b(?:cg|campina)\b/.test(name)
      || exactNameInHandle
    );
  const genericLeadConflict = isGenericLeadName(row)
    && !phoneSignal
    && !addressSignal
    && !exactLocalCommonName
    && !exactLocalGenericNameWithExplicitCg;
  const singleTokenJoinedSubstringConflict = Boolean(singleToken)
    && !phoneSignal
    && !exactNameInEvidence
    && !exactNameInHandle
    && evidenceMatchedTokens === 1
    && !handle.includes(singleToken)
    && !addressSignal
    && !singleTokenAppearsAsWord;
  const weakSingleTokenMissingFoodIdentity = tokens.length === 1
    && rowFoodIdentityVariants.length > 0
    && !phoneSignal
    && !exactNameInEvidence
    && !exactNameInHandle
    && !evidenceHasRowFoodIdentity;
  const weakSingleTokenLocalWithoutExact = tokens.length === 1
    && citySignal
    && !phoneSignal
    && !addressSignal
    && !exactNameInEvidence
    && !exactNameInHandle
    && !singleDistinctiveFoodBrandLocal;
  const commonBusinessNameWithoutLocal = /^(?:bar|boteco|buteco|lanchonete|restaurante|lanche|pastelaria|marmitaria|portal|point|cantinho|casa|espetinho|big)\b/.test(name)
    && !citySignal
    && !phoneSignal
    && !addressSignal;
  const campinaLocalityTokens = new Set([
    'sao', 'jose', 'catole', 'centro', 'malvinas', 'galante', 'bodocongo',
    'liberdade', 'prata', 'jeremias', 'velame', 'cruzeiro', 'palmeira',
    'tambor', 'santa', 'rosa', 'nova', 'brasilia', 'jardim', 'paulistano',
    'sandra', 'cavalcante', 'monte', 'castelo', 'acude', 'velho',
  ]);
  const locationOnlyBusinessNameConflict = /^(?:bar|boteco|buteco|lanchonete|restaurante|churrascaria|petiscaria)\b/.test(name)
    && tokens.length > 0
    && tokens.every((token) => campinaLocalityTokens.has(token))
    && !phoneSignal
    && !addressSignal
    && !exactNameInEvidence
    && !exactNameInHandle;
  const commonFirstNameOnly = /^(?:bar|boteco|buteco|lanchonete|restaurante|lanche|pastelaria|marmitaria|portal|point|cantinho|casa|espetinho)\b/.test(name)
    && tokens.length <= 1
    && tokens.some((token) => commonPersonNameTokens.has(token))
    && !phoneSignal
    && !addressSignal
    && !exactNameInEvidence
    && !(neighborhood && neighborhood.length >= 4 && text.includes(neighborhood));
  const singlePersonBarWithoutLocal = /\b(?:bar|boteco|buteco)\b/.test(name)
    && tokens.length <= 1
    && !citySignal
    && !phoneSignal
    && !addressSignal;
  const exactSingleTokenWithoutLocal = tokens.length === 1
    && exactNameInEvidence
    && !citySignal
    && !phoneSignal
    && !addressSignal;
  const commonExactPhraseWithoutLocal = /\b(?:meu cantinho|prato cheio|sabor do brasil|bom apetite|resenha)\b/.test(name)
    && !citySignal
    && !phoneSignal
    && !addressSignal;
  const genericCasaSaborConflict = /\bcasa\b/.test(name)
    && /\bsabor\b/.test(name)
    && !phoneSignal
    && !exactNameInEvidence
    && !(neighborhood && neighborhood.length >= 4 && text.includes(neighborhood));
  const genericSaborCaseiroConflict = /\bsabor\b/.test(name)
    && /\bcaseir[oa]\b/.test(name)
    && !phoneSignal
    && !citySignal
    && !(neighborhood && neighborhood.length >= 4 && text.includes(neighborhood));
  const genericSaborBomOrderConflict = /\bsabor bom\b/.test(name)
    && /\bbom sabor\b/.test(text)
    && !/\bsabor bom\b/.test(text)
    && !phoneSignal;
  const bomSaborFoodTypeConflict = /\bbom sabor\b/.test(name)
    && /\b(?:marmitaria|marmit|quentinha|lanchonete|lanche)\b/.test(name)
    && /\bpizzaria\b/.test(text)
    && !/\b(?:marmitaria|marmit|quentinha|lanchonete|lanche)\b/.test(text)
    && !phoneSignal
    && !addressSignal;
  const phoneConfirmedName = phoneSignal
    && (citySignal || businessSignal || evidenceMatchedTokens >= 2 || exactNameInEvidence || exactNameInHandle || matchedTokens >= 2);
  const addressHasNameEvidence = evidenceMatchedTokens >= 1 || exactNameInEvidence || exactNameInHandle || matchedTokens >= 2 || phoneSignal;
  const addressConfirmedName = addressSignal
    && addressHasNameEvidence
    && (citySignal || businessSignal || phoneSignal);
  const localFoodNameSignal = citySignal && businessSignal && evidenceNameSignal && (score >= 90 || exactNameInHandle);
  const strongNameIdentitySignal = score >= 92
    && evidenceNameSignal
    && (citySignal || phoneSignal || addressSignal || (exactNameInEvidence && tokens.length >= 2));
  const accepted = !genericInstagramPage
    && !locationConflict
    && !dddConflict
    && !phoneMismatchConflict
    && !profileAddressConflict
    && !branchLocationConflict
    && !handleLocalityConflict
    && !foodAdjacentExcludedConflict
    && !nonFoodConflict
    && !genericLeadConflict
    && !singleTokenJoinedSubstringConflict
    && !weakSingleTokenMissingFoodIdentity
    && !weakSingleTokenLocalWithoutExact
    && !commonBusinessNameWithoutLocal
    && !locationOnlyBusinessNameConflict
    && !commonFirstNameOnly
    && !singlePersonBarWithoutLocal
    && !exactSingleTokenWithoutLocal
    && !commonExactPhraseWithoutLocal
    && !genericCasaSaborConflict
    && !genericSaborCaseiroConflict
    && !genericSaborBomOrderConflict
    && !bomSaborFoodTypeConflict
    && (
      phoneConfirmedName
      || addressConfirmedName
      || localFoodNameSignal
      || strongNameIdentitySignal
    );

  return {
    score,
    matchedTokens,
    evidenceMatchedTokens,
    tokenCount: tokens.length,
    citySignal,
    phoneSignal,
    addressSignal,
    namedLocationSignal,
    evidenceCitySignal,
    nameSignal,
    evidenceNameSignal,
    handleHasCgSignal,
    handleHasCampinaSignal,
    handleHasConflictingLocality,
    phoneConfirmedName,
    addressHasNameEvidence,
    addressConfirmedName,
    exactNameInEvidence,
    exactNameInHandle,
    localFoodNameSignal,
    strongNameIdentitySignal,
    locationConflict,
    conflictLocations,
    stateAbbreviationConflicts,
    dddConflict,
    conflictDdds,
    phoneMismatchConflict,
    profileLocalPhoneTails,
    profileAddressConflict,
    candidateAddressSnippets: candidateAddressEvidence.snippets,
    branchLocationConflict,
    handleLocalityConflict,
    foodAdjacentExcludedConflict,
    nonFoodConflict,
    hardNonFoodExactLocalException,
    eventMentionOnLocalFoodProfile,
    genericLeadConflict,
    singleTokenJoinedSubstringConflict,
    weakSingleTokenMissingFoodIdentity,
    weakSingleTokenLocalWithoutExact,
    commonBusinessNameWithoutLocal,
    locationOnlyBusinessNameConflict,
    commonFirstNameOnly,
    singlePersonBarWithoutLocal,
    exactSingleTokenWithoutLocal,
    commonExactPhraseWithoutLocal,
    genericCasaSaborConflict,
    genericSaborCaseiroConflict,
    genericSaborBomOrderConflict,
    bomSaborFoodTypeConflict,
    accepted,
    reasons,
  };
};

const fetchRestaurants = async () => {
  if (IDS.length > 0) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,city,state,neighborhood,address,number,phone,instagram,social_networks,contact_candidates,coleta_logs,is_deleted,reviews_count,rating')
      .in('id', IDS);
    if (error) throw error;
    const order = new Map(IDS.map((id, index) => [id, index]));
    return (data || []).sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
  }
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,city,state,neighborhood,address,number,phone,instagram,social_networks,contact_candidates,coleta_logs,is_deleted,reviews_count,rating')
      .eq('city', 'Campina Grande')
      .eq('state', 'PB')
      .or('is_deleted.eq.false,is_deleted.is.null')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows
    .filter((row) => !hasSavedInstagram(row) && !alreadyProcessed(row))
    .filter((row) => !isExcludedFoodAdjacentLead(row))
    .sort((a, b) => (Number(b.reviews_count || 0) - Number(a.reviews_count || 0)) || String(a.name).localeCompare(String(b.name)))
    .slice(OFFSET, LIMIT ? OFFSET + LIMIT : undefined);
};

const waitForSearch = async (page) => {
  try {
    await page.waitForFunction(() => {
      const text = String(document.body?.innerText || '');
      return document.querySelectorAll('a').length > 20
        || /unusual traffic|tr[aá]fego incomum|captcha|nossos sistemas detectaram/i.test(text);
    }, { timeout: 18000, polling: 500 });
  } catch {
    await sleep(1500);
  }
  await sleep(WAIT_MS);
};

const searchGoogle = async (page, query, row) => {
  const searchUrl = `https://www.google.com/search?hl=pt-BR&q=${encodeURIComponent(query)}`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForSearch(page);
  const result = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const text = clean(document.body?.innerText || '');
    const blocked = /unusual traffic|tr[aá]fego incomum|captcha|nossos sistemas detectaram|detected unusual traffic/i.test(text)
      || location.href.includes('/sorry/');
    const anchors = Array.from(document.querySelectorAll('a'));
    const candidates = [];
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      const container = a.closest('.g, .MjjYud, [data-ved], li, div');
      const context = clean(container?.innerText || a.innerText || '');
      const title = clean(container?.querySelector('h3')?.innerText || a.innerText || '');
      candidates.push({ href, title, context });
    }
    return { blocked, url: location.href, title: document.title, textExcerpt: text.slice(0, 1000), candidates };
  });
  if (result.blocked) {
    return { blocked: true, url: result.url, candidates: [], reason: result.textExcerpt || result.title };
  }

  const byUrl = new Map();
  for (const raw of result.candidates) {
    const url = extractInstagramUrl(raw.href);
    if (!url) continue;
    const candidate = {
      url,
      title: raw.title,
      context: raw.context,
      query,
    };
    const googleScore = scoreCandidateText(row, candidate).score;
    const current = byUrl.get(url);
    if (!current || googleScore > current.googleScore) {
      byUrl.set(url, { ...candidate, googleScore });
    }
  }
  return {
    blocked: false,
    url: result.url,
    candidates: [...byUrl.values()]
      .sort((a, b) => b.googleScore - a.googleScore)
      .slice(0, SEARCH_CANDIDATE_LIMIT),
  };
};

const scrapeInstagramProfile = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.waitForFunction(() => {
      const text = String(document.body?.innerText || '');
      return text.length > 200 || document.querySelector('meta[property="og:description"]');
    }, { timeout: 16000, polling: 500 });
  } catch {
    await sleep(1800);
  }
  await sleep(4500);
  const expandedMoreClicked = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const candidates = Array.from(document.querySelectorAll('button, span, div, a'))
      .filter((element) => visible(element))
      .filter((element) => /^(?:mais|more|ver mais|see more)$/.test(clean(element.innerText || element.textContent || element.getAttribute('aria-label') || '')));
    for (const element of candidates) {
      try {
        element.click();
        return true;
      } catch {
        // Try the next visible element.
      }
    }
    return false;
  }).catch(() => false);
  if (expandedMoreClicked) await sleep(1200);
  return page.evaluate((expandedMoreClickedValue) => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const text = clean(document.body?.innerText || '');
    const ogDescription = clean(document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '');
    const nameDescription = clean(document.querySelector('meta[name="description"]')?.getAttribute('content') || '');
    const metaDescription = [ogDescription, nameDescription].filter(Boolean).join(' | ');
    const title = clean(document.title || '');
    const unavailable = /Sorry, this page isn't available|Esta p[aá]gina n[aã]o est[aá] dispon[ií]vel|Page Not Found/i.test(text + title);
    const loginRequired = /log in|entrar|cadastre-se|sign up/i.test(text) && text.length < 2000 && !metaDescription;
    const followersText = metaDescription.match(/([\d.,KkMm]+)\s+Followers/i)?.[1]
      || text.match(/([\d.,KkMm]+)\s+seguidores/i)?.[1]
      || text.match(/([\d.,KkMm]+)\s+followers/i)?.[1]
      || '';
    const links = Array.from(document.querySelectorAll('a'))
      .map((anchor) => ({
        href: anchor.href || anchor.getAttribute('href') || '',
        text: clean(anchor.innerText || anchor.getAttribute('aria-label') || ''),
      }))
      .filter((link) => link.href || link.text)
      .slice(0, 80);
    return {
      url: location.href,
      title,
      metaDescription,
      ogDescription,
      nameDescription,
      text: text.slice(0, 6000),
      unavailable,
      loginRequired,
      followersText,
      links,
      expandedMoreClicked: expandedMoreClickedValue,
    };
  }, expandedMoreClicked);
};

const parseFollowers = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  const match = raw.match(/([\d.,]+)\s*(mil|k|m)?/i);
  if (!match) return null;
  const suffix = match[2]?.toLowerCase();
  const hasMultiplier = Boolean(suffix);
  const numberText = match[1];
  let normalizedNumber = numberText;
  if (!hasMultiplier && /^\d{1,3}(?:[.,]\d{3})+$/.test(numberText)) {
    normalizedNumber = numberText.replace(/[.,]/g, '');
  } else if (numberText.includes('.') && numberText.includes(',')) {
    const decimalSep = numberText.lastIndexOf(',') > numberText.lastIndexOf('.') ? ',' : '.';
    const thousandsSep = decimalSep === ',' ? '.' : ',';
    normalizedNumber = numberText
      .replace(new RegExp(`\\${thousandsSep}`, 'g'), '')
      .replace(decimalSep, '.');
  } else {
    normalizedNumber = numberText.replace(',', '.');
  }
  const base = Number(normalizedNumber);
  if (!Number.isFinite(base)) return null;
  const multiplier = suffix === 'm' ? 1_000_000 : suffix === 'k' || suffix === 'mil' ? 1_000 : 1;
  return Math.round(base * multiplier);
};

const buildQueries = (row) => {
  const baseName = String(row.google_maps_name || row.name || '').replace(/\s+/g, ' ').trim();
  const queries = [
    `${baseName} Campina Grande Instagram`,
    `site:instagram.com ${baseName} Campina Grande`,
    `"${baseName}" Instagram`,
    `"${baseName}" "Campina Grande"`,
    `${baseName} Instagram telefone`,
    `${baseName} cardapio Instagram`,
  ];
  const phone = digits(row.phone);
  if (phone.length >= 8) {
    const localPhone = phone.length > 11 && phone.startsWith('55') ? phone.slice(2) : phone;
    const ddd = localPhone.length >= 10 ? localPhone.slice(0, 2) : '';
    const subscriber = localPhone.length >= 10 ? localPhone.slice(2) : localPhone;
    const prettyPhone = ddd && subscriber.length >= 8
      ? `(${ddd}) ${subscriber.slice(0, subscriber.length - 4)}-${subscriber.slice(-4)}`
      : '';
    queries.push(`${phone.slice(-8)} Instagram ${baseName}`);
    queries.push(`${localPhone} Instagram ${baseName}`);
    if (prettyPhone) queries.push(`"${prettyPhone}" Instagram`);
    queries.push(`api.whatsapp.com/send?phone=55${localPhone} Instagram`);
    queries.push(`site:instagram.com "${phone.slice(-8)}"`);
  }
  const addressEvidence = getRowAddressEvidence(row);
  const addressToken = addressEvidence.tokens[0] || '';
  const addressNumber = addressEvidence.numbers[0] || '';
  if (addressToken && addressNumber) {
    queries.push(`site:instagram.com ${baseName} "${addressToken}" "${addressNumber}"`);
    queries.push(`"${baseName}" "${addressToken}" "${addressNumber}" Instagram`);
  }
  const neighborhood = String(row.neighborhood || '').replace(/\s+/g, ' ').trim();
  if (neighborhood && !/campina grande/i.test(neighborhood)) {
    queries.push(`${baseName} ${neighborhood} Instagram`);
  }
  return [...new Set(queries.map((query) => query.replace(/\s+/g, ' ').trim()).filter(Boolean))];
};

const isImportablePublicMenuUrl = (url) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (/ifood\.com\.br$/i.test(host)) return false;
    return /(?:app\.cardapioweb\.com|ola\.click|instadelivery\.com\.br|anota\.ai|goomer\.app|saipos\.com|livemenu\.app|deliverydireto\.com\.br|menu\.aiqfome\.com|pedido|cardapio|delivery)/i
      .test(`${host}${parsed.pathname}`);
  } catch {
    return false;
  }
};

const mergeInstagramSocial = (socialNetworks, instagram) => {
  const current = Array.isArray(socialNetworks) ? socialNetworks : [];
  return [
    ...current.filter((item) => item?.platform !== 'instagram'),
    instagram,
  ];
};

const removeInstagramSocial = (socialNetworks) => {
  const parsed = parseJson(socialNetworks);
  if (Array.isArray(parsed)) {
    return parsed.filter((item) =>
      item?.platform !== 'instagram'
      && !String(item?.url || '').includes('instagram.com'));
  }
  if (parsed && typeof parsed === 'object') {
    const next = { ...parsed };
    delete next.instagram;
    return next;
  }
  return parsed;
};

const buildContactCandidates = (current, decision) => {
  const parsed = parseJson(current);
  return {
    ...(Array.isArray(parsed) ? { previous: parsed } : parsed),
    instagram: {
      status: decision.status,
      url: decision.selectedUrl || null,
      confidence: decision.confidence || 0,
      source: 'visible_chrome_google_instagram_search',
      checkedAt: decision.checkedAt,
    },
  };
};

const buildUpdate = (row, decision) => {
  const checkedAt = decision.checkedAt;
  const previousLogs = parseJson(row.coleta_logs);
  const logEntry = {
    checkedAt,
    status: decision.status,
    selectedUrl: decision.selectedUrl || null,
    confidence: decision.confidence || 0,
    reason: decision.reason || '',
    queries: decision.queries,
    candidates: decision.candidates.map((candidate) => ({
      url: candidate.url,
      googleScore: candidate.googleScore,
      profileScore: candidate.profileScore,
      accepted: candidate.accepted,
      addressSignal: candidate.addressSignal,
      evidenceMatchedTokens: candidate.evidenceMatchedTokens,
      tokenCount: candidate.tokenCount,
      exactNameInEvidence: candidate.exactNameInEvidence,
      exactNameInHandle: candidate.exactNameInHandle,
      profileAddressConflict: candidate.profileAddressConflict,
      candidateAddressSnippets: candidate.candidateAddressSnippets || [],
      expandedMoreClicked: Boolean(candidate.expandedMoreClicked),
      title: candidate.title,
      context: String(candidate.context || '').slice(0, 700),
      profileTitle: candidate.profileTitle,
      profileMeta: candidate.profileMeta,
      externalEvidence: candidate.externalEvidence?.sources?.map((source) => ({
        kind: source.kind,
        url: source.url,
        name: source.name || null,
        city: source.city || null,
        state: source.state || null,
        phone: source.phone || null,
        address: source.address || null,
        instagram: source.instagram || null,
        locationConflict: Boolean(source.locationConflict),
        error: source.error || null,
      })) || [],
      rejectReason: candidate.rejectReason || null,
    })),
  };
  const update = {
    contacts_last_checked_at: checkedAt,
    contact_candidates: buildContactCandidates(row.contact_candidates, decision),
    coleta_logs: {
      ...previousLogs,
      [LOG_KEY]: logEntry,
    },
  };

  if (decision.status === 'found') {
    const selected = decision.candidates.find((candidate) => candidate.url === decision.selectedUrl);
    const followers = parseFollowers(selected?.followersText);
    const menuUrl = selected?.externalEvidence?.urls?.find(isImportablePublicMenuUrl) || '';
    update.instagram = decision.selectedUrl;
    update.primary_contact_source = 'instagram_google_visible_search';
    update.social_networks = mergeInstagramSocial(row.social_networks, {
      platform: 'instagram',
      url: decision.selectedUrl,
      followers: followers || undefined,
      confidence: decision.confidence,
      source: 'visible_chrome_google_instagram_search',
      checked_at: checkedAt,
    });
    if (followers) update.followers_override = followers;
    if (menuUrl) {
      update.other_url = menuUrl;
      update.external_url = menuUrl;
      update.other_url_label = /cardapioweb/i.test(menuUrl) ? 'Cardapio Web' : 'Cardapio digital';
      update.menu_status = row.menu_status === 'found' ? row.menu_status : 'needs_recollection';
      update.menu_status_reason = 'Link publico de cardapio encontrado no Instagram; aguardando coleta estruturada.';
    }
  } else if (decision.status === 'not_found') {
    update.instagram = null;
    update.primary_contact_source = null;
    update.social_networks = removeInstagramSocial(row.social_networks);
    update.followers_override = null;
  }
  return update;
};

const processRestaurant = async ({ row, googlePage, instagramPage }) => {
  const queries = buildQueries(row);
  const candidateMap = new Map();
  let blocked = null;

  if (rowLooksOutOfScopePublicPlace(row)) {
    return {
      status: 'not_found',
      checkedAt: new Date().toISOString(),
      queries,
      selectedUrl: null,
      confidence: 0,
      reason: 'Lead fora do escopo do app: lugar publico/feira/mercado, nao restaurante individual.',
      candidates: [],
    };
  }

  for (const query of queries) {
    const search = await searchGoogle(googlePage, query, row);
    if (search.blocked) {
      blocked = search;
      break;
    }
    for (const candidate of search.candidates) {
      const current = candidateMap.get(candidate.url);
      if (!current || candidate.googleScore > current.googleScore) candidateMap.set(candidate.url, candidate);
    }
    if (candidateMap.size >= PROFILE_CANDIDATE_LIMIT) break;
  }

  if (blocked) {
    return {
      status: 'blocked',
      checkedAt: new Date().toISOString(),
      queries,
      selectedUrl: null,
      confidence: 0,
      reason: `Google bloqueou/captcha: ${String(blocked.reason || '').slice(0, 200)}`,
      candidates: [],
    };
  }

  const candidates = [...candidateMap.values()].sort((a, b) => b.googleScore - a.googleScore).slice(0, PROFILE_CANDIDATE_LIMIT);
  const acceptedCandidates = [];
  for (const candidate of candidates) {
    try {
      const profile = await scrapeInstagramProfile(instagramPage, candidate.url);
      profile.externalEvidence = await collectExternalEvidence(profile);
      profile.externalEvidenceText = profile.externalEvidence.text;
      const profileScore = scoreCandidateText(row, candidate, profile);
      candidate.profileScore = profileScore.score;
      candidate.accepted = profileScore.accepted && !profile.unavailable;
      candidate.profileTitle = profile.title;
      candidate.profileMeta = profile.metaDescription;
      candidate.expandedMoreClicked = profile.expandedMoreClicked;
      candidate.externalEvidence = profile.externalEvidence;
      candidate.followersText = profile.followersText;
      candidate.profileReason = profileScore.reasons.join('; ');
      candidate.citySignal = profileScore.citySignal;
      candidate.phoneSignal = profileScore.phoneSignal;
      candidate.addressSignal = profileScore.addressSignal;
      candidate.namedLocationSignal = profileScore.namedLocationSignal;
      candidate.evidenceMatchedTokens = profileScore.evidenceMatchedTokens;
      candidate.tokenCount = profileScore.tokenCount;
      candidate.exactNameInEvidence = profileScore.exactNameInEvidence;
      candidate.exactNameInHandle = profileScore.exactNameInHandle;
      candidate.profileAddressConflict = profileScore.profileAddressConflict;
      candidate.candidateAddressSnippets = profileScore.candidateAddressSnippets || [];
      if (profile.unavailable) candidate.rejectReason = 'perfil indisponivel';
      if (profile.loginRequired) candidate.rejectReason = 'login exigido sem bio suficiente';
      if (profileScore.locationConflict) {
        const conflicts = [
          ...(profileScore.conflictLocations || []),
          ...(profileScore.stateAbbreviationConflicts || []),
        ].filter(Boolean);
        candidate.rejectReason = `cidade/estado conflitante sem sinal de Campina/telefone: ${conflicts.join(', ')}`;
      }
      if (profileScore.dddConflict) {
        candidate.rejectReason = `ddd conflitante sem sinal de Campina/telefone: ${profileScore.conflictDdds.join(', ')}`;
      }
      if (profileScore.phoneMismatchConflict) {
        candidate.rejectReason = `telefone do perfil diverge do Maps sem endereco confirmando: ${profileScore.profileLocalPhoneTails.join(', ')}`;
      }
      if (profileScore.profileAddressConflict) {
        candidate.rejectReason = `endereco do perfil diverge do Maps sem telefone correspondente: ${(profileScore.candidateAddressSnippets || []).slice(0, 2).join(' | ')}`;
      }
      if (profileScore.branchLocationConflict) {
        candidate.rejectReason = 'unidade/local conflitante (ex.: Boulevard vs Partage) sem telefone correspondente';
      }
      if (profileScore.handleLocalityConflict) {
        candidate.rejectReason = 'handle indica outra praca (ex.: jp) sem telefone correspondente';
      }
      if (profileScore.foodAdjacentExcludedConflict) {
        candidate.rejectReason = 'categoria excluida do app (padaria/panificadora/acougue/carnes/frango cru/peixaria/conveniencia/buffet/bolos)';
      }
      if (profileScore.nonFoodConflict) {
        candidate.rejectReason = 'perfil indica negocio nao-food sem telefone correspondente';
      }
      if (profileScore.genericLeadConflict) {
        candidate.rejectReason = 'nome do lead e generico demais sem telefone correspondente';
      }
      if (profileScore.singleTokenJoinedSubstringConflict) {
        candidate.rejectReason = 'token unico aparece apenas por juncao/substring, nao como palavra ou handle real';
      }
      if (profileScore.weakSingleTokenMissingFoodIdentity) {
        candidate.rejectReason = 'perfil local usa só um token do nome e não confirma o tipo do lead';
      }
      if (profileScore.weakSingleTokenLocalWithoutExact) {
        candidate.rejectReason = 'perfil local usa apenas um token fraco do nome, sem nome exato/telefone/endereco';
      }
      if (profileScore.commonBusinessNameWithoutLocal) {
        candidate.rejectReason = 'nome comum de estabelecimento sem sinal de Campina/CG ou telefone correspondente';
      }
      if (profileScore.locationOnlyBusinessNameConflict) {
        candidate.rejectReason = 'nome do lead parece categoria + bairro/localidade; perfil tem outro nome sem telefone/endereco correspondente';
      }
      if (profileScore.commonFirstNameOnly) {
        candidate.rejectReason = 'nome comum com primeiro nome curto sem telefone, bairro ou nome exato completo';
      }
      if (profileScore.singlePersonBarWithoutLocal) {
        candidate.rejectReason = 'bar/boteco com nome curto ou comum sem Campina/telefone/endereco';
      }
      if (profileScore.exactSingleTokenWithoutLocal) {
        candidate.rejectReason = 'marca de uma palavra sem prova local por Campina/telefone/endereco';
      }
      if (profileScore.commonExactPhraseWithoutLocal) {
        candidate.rejectReason = 'nome/frase comum sem prova local por Campina/telefone/endereco';
      }
      if (profileScore.genericCasaSaborConflict) {
        candidate.rejectReason = 'casa/sabor e combinacao generica sem telefone, bairro ou nome exato completo';
      }
      if (profileScore.genericSaborCaseiroConflict) {
        candidate.rejectReason = 'sabor caseiro e nome generico sem Campina/telefone/bairro';
      }
      if (profileScore.genericSaborBomOrderConflict) {
        candidate.rejectReason = 'sabor bom/bom sabor em ordem diferente sem telefone correspondente';
      }
      if (profileScore.bomSaborFoodTypeConflict) {
        candidate.rejectReason = 'bom sabor com tipo de comida divergente sem telefone/endereco correspondente';
      }
      if (profileScore.profileAddressConflict) {
        candidate.rejectReason = `endereco do perfil diverge do Maps sem telefone correspondente: ${(profileScore.candidateAddressSnippets || []).slice(0, 2).join(' | ')}`;
      }
      if (!candidate.accepted && !candidate.rejectReason) {
        candidate.rejectReason = `score ${profileScore.score}; tokens ${profileScore.matchedTokens}/${profileScore.tokenCount}; city=${profileScore.citySignal}; phone=${profileScore.phoneSignal}`;
      }
      if (candidate.accepted) {
        acceptedCandidates.push(candidate);
      }
    } catch (error) {
      candidate.rejectReason = error.message;
    }
  }

  if (acceptedCandidates.length > 0) {
    const selected = acceptedCandidates.sort((a, b) => {
      if (Boolean(b.phoneSignal) !== Boolean(a.phoneSignal)) return Number(Boolean(b.phoneSignal)) - Number(Boolean(a.phoneSignal));
      if (Boolean(b.addressSignal) !== Boolean(a.addressSignal)) return Number(Boolean(b.addressSignal)) - Number(Boolean(a.addressSignal));
      const aFullCoverage = (a.tokenCount || 0) > 0 && (a.evidenceMatchedTokens || 0) >= (a.tokenCount || 0);
      const bFullCoverage = (b.tokenCount || 0) > 0 && (b.evidenceMatchedTokens || 0) >= (b.tokenCount || 0);
      if (bFullCoverage !== aFullCoverage) return Number(bFullCoverage) - Number(aFullCoverage);
      if (Boolean(b.citySignal) !== Boolean(a.citySignal)) return Number(Boolean(b.citySignal)) - Number(Boolean(a.citySignal));
      if (Boolean(b.exactNameInEvidence) !== Boolean(a.exactNameInEvidence)) return Number(Boolean(b.exactNameInEvidence)) - Number(Boolean(a.exactNameInEvidence));
      if (Boolean(b.exactNameInHandle) !== Boolean(a.exactNameInHandle)) return Number(Boolean(b.exactNameInHandle)) - Number(Boolean(a.exactNameInHandle));
      return (b.profileScore || 0) - (a.profileScore || 0);
    })[0];
    const acceptedWithLocalProof = acceptedCandidates.filter((candidate) =>
      candidate.phoneSignal || candidate.addressSignal || candidate.citySignal);
    if (acceptedCandidates.length > 1 && acceptedWithLocalProof.length === 0) {
      for (const candidate of acceptedCandidates) {
        candidate.accepted = false;
        candidate.rejectReason = 'multiplos perfis aceitos apenas por nome, sem Campina/telefone/endereco para desempatar';
      }
      return {
        status: 'not_found',
        checkedAt: new Date().toISOString(),
        queries,
        selectedUrl: null,
        confidence: 0,
        reason: 'Multiplos candidatos tinham nome parecido, mas nenhum provou Campina Grande/telefone/endereco com seguranca.',
        candidates,
      };
    }
    return {
      status: 'found',
      checkedAt: new Date().toISOString(),
      queries,
      selectedUrl: selected.url,
      confidence: Math.min(0.99, Math.max(0.72, (selected.profileScore || 0) / 120)),
      reason: `Perfil confirmado por Google+Instagram: ${selected.profileReason || selected.title || selected.url}`,
      candidates,
    };
  }

  return {
    status: 'not_found',
    checkedAt: new Date().toISOString(),
    queries,
    selectedUrl: null,
    confidence: 0,
    reason: candidates.length
      ? 'Candidatos encontrados, mas nenhum confirmou nome/cidade/telefone com seguranca.'
      : 'Google nao retornou perfil de Instagram elegivel.',
    candidates,
  };
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const targets = await fetchRestaurants();
const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
const googlePage = await browser.newPage();
const instagramPage = await browser.newPage();
await googlePage.setViewport({ width: 1366, height: 900 });
await instagramPage.setViewport({ width: 1366, height: 900 });

const rows = [];
const counts = { found: 0, not_found: 0, blocked: 0, error: 0 };
try {
  for (let index = 0; index < targets.length; index += 1) {
    const row = targets[index];
    try {
      const decision = await processRestaurant({ row, googlePage, instagramPage });
      const update = buildUpdate(row, decision);
      if (APPLY) {
        const { error } = await supabase.from('restaurants').update(update).eq('id', row.id);
        if (error) throw error;
      }
      const record = {
        index: index + 1,
        total: targets.length,
        id: row.id,
        name: row.name,
        category: row.category,
        status: decision.status,
        selectedUrl: decision.selectedUrl,
        confidence: decision.confidence,
        reason: decision.reason,
        candidates: decision.candidates.map((candidate) => ({
          url: candidate.url,
          googleScore: candidate.googleScore,
          profileScore: candidate.profileScore,
          accepted: candidate.accepted,
          addressSignal: candidate.addressSignal,
          evidenceMatchedTokens: candidate.evidenceMatchedTokens,
          tokenCount: candidate.tokenCount,
          exactNameInEvidence: candidate.exactNameInEvidence,
          exactNameInHandle: candidate.exactNameInHandle,
          rejectReason: candidate.rejectReason || null,
        })),
      };
      rows.push(record);
      counts[decision.status] = (counts[decision.status] || 0) + 1;
      fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(record)}\n`);
      console.log(JSON.stringify(record));
      if (decision.status === 'blocked') break;
      await sleep(1200);
    } catch (error) {
      const record = {
        index: index + 1,
        total: targets.length,
        id: row.id,
        name: row.name,
        status: 'error',
        reason: error.message,
      };
      rows.push(record);
      counts.error += 1;
      fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(record)}\n`);
      console.error(JSON.stringify(record));
      await sleep(2000);
    }
  }
} finally {
  await googlePage.close().catch(() => {});
  await instagramPage.close().catch(() => {});
  await browser.disconnect();
}

const summary = {
  mode: APPLY ? 'apply' : 'dry-run',
  generatedAt: new Date().toISOString(),
  runId: RUN_ID,
  limit: LIMIT,
  offset: OFFSET,
  redo: REDO,
  redoNotFoundBefore: REDO_NOT_FOUND_BEFORE || null,
  searchCandidateLimit: SEARCH_CANDIDATE_LIMIT,
  profileCandidateLimit: PROFILE_CANDIDATE_LIMIT,
  targetCount: targets.length,
  processed: rows.length,
  counts,
  outputDir: OUT_DIR,
  checkpointFile: CHECKPOINT_FILE,
  rows,
};
fs.writeFileSync(SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  mode: summary.mode,
  targetCount: summary.targetCount,
  processed: summary.processed,
  counts,
  summaryFile: SUMMARY_FILE,
  outputDir: OUT_DIR,
}, null, 2));
