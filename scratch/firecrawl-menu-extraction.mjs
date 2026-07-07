import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'firecrawl-menu-extraction', RUN_ID);
const URL_TO_SCRAPE = argValue('--url', '');
const RESTAURANT_NAME = argValue('--restaurant', '');
const MODE = argValue('--mode', 'scrape');
const LIMIT = Math.max(1, Math.min(Number(argValue('--limit', '10')) || 10, 50));
const MAX_DEPTH = Math.max(0, Math.min(Number(argValue('--max-depth', '1')) || 1, 3));
const WANT_SCREENSHOT = hasFlag('--screenshot');
const WANT_JSON = hasFlag('--json');

fs.mkdirSync(OUT_DIR, { recursive: true });

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
  const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
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

function detectPlatform(urlValue) {
  const lower = urlValue.toLowerCase();
  if (lower.includes('ifood.com')) return 'ifood';
  if (lower.includes('cardapioweb')) return 'cardapioweb';
  if (lower.includes('anota.ai')) return 'anota_ai';
  if (lower.includes('instadelivery')) return 'instadelivery';
  if (lower.includes('goomer')) return 'goomer';
  if (lower.includes('ola.click') || lower.includes('olaclick')) return 'olaclick';
  if (lower.includes('saipos')) return 'saipos';
  if (lower.includes('brendi')) return 'brendi';
  if (lower.includes('deliverydireto')) return 'deliverydireto';
  if (lower.includes('menudino')) return 'menudino';
  if (lower.includes('whatsmenu')) return 'whatsmenu';
  if (lower.includes('instagram.com')) return 'instagram';
  return 'unknown';
}

function scoreEvidence({ markdown = '', links = [], metadata = {} }) {
  const text = `${markdown}\n${links.join('\n')}\n${JSON.stringify(metadata)}`;
  const normalized = normalize(text);
  const prices = [...text.matchAll(/(?:R\$\s*)?\d{1,3}[,.]\d{2}/g)].map((match) => match[0]);
  const menuWords = [
    'cardapio',
    'cardápio',
    'menu',
    'pedido',
    'delivery',
    'combo',
    'pizza',
    'hamburg',
    'bebida',
    'adicional',
    'esfiha',
    'lanche',
    'porcao',
    'porção',
  ].filter((word) => normalized.includes(normalize(word)));
  const cityConfirmed = normalized.includes('campina grande') || normalized.includes('campina-grande');
  const nameTokens = normalize(RESTAURANT_NAME)
    .split(' ')
    .filter((token) => token.length >= 3 && !['restaurante', 'pizzaria', 'bar', 'delivery', 'campina', 'grande'].includes(token));
  const matchedNameTokens = nameTokens.filter((token) => normalized.includes(token));
  const operationalJunk = ['ketchup', 'catchup', 'talher', 'guardanapo', 'sacola', 'embalagem', 'descartavel', 'descartável']
    .filter((word) => normalized.includes(normalize(word)));

  let tier = 'red';
  const flags = [];
  if (prices.length >= 5 && menuWords.length >= 3) tier = 'yellow';
  if (prices.length >= 10 && menuWords.length >= 4 && (cityConfirmed || matchedNameTokens.length >= 1)) tier = 'green';
  if (!cityConfirmed) flags.push('city_not_confirmed');
  if (RESTAURANT_NAME && matchedNameTokens.length === 0) flags.push('name_not_confirmed');
  if (operationalJunk.length) flags.push('operational_options_may_need_cleanup');

  return {
    tier,
    priceCount: prices.length,
    samplePrices: [...new Set(prices)].slice(0, 20),
    menuWords,
    cityConfirmed,
    matchedNameTokens,
    operationalJunk,
    flags,
  };
}

function menuJsonFormat() {
  return {
    type: 'json',
    prompt: [
      'Extract restaurant menu data from this page.',
      'Return only visible menu/catalog information.',
      'Preserve item names, descriptions, categories, prices, sizes, flavors, required choices, add-ons, option groups, and price variations.',
      'Do not include iFood-only data.',
      'Flag operational options such as ketchup, cutlery, napkins, bags, packaging, disposable items, CPF, and change/troco.',
      'Also extract visible restaurant name, city, address, phone, and source URL when available.',
    ].join(' '),
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        restaurantName: { type: 'string' },
        city: { type: 'string' },
        address: { type: 'string' },
        phone: { type: 'string' },
        sourceUrl: { type: 'string' },
        categories: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    price: { type: 'string' },
                    optionGroups: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          name: { type: 'string' },
                          required: { type: 'boolean' },
                          min: { type: 'number' },
                          max: { type: 'number' },
                          options: {
                            type: 'array',
                            items: {
                              type: 'object',
                              additionalProperties: false,
                              properties: {
                                name: { type: 'string' },
                                priceDelta: { type: 'string' },
                              },
                              required: ['name'],
                            },
                          },
                        },
                        required: ['name'],
                      },
                    },
                  },
                  required: ['name'],
                },
              },
            },
            required: ['name', 'items'],
          },
        },
        warnings: { type: 'array', items: { type: 'string' } },
      },
      required: ['categories'],
    },
  };
}

async function firecrawlRequest(apiKey, endpoint, body) {
  const response = await fetch(`https://api.firecrawl.dev/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Firecrawl returned non-JSON response: ${text.slice(0, 200)}`);
  }
  if (!response.ok || payload.error || payload.success === false) {
    throw new Error(payload.error || `Firecrawl HTTP ${response.status}`);
  }
  return payload;
}

async function scrape(apiKey, url) {
  const formats = ['markdown', 'links'];
  if (WANT_SCREENSHOT) formats.push('screenshot');
  if (WANT_JSON) formats.push(menuJsonFormat());
  return firecrawlRequest(apiKey, 'scrape', {
    url,
    formats,
    onlyMainContent: true,
    timeout: 45000,
  });
}

async function mapSite(apiKey, url) {
  return firecrawlRequest(apiKey, 'map', {
    url,
    limit: LIMIT,
    search: 'cardapio menu pedido delivery',
  });
}

async function main() {
  if (!URL_TO_SCRAPE) throw new Error('Missing --url=https://...');
  if (detectPlatform(URL_TO_SCRAPE) === 'ifood') throw new Error('iFood URL is not allowed.');

  const projectRoot = findProjectRoot();
  const env = parseEnvFile(path.join(projectRoot, '.env'));
  const apiKey = env.FIRECRAWL_API_KEY || env.FIRECRAWL_TOKEN;
  if (!apiKey) throw new Error('Missing FIRECRAWL_API_KEY in .env.');

  const rawPath = path.join(OUT_DIR, 'raw-response.json');
  const markdownPath = path.join(OUT_DIR, 'markdown.md');
  const summaryPath = path.join(OUT_DIR, 'summary.json');
  const jsonPath = path.join(OUT_DIR, 'structured-menu.json');

  let payload;
  if (MODE === 'map') {
    payload = await mapSite(apiKey, URL_TO_SCRAPE);
  } else {
    payload = await scrape(apiKey, URL_TO_SCRAPE);
  }

  fs.writeFileSync(rawPath, JSON.stringify(payload, null, 2), 'utf8');

  const data = payload.data || payload;
  const markdown = data.markdown || '';
  const links = Array.isArray(data.links) ? data.links : [];
  const metadata = data.metadata || {};
  if (markdown) fs.writeFileSync(markdownPath, markdown, 'utf8');
  if (data.json) fs.writeFileSync(jsonPath, JSON.stringify(data.json, null, 2), 'utf8');

  const evidence = MODE === 'map'
    ? {
        tier: Array.isArray(payload.links) && payload.links.length ? 'yellow' : 'red',
        linkCount: Array.isArray(payload.links) ? payload.links.length : 0,
        links: Array.isArray(payload.links) ? payload.links.slice(0, LIMIT) : [],
        flags: ['map_only_needs_scrape'],
      }
    : scoreEvidence({ markdown, links, metadata });

  const summary = {
    runId: RUN_ID,
    mode: MODE,
    restaurant: RESTAURANT_NAME,
    url: URL_TO_SCRAPE,
    platform: detectPlatform(URL_TO_SCRAPE),
    success: Boolean(payload.success ?? true),
    evidence,
    files: {
      rawPath,
      markdownPath: fs.existsSync(markdownPath) ? markdownPath : null,
      jsonPath: fs.existsSync(jsonPath) ? jsonPath : null,
      summaryPath,
    },
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(JSON.stringify({
    success: true,
    runId: RUN_ID,
    tier: evidence.tier,
    platform: summary.platform,
    priceCount: evidence.priceCount ?? null,
    menuWords: evidence.menuWords ?? null,
    flags: evidence.flags,
    outDir: OUT_DIR,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    message: error.message,
    outDir: OUT_DIR,
  }, null, 2));
  process.exitCode = 1;
});
