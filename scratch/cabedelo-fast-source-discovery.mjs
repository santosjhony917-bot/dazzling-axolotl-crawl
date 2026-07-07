import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  dataForSeoOrganicSearch,
  ensureProviderCredentials,
} from './search-provider.mjs';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
const LIMIT = Math.max(1, Number(argValue('--limit', '80')) || 80);
const CONCURRENCY = Math.max(1, Math.min(16, Number(argValue('--concurrency', '8')) || 8));
const NUM_RESULTS = Math.max(5, Math.min(20, Number(argValue('--num', '10')) || 10));
const APPLY = !hasFlag('--dry-run');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const SEARCH_PROVIDER = argValue(
  '--provider',
  process.env.SEARCH_PROVIDER || process.env.SERP_PROVIDER || 'dataforseo',
).toLowerCase();
const OUT_DIR = path.join('scratch', `${SEARCH_PROVIDER}-fast-source-discovery`, RUN_ID);
const PROVIDER_LOG_KEY = `${SEARCH_PROVIDER}_fast_menu_discovery_v1`;

const STRUCTURED_PLATFORMS = new Set([
  'cardapioweb',
  'anota_ai',
  'restaurantlogin',
  'instadelivery',
  'whatsmenu',
  'brendi',
  'meucarrinho',
  'yooga',
  'cardapiodigital',
  'saipos',
  'olaclick',
  'goomer',
  'livemenu',
  'deliverydireto',
  'menudino',
]);

const IMPLEMENTED_FAST_PLATFORMS = new Set([
  'cardapioweb',
  'anota_ai',
  'restaurantlogin',
  'instadelivery',
  'whatsmenu',
  'brendi',
  'meucarrinho',
  'yooga',
  'cardapiodigital',
]);

const NAME_STOP_TOKENS = new Set([
  'cabedelo', 'pb', 'paraiba', 'intermares', 'ponta', 'campina', 'jacare', 'camboinha',
  'centro', 'praia', 'restaurante', 'restaurant', 'bar', 'pizzaria', 'pizza', 'burger',
  'burguer', 'hamburguer', 'hamburgueria', 'lanchonete', 'lanche', 'lanches', 'delivery',
  'cardapio', 'menu', 'pedido', 'oficial', 'acai', 'açaí', 'sushi', 'temakeria',
  'churrascaria', 'cafeteria', 'doceria', 'sorveteria', 'pastelaria', 'pastel',
  'comida', 'food', 'grill', 'self', 'service', 'loja', 'casa', 'point', 'hot', 'dogs',
  'do', 'da', 'de', 'dos', 'das', 'e', 'em', 'com', 'a', 'o', 'os', 'as', 'seu', 'sua',
  'brasil', 'express', 'gourmet',
]);

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function writeJson(name, value) {
  ensureOutDir();
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(value, null, 2));
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

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseUrl(value) {
  const raw = clean(value);
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(`https://${raw}`);
    } catch {
      return null;
    }
  }
}

function canonicalUrl(value) {
  const url = parseUrl(value);
  if (!url) return clean(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || ['fbclid', 'gclid', 'igshid', 'si'].includes(lower)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  return url.toString().replace(/\/$/, '');
}

function hostOf(value) {
  return parseUrl(value)?.hostname.toLowerCase().replace(/^www\./, '') || '';
}

function detectPlatform(value) {
  const url = canonicalUrl(value).toLowerCase();
  const host = hostOf(value);
  if (/ifood\.com(\.br)?/.test(url) || host.includes('ifood')) return 'ifood';
  if (host.includes('cardapioweb')) return 'cardapioweb';
  if (host === 'pedido.anota.ai' || host.endsWith('.anota.ai') || url.includes('anota.ai')) return 'anota_ai';
  if (host.includes('restaurantlogin.com') || host.includes('saborvip')) return 'restaurantlogin';
  if (host.includes('instadelivery')) return 'instadelivery';
  if (host.includes('whatsmenu')) return 'whatsmenu';
  if (host.includes('brendi')) return 'brendi';
  if (host.includes('meucarrinho')) return 'meucarrinho';
  if (host.includes('yooga')) return 'yooga';
  if (host.includes('cardapiodigital') || host.includes('cardapio.digital')) return 'cardapiodigital';
  if (host.includes('saipos')) return 'saipos';
  if (host.includes('ola.click') || host.includes('olaclick')) return 'olaclick';
  if (host.includes('goomer')) return 'goomer';
  if (host.includes('livemenu')) return 'livemenu';
  if (host.includes('deliverydireto')) return 'deliverydireto';
  if (host.includes('menudino')) return 'menudino';
  if (host.includes('linktr.ee') || host.includes('linktree') || host.includes('linkme.bio') || host.includes('instabio.cc') || host.includes('abre.bio') || host.includes('abre.ai')) return 'linkhub';
  if (host.includes('instagram.com')) return 'instagram';
  if (host.includes('facebook.com') || host.includes('fb.com')) return 'facebook';
  if (host.includes('wa.me') || host.includes('whatsapp.com')) return 'whatsapp';
  if (host.includes('google.com') || host.includes('goo.gl') || host.includes('maps.app.goo.gl')) return 'google';
  if (/\.(pdf|png|jpe?g|webp)(?:[?#].*)?$/i.test(url)) return 'direct_asset';
  return host || 'unknown';
}

function sourceLooksUsable(row) {
  const sources = [row.other_url, row.external_url].map(clean).filter(Boolean);
  if (!sources.length) return false;
  return sources.some((source) => {
    const platform = detectPlatform(source);
    return STRUCTURED_PLATFORMS.has(platform) || platform === 'linkhub';
  });
}

function nameTokens(row) {
  return normalize(row.google_maps_name || row.name)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !NAME_STOP_TOKENS.has(token));
}

function sourceIdentityEvidence(candidate, tokens) {
  const host = hostOf(candidate.link);
  const url = parseUrl(candidate.link);
  const urlText = normalize(`${host} ${url?.pathname || ''}`);
  const titleText = normalize(candidate.title);
  const snippetText = normalize(candidate.snippet);
  const fullText = normalize(`${candidate.title} ${candidate.snippet} ${candidate.link}`);
  const urlHits = tokens.filter((token) => urlText.includes(token));
  const titleHits = tokens.filter((token) => titleText.includes(token));
  const snippetHits = tokens.filter((token) => snippetText.includes(token));
  const tokenHits = tokens.filter((token) => fullText.includes(token));
  const hasStrongToken = tokens.some((token) => token.length >= 4);
  const hasShortExactBrand = tokens.length === 1
    && tokens[0].length === 3
    && urlHits.length === 1
    && (titleHits.length === 1 || snippetHits.length === 1);
  const titleStrongEnough = titleHits.length >= Math.min(2, Math.max(1, tokens.length));
  const strongBrand = tokens.length > 0
    && (hasStrongToken || hasShortExactBrand)
    && (
      urlHits.length >= 1
      || titleStrongEnough
      || (tokens.length === 1 && titleHits.length === 1 && urlHits.length === 0 && snippetHits.length >= 1)
    );
  return {
    tokenHits,
    urlHits,
    titleHits,
    snippetHits,
    strongBrand,
  };
}

function buildQuery(row) {
  return clean([
    row.google_maps_name || row.name,
    row.neighborhood,
    row.address,
    row.phone,
    CITY,
    STATE,
    'cardapio pedido delivery',
  ].filter(Boolean).join(' '));
}

async function fetchSerpApi(apiKey, query) {
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('google_domain', 'google.com.br');
  url.searchParams.set('gl', 'br');
  url.searchParams.set('hl', 'pt-br');
  url.searchParams.set('num', String(NUM_RESULTS));
  url.searchParams.set('api_key', apiKey);
  const response = await fetch(url);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.error) throw new Error(payload.error || `SerpApi HTTP ${response.status}`);
  return payload;
}

async function fetchSearchProvider(env, apiKey, query) {
  if (SEARCH_PROVIDER === 'serpapi') return fetchSerpApi(apiKey, query);
  return dataForSeoOrganicSearch(env, query, {
    numResults: NUM_RESULTS,
    timeoutMs: 60000,
    languageCode: 'pt',
    seDomain: 'google.com.br',
    locationName: `${CITY}, Paraiba, Brazil`,
  });
}

function candidatesFromPayload(payload) {
  const organic = Array.isArray(payload.organic_results) ? payload.organic_results : [];
  const local = Array.isArray(payload.local_results?.places) ? payload.local_results.places : [];
  const out = [];
  for (const item of organic) {
    if (!item.link) continue;
    out.push({
      source: 'organic',
      position: item.position ?? null,
      title: clean(item.title),
      link: canonicalUrl(item.link),
      snippet: clean(item.snippet),
      displayedLink: clean(item.displayed_link),
    });
  }
  for (const item of local) {
    const link = item.website || item.link || item.place_id_search;
    if (!link) continue;
    out.push({
      source: 'local',
      position: item.position ?? null,
      title: clean(item.title),
      link: canonicalUrl(link),
      snippet: clean([item.type, item.address, item.phone].filter(Boolean).join(' | ')),
      displayedLink: clean(item.website || item.link),
    });
  }
  const seen = new Set();
  return out
    .filter((candidate) => {
      const key = candidate.link.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((candidate) => ({ ...candidate, platform: detectPlatform(candidate.link) }));
}

function scoreCandidate(candidate, row) {
  const tokens = nameTokens(row);
  const text = normalize(`${candidate.title} ${candidate.snippet} ${candidate.link}`);
  const host = hostOf(candidate.link);
  const evidence = sourceIdentityEvidence(candidate, tokens);
  let score = 0;
  const flags = [];
  if (STRUCTURED_PLATFORMS.has(candidate.platform)) score += 82;
  if (IMPLEMENTED_FAST_PLATFORMS.has(candidate.platform)) score += 8;
  if (candidate.platform === 'linkhub') score += 34;
  if (candidate.platform === 'instagram') score += 20;
  if (candidate.platform === 'ifood') {
    score -= 120;
    flags.push('ifood_rejected');
  }
  if (candidate.platform === 'whatsapp' || candidate.platform === 'google') {
    score -= 20;
    flags.push(`${candidate.platform}_not_menu_source`);
  }

  score += Math.min(30, evidence.tokenHits.length * 7);
  if (tokens.length === 0) {
    score -= 55;
    flags.push('brand_too_generic_for_auto_apply');
  } else if (evidence.tokenHits.length === 0) {
    score -= 35;
    flags.push('brand_not_confirmed');
  }
  if (!evidence.strongBrand) {
    score -= 30;
    flags.push('weak_url_or_title_brand_match');
  }
  if (normalize(host).includes(tokens[0] || '')) score += 8;
  if (text.includes(normalize(CITY))) score += 20;
  else flags.push('city_not_confirmed');
  if (text.includes(normalize(STATE))) score += 6;
  if (/\b(cardapio|cardápio|menu|pedido|delivery|peca|peça)\b/i.test(`${candidate.title} ${candidate.snippet} ${candidate.link}`)) score += 12;
  if (/\b(joao pessoa|joão pessoa|recife|natal|fortaleza|sao paulo|são paulo|rio de janeiro|caico|caicó)\b/i.test(text) && !text.includes(normalize(CITY))) {
    score -= 55;
    flags.push('conflicting_location');
  }

  const tier = score >= 92
    && STRUCTURED_PLATFORMS.has(candidate.platform)
    && IMPLEMENTED_FAST_PLATFORMS.has(candidate.platform)
    && evidence.strongBrand
    && !flags.includes('city_not_confirmed')
    && !flags.includes('brand_not_confirmed')
    && !flags.includes('brand_too_generic_for_auto_apply')
    && !flags.includes('weak_url_or_title_brand_match')
    && candidate.platform !== 'ifood'
    ? 'green'
    : score >= 55 && candidate.platform !== 'ifood'
      ? 'yellow'
      : 'red';
  return {
    ...candidate,
    score,
    tier,
    flags,
    tokenHits: evidence.tokenHits,
    urlHits: evidence.urlHits,
    titleHits: evidence.titleHits,
    snippetHits: evidence.snippetHits,
  };
}

function chooseBest(candidates) {
  return candidates
    .filter((candidate) => candidate.platform !== 'ifood')
    .sort((a, b) => b.score - a.score)[0] || null;
}

async function runLimited(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function loop() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, loop));
  return results;
}

async function fetchTargets(supabase) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,google_maps_name,category,address,number,neighborhood,city,state,phone,rating,reviews_count,other_url,external_url,other_url_label,menu_status,ai_validated,is_deleted,coleta_logs')
    .eq('city', CITY)
    .eq('state', STATE)
    .or('is_deleted.eq.false,is_deleted.is.null')
    .order('reviews_count', { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  return (data || [])
    .filter((row) => !(row.menu_status === 'found' && row.ai_validated === true))
    .filter((row) => !sourceLooksUsable(row))
    .slice(0, LIMIT);
}

async function applyGreen(supabase, row, best, result) {
  const now = new Date().toISOString();
  const logs = parseJson(row.coleta_logs);
  const { error } = await supabase
    .from('restaurants')
    .update({
      other_url: best.link,
      other_url_label: `${SEARCH_PROVIDER} menu discovery (${best.platform})`,
      menu_status: 'needs_recollection',
      menu_status_reason: `Fonte de cardapio encontrada via ${SEARCH_PROVIDER}: ${best.platform} score ${best.score}.`,
      menu_last_checked_at: now,
      coleta_logs: {
        ...logs,
        [PROVIDER_LOG_KEY]: {
          checkedAt: now,
          query: result.query,
          selected: best,
          candidateCount: result.candidates.length,
          source: `${SEARCH_PROVIDER}/google_search`,
        },
      },
    })
    .eq('id', row.id);
  if (error) throw error;
}

async function main() {
  ensureOutDir();
  const env = readEnv();
  ensureProviderCredentials(env, SEARCH_PROVIDER);
  const apiKey = SEARCH_PROVIDER === 'serpapi'
    ? (env.SERPAPI_API_KEY || env.VITE_SERPAPI_API_KEY)
    : null;
  const supabase = createClient(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );

  const targets = await fetchTargets(supabase);
  console.log(JSON.stringify({
    step: 'source_discovery_start',
    searchProvider: SEARCH_PROVIDER,
    targets: targets.length,
    concurrency: CONCURRENCY,
    apply: APPLY,
  }));

  const results = await runLimited(targets, CONCURRENCY, async (row, index) => {
    const query = buildQuery(row);
    const result = {
      index: index + 1,
      restaurant: {
        id: row.id,
        name: clean(row.google_maps_name || row.name),
        reviews_count: row.reviews_count ?? null,
        rating: row.rating ?? null,
      },
      query,
      status: 'error',
      best: null,
      candidates: [],
      error: null,
      applied: false,
    };
    try {
      const payload = await fetchSearchProvider(env, apiKey, query);
      result.candidates = candidatesFromPayload(payload)
        .map((candidate) => scoreCandidate(candidate, row))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      result.best = chooseBest(result.candidates);
      result.status = result.best?.tier === 'green'
        ? 'green_source_found'
        : result.best?.tier === 'yellow'
          ? 'yellow_source_review'
          : 'no_reliable_source';
      if (APPLY && result.best?.tier === 'green') {
        await applyGreen(supabase, row, result.best, result);
        result.applied = true;
      }
    } catch (err) {
      result.error = err.message || String(err);
    }
    console.log(JSON.stringify({
      index: result.index,
      total: targets.length,
      name: result.restaurant.name,
      status: result.status,
      applied: result.applied,
      best: result.best ? {
        platform: result.best.platform,
        tier: result.best.tier,
        score: result.best.score,
        link: result.best.link,
        flags: result.best.flags,
      } : null,
      error: result.error,
    }));
    return result;
  });

  const summary = {
    success: true,
    runId: RUN_ID,
    outDir: OUT_DIR,
    city: CITY,
    state: STATE,
    searchProvider: SEARCH_PROVIDER,
    apply: APPLY,
    targetCount: targets.length,
    processed: results.length,
    appliedGreen: results.filter((row) => row.applied).length,
    green: results.filter((row) => row.best?.tier === 'green').length,
    yellow: results.filter((row) => row.best?.tier === 'yellow').length,
    redOrNone: results.filter((row) => !row.best || row.best.tier === 'red').length,
    byPlatform: results.reduce((acc, row) => {
      const key = row.best?.platform || 'none';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    results,
  };
  writeJson('summary.json', summary);
  fs.writeFileSync(path.join(OUT_DIR, 'results.jsonl'), results.map((row) => JSON.stringify(row)).join('\n') + '\n');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  ensureOutDir();
  const payload = {
    success: false,
    runId: RUN_ID,
    outDir: OUT_DIR,
    searchProvider: SEARCH_PROVIDER,
    error: error.message || String(error),
  };
  writeJson('summary.json', payload);
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
});
