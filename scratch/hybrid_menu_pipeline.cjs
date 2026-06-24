'use strict';

const fs = require('fs');
const path = require('path');

const PRICE_RE = /(?:R\$\s*)?(\d{1,4}(?:[.,]\d{2}))(?!\d)/gi;
const CATEGORY_HINTS = /^(entradas?|petiscos?|porcoes?|porções?|pratos?|principais?|executivos?|combos?|pizzas?|esfihas?|calzones?|massas?|past[eé]is|pasteis|lanches?|hamburguer(?:es)?|hambúrguer(?:es)?|sandu[ií]ches?|beirutes?|marmitas?|saladas?|acompanhamentos?|adicionais|extras?|bebidas?|sucos?|refrigerantes?|drinks?|cervejas?|vinhos?|sobremesas?|doces?|cafes?|cafés?)$/i;
const NOISE_RE = /^(adicionar|comprar|pedido|minha conta|buscar|inicio|início|voltar|avançar|proximo|próximo|fechar|aceitar|cookies?)$/i;

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeName(value) {
  return normalizeSpace(value)
    .replace(/(?:R\$\s*)?\d{1,4}(?:[.,]\d{2}).*$/i, '')
    .replace(/^[•·\-–—|]+|[•·\-–—|]+$/g, '')
    .trim();
}

function parsePrice(value) {
  const number = Number(String(value).replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(number) && number > 0 && number < 10000 ? number : null;
}

function extractItemsFromText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(normalizeSpace)
    .filter(line => line.length > 1 && line.length < 350);

  const categories = new Map();
  let currentCategory = 'Cardápio';
  let previousLine = '';

  const addItem = (name, description, price) => {
    const cleanName = normalizeName(name);
    if (cleanName.length < 2 || NOISE_RE.test(cleanName)) return;
    const key = currentCategory || 'Cardápio';
    if (!categories.has(key)) categories.set(key, []);
    const items = categories.get(key);
    const duplicate = items.some(item => item.nome.toLocaleLowerCase('pt-BR') === cleanName.toLocaleLowerCase('pt-BR'));
    if (!duplicate) items.push({ nome: cleanName, descricao: normalizeSpace(description) || null, preco: price, foto_url: null });
  };

  for (const line of lines) {
    if (CATEGORY_HINTS.test(line.replace(/[:\-–—]+$/, '').trim())) {
      currentCategory = line.replace(/[:\-–—]+$/, '').trim();
      previousLine = '';
      continue;
    }

    const prices = [...line.matchAll(PRICE_RE)];
    if (prices.length === 0) {
      previousLine = line;
      continue;
    }

    const firstPrice = prices[0];
    const beforePrice = normalizeName(line.slice(0, firstPrice.index));
    const price = parsePrice(firstPrice[0]);
    const name = beforePrice || previousLine;
    const description = beforePrice && previousLine && previousLine !== beforePrice ? previousLine : null;
    addItem(name, description, price);
    previousLine = '';
  }

  return [...categories.entries()]
    .map(([nome, itens]) => ({ nome, itens }))
    .filter(category => category.itens.length > 0);
}

function flattenCategories(categories) {
  return (categories || []).flatMap(category => (category.itens || category.items || []).map(item => ({
    name: normalizeName(item.nome || item.name),
    price: parsePrice(item.preco ?? item.price),
    description: normalizeSpace(item.descricao || item.description)
  }))).filter(item => item.name);
}

function auditCategories(categories, evidenceText = '') {
  const items = flattenCategories(categories);
  const uniqueNames = new Set(items.map(item => item.name.toLocaleLowerCase('pt-BR')));
  const priceCoverage = items.length ? items.filter(item => item.price !== null).length / items.length : 0;
  const duplicateRate = items.length ? 1 - (uniqueNames.size / items.length) : 1;
  const suspiciousNames = items.filter(item => item.name.length < 2 || item.name.length > 120 || NOISE_RE.test(item.name)).length;
  const evidencePriceCount = [...String(evidenceText || '').matchAll(PRICE_RE)].length;
  const captureRatio = evidencePriceCount > 0 ? Math.min(1, uniqueNames.size / evidencePriceCount) : (items.length > 0 ? 0.8 : 0);

  let score = 0;
  score += Math.min(0.35, items.length / 10 * 0.35);
  score += priceCoverage * 0.3;
  score += captureRatio * 0.25;
  score += Math.max(0, 0.1 - duplicateRate * 0.1);
  score -= Math.min(0.2, suspiciousNames * 0.04);
  score = Math.max(0, Math.min(1, score));

  const issues = [];
  if (items.length < 5) issues.push('poucos_itens');
  if (priceCoverage < 0.65) issues.push('precos_incompletos');
  if (captureRatio < 0.8) issues.push('possiveis_itens_ausentes');
  if (duplicateRate > 0.1) issues.push('itens_duplicados');
  if (suspiciousNames > 0) issues.push('nomes_suspeitos');

  return {
    score: Number(score.toFixed(3)),
    confidence: score >= 0.88 ? 'high' : score >= 0.68 ? 'medium' : 'low',
    approved: score >= 0.88 && issues.length === 0,
    itemCount: uniqueNames.size,
    priceCoverage: Number(priceCoverage.toFixed(3)),
    captureRatio: Number(captureRatio.toFixed(3)),
    issues
  };
}

function mergeCategories(categoryGroups) {
  const merged = new Map();
  for (const categories of categoryGroups || []) {
    for (const category of categories || []) {
      const categoryName = normalizeSpace(category.nome || category.category_name || 'Cardápio') || 'Cardápio';
      if (!merged.has(categoryName)) merged.set(categoryName, []);
      const target = merged.get(categoryName);
      for (const item of category.itens || category.items || []) {
        const name = normalizeName(item.nome || item.name);
        if (!name) continue;
        const existing = target.find(candidate => candidate.nome.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'));
        if (existing) {
          if (existing.preco == null) existing.preco = parsePrice(item.preco ?? item.price);
          if (!existing.descricao) existing.descricao = normalizeSpace(item.descricao || item.description) || null;
        } else {
          target.push({
            nome: name,
            descricao: normalizeSpace(item.descricao || item.description) || null,
            preco: parsePrice(item.preco ?? item.price),
            foto_url: item.foto_url || item.photo_url || null
          });
        }
      }
    }
  }
  return [...merged.entries()].map(([nome, itens]) => ({ nome, itens })).filter(category => category.itens.length);
}

async function runLocalOcr(images, options = {}) {
  const validImages = (images || []).filter(Boolean).slice(0, options.maxImages || 8);
  if (!validImages.length) return { text: '', pages: [], available: true };

  let createWorker;
  try {
    ({ createWorker } = require('tesseract.js'));
  } catch (error) {
    return { text: '', pages: [], available: false, error: error.message };
  }

  const cachePath = path.join(__dirname, '.tesseract-cache');
  fs.mkdirSync(cachePath, { recursive: true });
  const workerOptions = { cachePath, logger: options.logger || (() => {}) };
  if (process.env.TESSERACT_LANG_PATH) workerOptions.langPath = process.env.TESSERACT_LANG_PATH;

  const pages = [];
  let worker;
  try {
    worker = await createWorker(process.env.TESSERACT_LANGS || 'por+eng', 1, workerOptions);
    for (let index = 0; index < validImages.length; index++) {
      const result = await worker.recognize(validImages[index]);
      pages.push({ index, text: result.data.text || '', confidence: result.data.confidence || 0 });
    }
  } finally {
    if (worker) await worker.terminate();
  }

  return { text: pages.map(page => page.text).join('\n'), pages, available: true };
}

module.exports = {
  auditCategories,
  extractItemsFromText,
  flattenCategories,
  mergeCategories,
  runLocalOcr
};
