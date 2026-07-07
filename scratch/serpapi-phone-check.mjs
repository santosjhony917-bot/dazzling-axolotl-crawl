import fs from 'node:fs';
import path from 'node:path';
import {
  dataForSeoOrganicSearch,
  ensureProviderCredentials,
} from './search-provider.mjs';

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

const query = process.argv.slice(2).join(' ').trim();
if (!query) {
  console.error('Usage: node scratch/serpapi-phone-check.mjs <query>');
  process.exit(1);
}

const env = readEnv();
const searchProvider = String(env.SEARCH_PROVIDER || env.SERP_PROVIDER || 'dataforseo').toLowerCase();
ensureProviderCredentials(env, searchProvider);

async function serpApiSearch() {
  const apiKey = env.SERPAPI_KEY || env.SERP_API_KEY || env.SERPAPI_API_KEY || env.VITE_SERPAPI_KEY || env.VITE_SERPAPI_API_KEY;
  if (!apiKey) throw new Error('SERPAPI key ausente no env.');
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('google_domain', 'google.com.br');
  url.searchParams.set('hl', 'pt-br');
  url.searchParams.set('gl', 'br');
  url.searchParams.set('api_key', apiKey);
  const response = await fetch(url);
  const payload = await response.json();
  return {
    knowledge_graph: payload.knowledge_graph || null,
    organic_results: payload.organic_results || [],
    local_results: payload.local_results || null,
  };
}

const payload = searchProvider === 'serpapi'
  ? await serpApiSearch()
  : await dataForSeoOrganicSearch(env, query, {
    numResults: 10,
    timeoutMs: 60000,
    languageCode: 'pt',
    seDomain: 'google.com.br',
    locationName: 'Brazil',
  });
const out = {
  query,
  searchProvider,
  searchedAt: new Date().toISOString(),
  knowledge_graph: payload.knowledge_graph ? {
    title: payload.knowledge_graph.title || null,
    phone: payload.knowledge_graph.phone || null,
    website: payload.knowledge_graph.website || null,
    address: payload.knowledge_graph.address || null,
  } : null,
  organic_results: (payload.organic_results || []).slice(0, 6).map((result) => ({
    title: result.title || null,
    link: result.link || null,
    displayed_link: result.displayed_link || null,
    snippet: result.snippet || null,
  })),
};

const dir = path.join('scratch', `${searchProvider}-menu-discovery`, 'phone-checks');
fs.mkdirSync(dir, { recursive: true });
const slug = query
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || 'phone-check';
const file = path.join(dir, `${slug}.json`);
fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');
console.log(JSON.stringify({ file, ...out }, null, 2));
