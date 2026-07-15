import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export class GoomerExtractionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'GoomerExtractionError';
    this.code = code;
    this.retryable = details.retryable !== false;
    this.technical = details.technical !== false;
    this.details = details;
  }
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function numericPrice(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseNextData(html) {
  const match = String(html || '').match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new GoomerExtractionError('goomer_next_data_missing', 'Goomer source page is missing __NEXT_DATA__.');
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new GoomerExtractionError('goomer_next_data_invalid', `Invalid Goomer __NEXT_DATA__: ${error.message}`);
  }
}

function validatedMenuUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || ''));
  } catch {
    return null;
  }
  if (!/(^|\.)goomer\.app$/i.test(parsed.hostname)) return null;
  if (!/^\/webmenu\/[^/]+\/menu\/[^/]+\/?$/i.test(parsed.pathname)) return null;
  return parsed.toString();
}

export function extractGoomerSourceIdentity(nextData) {
  const settings = nextData?.props?.pageProps?.settings || {};
  const address = settings.address || {};
  return {
    name: clean(settings.name) || null,
    store_id: settings.id ?? null,
    store_code: settings.store_code ?? null,
    slug: clean(settings.slug) || null,
    phones: [settings.mm_whatsapp_phone_number].map((value) => clean(value)).filter(Boolean),
    street: clean(address.street) || null,
    number: clean(address.number) || null,
    neighborhood: clean(address.neighborhood) || null,
    city: clean(address.city) || null,
    state: clean(address.state) || null,
    postal_code: clean(address.zipcode) || null,
    menu_url: validatedMenuUrl(settings.menu_url),
    menu_version: clean(settings.mm_menu_version) || null
  };
}

export function normalizeGoomerMenu(payload) {
  const products = Array.isArray(payload?.products) ? payload.products : [];
  const categories = new Map();

  for (const product of products) {
    const categoryName = clean(product?.group_name) || 'Outros';
    const productName = clean(product?.name);
    if (!productName) continue;
    if (!categories.has(categoryName)) categories.set(categoryName, { name: categoryName, items: [] });
    const category = categories.get(categoryName);
    const prices = Array.isArray(product?.prices) ? product.prices : [];
    const usablePrices = prices
      .map((entry) => ({ name: clean(entry?.name), price: numericPrice(entry?.price) }))
      .filter((entry) => entry.price !== null);

    if (!usablePrices.length) {
      category.items.push({
        name: productName,
        description: clean(product?.description),
        price: null,
        price_min: numericPrice(product?.min_price),
        image_url: product?.images?.large || product?.images?.medium || product?.images?.small || null,
        source_product_id: product?.id ?? null,
        source_price_variant: null,
        source_variant_mode: 'unpriced_product'
      });
      continue;
    }

    for (const entry of usablePrices) {
      // Goomer prices are absolute sell prices. Keeping variants as individual items
      // avoids fabricating an add-on or an unsafe price_delta before semantic QA.
      category.items.push({
        name: entry.name ? `${productName} - ${entry.name}` : productName,
        description: clean(product?.description),
        price: entry.price,
        price_min: entry.price,
        image_url: product?.images?.large || product?.images?.medium || product?.images?.small || null,
        source_product_id: product?.id ?? null,
        source_price_variant: entry.name || null,
        source_variant_mode: entry.name ? 'expanded_absolute_price_variant' : 'direct_price'
      });
    }
  }

  return [...categories.values()].filter((category) => category.items.length);
}

export function summarizeGoomerMenu(categories = []) {
  const items = categories.flatMap((category) => category.items || []);
  return {
    categories: categories.length,
    items: items.length,
    priced_items: items.filter((item) => numericPrice(item.price) !== null).length,
    unresolved_prices: items.filter((item) => numericPrice(item.price) === null).length,
    expanded_absolute_price_variants: items.filter((item) => item.source_variant_mode === 'expanded_absolute_price_variant').length
  };
}

function cachePaths(cwd, sourceUrl) {
  const hash = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16);
  const directory = path.join(cwd, 'scratch', 'menu-source-cache', 'goomer');
  fs.mkdirSync(directory, { recursive: true });
  return {
    raw: path.join(directory, `${hash}-raw.json`),
    evidence: path.join(directory, `${hash}-evidence.json`)
  };
}

function writeCache({ cwd, sourceUrl, menuUrl, sourceIdentity, payload, categories }) {
  const files = cachePaths(cwd, sourceUrl);
  const summary = summarizeGoomerMenu(categories);
  fs.writeFileSync(files.raw, `${JSON.stringify({
    fetched_at: new Date().toISOString(),
    source_url: sourceUrl,
    menu_url: menuUrl,
    platform: 'goomer_public_webmenu',
    payload
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(files.evidence, `${JSON.stringify({
    success: true,
    sourceUrl,
    finalUrl: menuUrl,
    platform: 'goomer_public_webmenu',
    confidence: 0.99,
    categories,
    structuredProbe: {
      source: 'goomer_public_webmenu_json',
      endpoint: menuUrl,
      rawSummary: summary,
      sourceIdentity
    },
    restaurant: sourceIdentity
  }, null, 2)}\n`, 'utf8');
  return { ...files, summary };
}

export async function extractGoomerSource({ sourceUrl, cwd = process.cwd(), allowNetwork = true, timeoutMs = 45000 } = {}) {
  if (!sourceUrl || !/(^|\.)goomer\.app\b/i.test(new URL(sourceUrl).hostname)) {
    throw new GoomerExtractionError('goomer_invalid_source_url', 'Job does not contain a Goomer store URL.', { retryable: false });
  }
  if (!allowNetwork) {
    return { ok: false, status: 'error', reason: 'goomer_external_read_disabled', retryable: true, technical_blocker: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const sourceResponse = await fetch(sourceUrl, { redirect: 'follow', signal: controller.signal });
    if (!sourceResponse.ok) {
      throw new GoomerExtractionError('goomer_source_http_error', `Goomer source HTTP ${sourceResponse.status}.`);
    }
    const nextData = parseNextData(await sourceResponse.text());
    const sourceIdentity = extractGoomerSourceIdentity(nextData);
    const menuUrl = sourceIdentity.menu_url;
    if (!menuUrl) {
      throw new GoomerExtractionError('goomer_menu_url_missing_or_invalid', 'Goomer source has no validated public webmenu URL.', { retryable: false });
    }
    const menuResponse = await fetch(menuUrl, { redirect: 'follow', signal: controller.signal });
    if (!menuResponse.ok) {
      throw new GoomerExtractionError('goomer_menu_http_error', `Goomer menu HTTP ${menuResponse.status}.`);
    }
    const payload = await menuResponse.json();
    const categories = normalizeGoomerMenu(payload);
    const summary = summarizeGoomerMenu(categories);
    if (!summary.items) {
      throw new GoomerExtractionError('goomer_empty_structured_menu', 'Goomer returned no priced or structured menu items.', { retryable: false, technical: false });
    }
    const files = writeCache({ cwd, sourceUrl, menuUrl, sourceIdentity, payload, categories });
    return {
      ok: true,
      provider: 'goomer_public_webmenu',
      cache_used: false,
      evidence_path: files.evidence,
      raw_path: files.raw,
      source_identity: sourceIdentity,
      categories,
      summary: files.summary
    };
  } catch (error) {
    if (error instanceof GoomerExtractionError) throw error;
    throw new GoomerExtractionError('goomer_request_failed', error.message || 'Goomer request failed.');
  } finally {
    clearTimeout(timer);
  }
}
