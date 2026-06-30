/**
 * menu_extractor.cjs
 * 
 * Extração de cardápio com ordem de prioridade:
 * 1. Instagram: link da bio → acessa o link → raspa cardápio
 * 2. Instagram: destaques (highlights) → analisa imagens com IA de visão
 * 3. Google Maps: aba "Menu" → raspa texto estruturado
 * 4. Google Maps: fotos da aba "Cardápio" com até 1 ano → analisa com IA de visão
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { auditCategories, extractItemsFromText, mergeCategories: mergeHybridCategories, runLocalOcr } = require('./hybrid_menu_pipeline.cjs');

// ─── Carrega variáveis de ambiente ───────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?$/);
      if (match) {
        let [, key, value = ''] = match;
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
}
loadEnv();

const { OpenAI } = require('openai');
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const MODEL_NAME = process.env.VITE_AI_MODEL || 'gpt-4o-mini';
const VISION_MODEL = 'gpt-4o'; // Modelo com visão para analisar imagens

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ─── Retry automático para rate limits ───────────────────────────────────────
async function callOpenAIWithRetry(params, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await openai.chat.completions.create(params);
    } catch (err) {
      if (err.status === 429) {
        const retryAfterMs = err.headers?.get?.('retry-after-ms') || null;
        const retryAfterSec = err.headers?.get?.('retry-after') || null;
        let waitMs = 2000 * attempt;
        if (retryAfterMs) waitMs = parseInt(retryAfterMs) + 500;
        else if (retryAfterSec) waitMs = (parseInt(retryAfterSec) * 1000) + 500;
        waitMs = Math.min(waitMs, 60000);
        console.log(`[Menu Extractor] ⏳ Rate limit (tentativa ${attempt}/${maxRetries}). Aguardando ${(waitMs/1000).toFixed(1)}s...`);
        await delay(waitMs);
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Rate limit persistente após ${maxRetries} tentativas.`);
}

// ─── Funções auxiliares do Chrome/Puppeteer ──────────────────────────────────
function getChromeLaunchOptions(headless = false) {
  const options = {
    headless,
    defaultViewport: null,
    args: ['--start-maximized', '--disable-setuid-sandbox', '--no-sandbox', '--lang=pt-BR']
  };

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const possiblePaths = [
      path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        options.executablePath = p;
        break;
      }
    }
  } else if (process.platform === 'darwin') {
    const p = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(p)) options.executablePath = p;
  } else if (process.platform === 'linux') {
    for (const p of ['/usr/bin/google-chrome', '/usr/bin/chrome']) {
      if (fs.existsSync(p)) { options.executablePath = p; break; }
    }
  }
  if (!options.executablePath) options.channel = 'chrome';
  return options;
}

async function loadInstagramCookies(page) {
  const cookiesPath = path.join(__dirname, 'instagram_cookies.json');
  if (fs.existsSync(cookiesPath)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      await page.setCookie(...cookies);
      console.log(`🍪 [Menu Extractor] Cookies do Instagram carregados.`);
    } catch (e) {
      console.warn(`⚠️ [Menu Extractor] Falha ao carregar cookies: ${e.message}`);
    }
  }
}

// ─── Converte imagem URL para base64 para enviar à IA de visão ───────────────
async function imageUrlToBase64(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (e) {
    return null;
  }
}

// ─── Analisa imagens com IA de visão para extrair itens de cardápio ──────────
async function analyzeMenuImages(imageUrls, restaurantName, source) {
  if (!imageUrls || imageUrls.length === 0) return [];

  console.log(`[Menu Extractor] 🔍 Analisando ${imageUrls.length} imagem(ns) de ${source} com IA de visão...`);

  // Converte URLs para base64 (máx 8 imagens por chamada para não exceder tokens)
  const batch = imageUrls.slice(0, 8);
  const base64Images = await Promise.all(batch.map(url => imageUrlToBase64(url)));
  const validImages = base64Images.filter(Boolean);

  if (validImages.length === 0) {
    console.log(`[Menu Extractor] ⚠️ Nenhuma imagem válida para análise.`);
    return [];
  }

  // Nível 2: OCR local. Somente o texto segue para o formatter econômico;
  // a imagem é enviada à visão apenas se a auditoria continuar baixa.
  try {
    const ocr = await runLocalOcr(validImages, { logger: () => {} });
    if (ocr.text && ocr.text.trim().length >= 50) {
      const deterministic = extractItemsFromText(ocr.text);
      const deterministicAudit = auditCategories(deterministic, ocr.text);
      if (deterministicAudit.approved) {
        console.log(`[Menu Extractor] ✅ OCR local aprovado (${deterministicAudit.itemCount} itens); visão evitada.`);
        return deterministic;
      }
      const formatted = await parseMenuTextToCategories(ocr.text, restaurantName, `${source}_local_ocr`);
      const merged = mergeHybridCategories([deterministic, formatted]);
      const mergedAudit = auditCategories(merged, ocr.text);
      if (mergedAudit.confidence !== 'low' && mergedAudit.itemCount >= 5) {
        console.log(`[Menu Extractor] ✅ OCR + formatter aprovados (${mergedAudit.score}); visão evitada.`);
        return merged;
      }
    }
  } catch (ocrError) {
    console.warn(`[Menu Extractor] OCR local falhou: ${ocrError.message}. Prosseguindo para visão.`);
  }

  const content = [
    {
      type: 'text',
      text: `Você é um especialista em extração de cardápios de restaurantes. Analise as imagens abaixo do restaurante "${restaurantName}" e extraia TODOS os itens de cardápio visíveis.

Para cada item encontrado, extraia:
- nome: nome do item
- descricao: descrição (se houver)
- preco: preço em formato numérico (ex: 29.90) — use null se não visível
- foto_url: null (não temos URL da foto aqui)
- categoria: categoria do item (ex: "Entradas", "Pratos Principais", "Bebidas", "Sobremesas", etc.)

Retorne um JSON no formato:
{
  "categorias": [
    {
      "nome": "Nome da Categoria",
      "itens": [
        { "nome": "Item", "descricao": "Descrição", "preco": 29.90, "foto_url": null }
      ]
    }
  ],
  "fonte": "${source}",
  "confianca": "alta|media|baixa"
}

Se não houver nenhum item de cardápio visível nas imagens, retorne { "categorias": [], "fonte": "${source}", "confianca": "baixa" }.`
    },
    ...validImages.map(b64 => ({
      type: 'image_url',
      image_url: { url: b64, detail: 'high' }
    }))
  ];

  try {
    const response = await callOpenAIWithRetry({
      model: VISION_MODEL,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    const totalItems = (result.categorias || []).reduce((acc, c) => acc + (c.itens || []).length, 0);
    console.log(`[Menu Extractor] ✅ IA de visão extraiu ${totalItems} item(ns) de ${result.categorias?.length || 0} categoria(s) de ${source}.`);
    return result.categorias || [];
  } catch (e) {
    console.error(`[Menu Extractor] ❌ Erro na análise de imagens: ${e.message}`);
    return [];
  }
}

// ─── Seleção inteligente de link por cidade/bairro/unidade ─────────────────────────
function normalizeText(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Seleciona os links corretos de uma lista baseado na cidade/bairro/endereço do restaurante.
 * Usado quando há múltiplos links na bio (ex: redes com várias unidades) ou em Linktrees.
 */
async function selectLinksByLocation(links, city, neighborhood, address) {
  console.log(`[selectLinksByLocation] Usando IA para analisar links. Cidade alvo: "${city}", Bairro: "${neighborhood}"`);
  console.log(`[selectLinksByLocation] Links disponíveis: ${links.map(l => `"${l.text || ''}" → ${l.href || l.url || ''}`).join(' | ')}`);
  
  if (links.length === 0) return [];
  if (links.length === 1) return links;

  try {
    const prompt = `Você é um analisador de links de delivery.
O restaurante alvo fica na cidade: "${city}", bairro: "${neighborhood}".
Aqui estão os links disponíveis:
${links.map((l, i) => `[${i}] Texto: "${l.text || ''}" URL: "${l.href || l.url || ''}"`).join('\n')}

Sua tarefa é selecionar QUAIS índices de links pertencem a esta cidade/unidade, seguindo estas regras:
1. Se o link (texto ou URL) mencionar o nome de OUTRA cidade famosa (ex: Patos, Sousa, Campina Grande, Recife, etc), REJEITE.
2. Se o link mencionar o nome da NOSSA cidade ("${city}") ou nosso bairro ("${neighborhood}"), ACEITE.
3. Se o link for puramente genérico (ex: "Fazer Pedido", "WhatsApp", "Cardápio") e não mencionar cidade nenhuma, ACEITE.
4. Se houver links específicos de outras cidades e um genérico, e a nossa cidade não estiver listada nos específicos, pode aceitar o genérico (ou WhatsApp).

Retorne um JSON com a propriedade "selected_indices" contendo um array de números (os índices escolhidos). Retorne apenas o JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const resultStr = response.choices[0]?.message?.content || '{}';
    const resultObj = JSON.parse(resultStr);
    const indices = resultObj.selected_indices || [];
    
    const filteredLinks = indices.map(i => links[i]).filter(Boolean);
    console.log(`[selectLinksByLocation] IA selecionou: ${filteredLinks.length > 0 ? filteredLinks.map(l => l.url || l.href).join(', ') : 'nenhum'}`);
    
    // Se a IA for muito restritiva e zerar tudo, usamos fallback genérico ou os originais pra não perder nada
    if (filteredLinks.length === 0) {
      console.log(`[selectLinksByLocation] IA não escolheu nada. Retornando os links originais como fallback.`);
      return links;
    }
    return filteredLinks;
  } catch (err) {
    console.error(`[selectLinksByLocation] Erro na IA, usando fallback total.`, err.message);
    return links;
  }
}

// ─── FONTE 1: Instagram — Link da bio → acessa e raspa cardápio ──────────────
async function extractMenuFromInstagramBioLink(instagramUrl, restaurantName, city, neighborhood) {
  console.log(`\n[Menu Extractor] 📱 FONTE 1: Acessando Instagram para extrair link da bio...`);
  console.log(`[Menu Extractor] 📍 Filtrando por: Cidade="${city || 'N/A'}", Bairro="${neighborhood || 'N/A'}"`);
  
  let handle = (instagramUrl || '').trim();
  if (handle.includes('instagram.com/')) {
    handle = handle.split('instagram.com/')[1].split('?')[0].split('#')[0].replace(/\//g, '').trim();
  }
  handle = handle.replace(/[^a-zA-Z0-9_\.]/g, '');
  if (!handle) return null;

  const puppeteer = require('puppeteer');
  let browser = null;
  let selectedLink = null;

  try {
    // Remove lock anterior
    const userDataDir = path.join(__dirname, 'puppeteer_user_data_single');
    const lockPath = path.join(userDataDir, 'SingletonLock');
    if (fs.existsSync(lockPath)) {
      try { fs.unlinkSync(lockPath); } catch (e) {}
    }

    browser = await puppeteer.launch(getChromeLaunchOptions(false));
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await loadInstagramCookies(page);

    await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);

    // Fecha popup de login se houver
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('agora não') || text.includes('not now') || text.includes('fechar')) {
            btn.click(); return;
          }
        }
      });
      await delay(1000);
    } catch (e) {}

    // Revela links escondidos na bio (ex: "e mais 2")
    try {
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('header span, header [role="button"], header a'));
        for (const el of elements) {
          const text = (el.textContent || '').toLowerCase();
          if (text.includes('e mais') || text.includes('and ') || text.includes('others')) {
            el.click();
          }
        }
      });
      await delay(1500);
    } catch (e) {}

    // Extrai TODOS os links da bio (não apenas o primeiro)
    const profileData = await page.evaluate(() => {
      const bioLinks = [];
      const anchors = Array.from(document.querySelectorAll('a'));
      
      // Primeiro: links via l.instagram.com (redirect)
      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        const linkText = a.textContent.trim();
        if (href.includes('l.instagram.com/?u=') || href.includes('l.instagram.com/')) {
          try {
            const urlObj = new URL(href);
            const u = urlObj.searchParams.get('u');
            if (u) {
              const decoded = decodeURIComponent(u);
              if (!bioLinks.some(l => l.url === decoded)) {
                bioLinks.push({ url: decoded, text: linkText || decoded });
              }
            }
          } catch (e) {}
        }
      }
      
      // Fallback: links diretos (não instagram/facebook)
      if (bioLinks.length === 0) {
        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          const linkText = a.textContent.trim();
          if (href.startsWith('http') && !href.includes('instagram.com') && !href.includes('facebook.com')) {
            if (!bioLinks.some(l => l.url === href)) {
              bioLinks.push({ url: href, text: linkText || href });
            }
          }
        }
      }
      
      const bioText = document.querySelector('header')?.textContent?.trim() || '';
      return { bioLinks, bioText };
    });

    console.log(`[Menu Extractor] 📋 Bio do Instagram: ${profileData.bioText?.substring(0, 200)}`);
    console.log(`[Menu Extractor] 🔗 ${profileData.bioLinks.length} link(s) encontrado(s) na bio:`);
    for (const link of profileData.bioLinks) {
      console.log(`   - [${link.text}]: ${link.url}`);
    }

    await browser.close();
    browser = null;

    if (!profileData.bioLinks || profileData.bioLinks.length === 0) {
      console.log(`[Menu Extractor] ℹ️ Nenhum link externo encontrado na bio do Instagram.`);
      return null;
    }

    // ═══ SELEÇÃO INTELIGENTE DO LINK CORRETO POR CIDADE/BAIRRO/UNIDADE ═══
    if (profileData.bioLinks.length === 1) {
      selectedLink = profileData.bioLinks[0].url;
      console.log(`[Menu Extractor] 🔗 Apenas 1 link na bio, usando diretamente: ${selectedLink}`);
    } else {
      // Múltiplos links: usa selectLinksByLocation para filtrar
      const filtered = await selectLinksByLocation(profileData.bioLinks, city, neighborhood, '');
      if (filtered.length > 0) {
        selectedLink = filtered[0].url || filtered[0].href;
        console.log(`[Menu Extractor] ✅ Link selecionado pelo filtro de localização: ${selectedLink}`);
      } else {
        // Nenhum link corresponde — tenta o primeiro genérico
        selectedLink = profileData.bioLinks[0].url;
        console.log(`[Menu Extractor] ⚠️ Nenhum link específico encontrado, usando o primeiro: ${selectedLink}`);
      }
    }

    if (!selectedLink) return null;

    // Acessa o link selecionado e raspa o cardápio
    console.log(`[Menu Extractor] 🌐 Acessando link selecionado para extrair cardápio: ${selectedLink}`);
    const { agenticFetch } = require('./agentic_scraper.cjs');
    const objective = `Encontrar o cardápio COMPLETO do restaurante "${restaurantName}". 
Se for um Linktree ou agregador de links, clique na opção de cardápio/menu da unidade de ${city || 'a cidade'}.
Se houver ABAS/CATEGORIAS (ex: "Entradas", "Pratos", "Bebidas"), clique em CADA UMA e extraia o conteúdo.
Extraia todos os itens com nome, descrição e preço.`;

    const menuText = await agenticFetch(selectedLink, objective);
    if (!menuText || menuText.trim().length < 100) {
      console.log(`[Menu Extractor] ⚠️ Link da bio não retornou conteúdo suficiente.`);
      return null;
    }

    console.log(`[Menu Extractor] ✅ Conteúdo extraído do link da bio (${menuText.length} chars).`);
    return { source: 'instagram_bio_link', url: selectedLink, text: menuText };

  } catch (e) {
    console.error(`[Menu Extractor] ❌ Erro ao acessar Instagram: ${e.message}`);
    return null;
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

// ─── FONTE 2: Instagram — Destaques (highlights) → analisa imagens ───────────
async function extractMenuFromInstagramHighlights(instagramUrl, restaurantName) {
  console.log(`\n[Menu Extractor] 📱 FONTE 2: Coletando destaques do Instagram...`);

  let handle = (instagramUrl || '').trim();
  if (handle.includes('instagram.com/')) {
    handle = handle.split('instagram.com/')[1].split('?')[0].split('#')[0].replace(/\//g, '').trim();
  }
  handle = handle.replace(/[^a-zA-Z0-9_\.]/g, '');
  if (!handle) return [];

  const puppeteer = require('puppeteer');
  let browser = null;

  try {
    const userDataDir = path.join(__dirname, 'puppeteer_user_data_single');
    const lockPath = path.join(userDataDir, 'SingletonLock');
    if (fs.existsSync(lockPath)) {
      try { fs.unlinkSync(lockPath); } catch (e) {}
    }

    browser = await puppeteer.launch(getChromeLaunchOptions(false));
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    await loadInstagramCookies(page);

    await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3500);

    // Fecha popup
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('agora não') || text.includes('not now')) { btn.click(); return; }
        }
      });
      await delay(1000);
    } catch (e) {}

    // Encontra destaques com nomes relacionados a cardápio/menu
    const menuKeywords = ['cardápio', 'cardapio', 'menu', 'pratos', 'comida', 'food', 'promoç', 'promo', 'especial', 'destaque'];
    
    const highlights = await page.evaluate((keywords) => {
      // Destaques ficam em elementos com role="button" ou links que contêm imagens de stories
      const allHighlights = [];
      
      // Tenta encontrar pelos títulos dos destaques
      const highlightElements = Array.from(document.querySelectorAll('div[class*="highlight"], [data-testid*="highlight"]'));
      for (const el of highlightElements) {
        const text = el.textContent.trim().toLowerCase();
        const title = el.querySelector('span')?.textContent?.trim() || text.substring(0, 30);
        allHighlights.push({ title, element: true });
      }
      
      // Fallback: pega todos os círculos de destaques (geralmente ficam no topo do perfil)
      const circles = Array.from(document.querySelectorAll('ul li'));
      for (const li of circles) {
        const span = li.querySelector('span');
        const title = span?.textContent?.trim() || '';
        if (title) allHighlights.push({ title });
      }
      
      return allHighlights;
    }, menuKeywords);

    console.log(`[Menu Extractor] 📌 Destaques encontrados: ${highlights.map(h => h.title).join(', ') || 'nenhum'}`);

    // Filtra destaques com nomes relacionados a cardápio
    const menuHighlights = highlights.filter(h => {
      const t = (h.title || '').toLowerCase();
      return menuKeywords.some(kw => t.includes(kw));
    });

    if (menuHighlights.length === 0) {
      console.log(`[Menu Extractor] ℹ️ Nenhum destaque com nome de cardápio/menu encontrado. Tentando clicar no primeiro destaque...`);
    }

    // Clica nos destaques de cardápio e coleta screenshots
    const menuImages = [];
    const targetHighlights = menuHighlights.length > 0 ? menuHighlights.slice(0, 3) : highlights.slice(0, 5);

    for (const highlight of targetHighlights) {
      try {
        // Encontra e clica no destaque pelo título
        const clicked = await page.evaluate((title) => {
          const allSpans = Array.from(document.querySelectorAll('span'));
          for (const span of allSpans) {
            if (span.textContent.trim().toLowerCase() === title.toLowerCase()) {
              const clickable = span.closest('button') || span.closest('[role="button"]') || span.closest('a') || span.parentElement;
              if (clickable) { clickable.click(); return true; }
            }
          }
          // Tenta clicar no primeiro círculo de destaque
          const circles = document.querySelectorAll('ul li button, ul li a');
          if (circles.length > 0) { circles[0].click(); return true; }
          return false;
        }, highlight.title);

        if (!clicked) continue;
        await delay(2000);

        // Coleta imagens dos stories do destaque (até 10 slides)
        for (let slide = 0; slide < 10; slide++) {
          try {
            // Captura screenshot do story atual
            const screenshotBuffer = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 80 });
            menuImages.push(`data:image/jpeg;base64,${screenshotBuffer}`);

            // Tenta avançar para o próximo slide
            const hasNext = await page.evaluate(() => {
              const nextBtn = document.querySelector('[aria-label="Próximo"], [aria-label="Next"], button[class*="next"]');
              if (nextBtn) { nextBtn.click(); return true; }
              // Clica no lado direito da tela para avançar
              return false;
            });

            if (!hasNext) {
              // Clica no lado direito para avançar
              await page.mouse.click(900, 450);
              await delay(800);
              
              // Verifica se ainda está no mesmo destaque
              const stillOpen = await page.evaluate(() => {
                return !!document.querySelector('[aria-label="Fechar"], [aria-label="Close"]');
              });
              if (!stillOpen) break;
            } else {
              await delay(800);
            }
          } catch (slideErr) {
            break;
          }
        }

        // Fecha o destaque
        try {
          await page.evaluate(() => {
            const closeBtn = document.querySelector('[aria-label="Fechar"], [aria-label="Close"]');
            if (closeBtn) closeBtn.click();
          });
          await delay(1000);
        } catch (e) {}

      } catch (highlightErr) {
        console.warn(`[Menu Extractor] ⚠️ Erro ao processar destaque "${highlight.title}": ${highlightErr.message}`);
      }
    }

    await browser.close();
    browser = null;

    if (menuImages.length === 0) {
      console.log(`[Menu Extractor] ℹ️ Nenhuma imagem coletada dos destaques.`);
      return [];
    }

    console.log(`[Menu Extractor] 📸 ${menuImages.length} screenshot(s) coletado(s) dos destaques.`);

    // Analisa as imagens com IA de visão
    // As imagens já estão em base64, então usamos diretamente
    const content = [
      {
        type: 'text',
        text: `Você é um especialista em extração de cardápios. Analise os screenshots dos destaques do Instagram do restaurante "${restaurantName}" e extraia TODOS os itens de cardápio visíveis.

Para cada item encontrado, extraia:
- nome, descricao (se houver), preco (numérico, null se não visível), categoria

Retorne JSON:
{
  "categorias": [
    { "nome": "Categoria", "itens": [{ "nome": "Item", "descricao": "Desc", "preco": 29.90, "foto_url": null }] }
  ],
  "fonte": "instagram_highlights",
  "confianca": "alta|media|baixa"
}

Se não houver itens de cardápio visíveis, retorne { "categorias": [], "fonte": "instagram_highlights", "confianca": "baixa" }.`
      },
      ...menuImages.slice(0, 8).map(b64 => ({
        type: 'image_url',
        image_url: { url: b64, detail: 'high' }
      }))
    ];

    try {
      const response = await callOpenAIWithRetry({
        model: VISION_MODEL,
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content);
      const totalItems = (result.categorias || []).reduce((acc, c) => acc + (c.itens || []).length, 0);
      console.log(`[Menu Extractor] ✅ Destaques: ${totalItems} item(ns) extraído(s) de ${result.categorias?.length || 0} categoria(s).`);
      return result.categorias || [];
    } catch (e) {
      console.error(`[Menu Extractor] ❌ Erro na análise dos destaques: ${e.message}`);
      return [];
    }

  } catch (e) {
    console.error(`[Menu Extractor] ❌ Erro ao acessar destaques: ${e.message}`);
    return [];
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

// ─── FONTE 3: Google Maps — Aba "Menu" (texto estruturado) ───────────────────
async function extractMenuFromGoogleMapsTab(googleMapsUrl, restaurantName) {
  console.log(`\n[Menu Extractor] 🗺️ FONTE 3: Acessando aba Menu do Google Maps...`);

  if (!googleMapsUrl) {
    console.log(`[Menu Extractor] ℹ️ URL do Google Maps não fornecida.`);
    return null;
  }

  const puppeteer = require('puppeteer');
  let browser = null;

  try {
    browser = await puppeteer.launch(getChromeLaunchOptions(true)); // headless para Maps
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' });

    await page.goto(googleMapsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);

    // Procura pela aba "Menu" ou "Cardápio" no Google Maps
    const menuTabClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="tab"], a'));
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'menu' || text === 'cardápio' || text === 'cardapio') {
          btn.click();
          return btn.textContent.trim();
        }
      }
      return null;
    });

    if (!menuTabClicked) {
      console.log(`[Menu Extractor] ℹ️ Aba "Menu" não encontrada no Google Maps.`);
      await browser.close();
      return null;
    }

    console.log(`[Menu Extractor] ✅ Aba "${menuTabClicked}" encontrada e clicada.`);
    await delay(2000);

    // Extrai o texto do cardápio da aba
    let menuText = '';
    for (let scroll = 0; scroll < 5; scroll++) {
      const pageText = await page.evaluate(() => {
        // Tenta pegar o conteúdo da aba de menu
        const menuSection = document.querySelector('[data-section-id="menu"], [aria-label*="menu"], [aria-label*="Menu"], [aria-label*="Cardápio"]');
        if (menuSection) return menuSection.textContent.trim();
        
        // Fallback: pega o conteúdo principal
        const main = document.querySelector('div[role="main"]');
        return main ? main.textContent.trim() : document.body.textContent.trim();
      });
      
      menuText = pageText;
      
      // Scroll para carregar mais conteúdo
      await page.evaluate(() => window.scrollBy(0, 500));
      await delay(800);
    }

    await browser.close();
    browser = null;

    if (!menuText || menuText.trim().length < 100) {
      console.log(`[Menu Extractor] ⚠️ Conteúdo da aba Menu insuficiente.`);
      return null;
    }

    console.log(`[Menu Extractor] ✅ Texto da aba Menu extraído (${menuText.length} chars).`);
    return { source: 'google_maps_menu_tab', text: menuText };

  } catch (e) {
    console.error(`[Menu Extractor] ❌ Erro ao acessar aba Menu do Maps: ${e.message}`);
    return null;
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

// ─── FONTE 4: Google Maps — Fotos recentes (até 1 ano) ───────────────────────
async function extractMenuFromGoogleMapsPhotos(googleMapsUrl, restaurantName) {
  console.log(`\n[Menu Extractor] 🗺️ FONTE 4: Coletando fotos de cardápio do Google Maps (até 1 ano)...`);

  if (!googleMapsUrl) {
    console.log(`[Menu Extractor] ℹ️ URL do Google Maps não fornecida.`);
    return [];
  }

  const puppeteer = require('puppeteer');
  let browser = null;

  try {
    browser = await puppeteer.launch(getChromeLaunchOptions(true));
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' });

    await page.goto(googleMapsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);

    // Clica na aba de fotos
    const photosTabClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="tab"]'));
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'fotos' || text === 'photos') {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (!photosTabClicked) {
      console.log(`[Menu Extractor] ℹ️ Aba de fotos não encontrada.`);
      await browser.close();
      return [];
    }

    await delay(2000);

    // Procura pela categoria "Cardápio" ou "Menu" nas fotos
    const menuPhotosClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="tab"], [role="button"]'));
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text.includes('cardápio') || text.includes('cardapio') || text.includes('menu') || text.includes('comida') || text.includes('food')) {
          btn.click();
          return btn.textContent.trim();
        }
      }
      return null;
    });

    if (menuPhotosClicked) {
      console.log(`[Menu Extractor] ✅ Categoria "${menuPhotosClicked}" selecionada nas fotos.`);
      await delay(1500);
    }

    // Coleta URLs das fotos com scroll
    let photoUrls = [];
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);

    for (let scroll = 0; scroll < 4; scroll++) {
      const newUrls = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img[src*="googleusercontent"], img[src*="lh3.google"], img[src*="lh5.google"]'));
        return imgs.map(img => {
          // Pega a URL de alta resolução substituindo parâmetros de tamanho
          let src = img.src || img.getAttribute('src') || '';
          // Aumenta resolução: substitui =w100 por =w800
          src = src.replace(/=w\d+/, '=w800').replace(/=h\d+/, '=h600');
          return src;
        }).filter(src => src && src.startsWith('http'));
      });

      photoUrls = [...new Set([...photoUrls, ...newUrls])];
      await page.evaluate(() => window.scrollBy(0, 600));
      await delay(800);
    }

    await browser.close();
    browser = null;

    // Filtra duplicatas e limita a 12 fotos
    photoUrls = [...new Set(photoUrls)].slice(0, 12);

    if (photoUrls.length === 0) {
      console.log(`[Menu Extractor] ℹ️ Nenhuma foto encontrada no Google Maps.`);
      return [];
    }

    console.log(`[Menu Extractor] 📸 ${photoUrls.length} foto(s) coletada(s) do Google Maps.`);

    // Analisa as imagens com IA de visão
    return await analyzeMenuImages(photoUrls, restaurantName, 'google_maps_photos');

  } catch (e) {
    console.error(`[Menu Extractor] ❌ Erro ao coletar fotos do Maps: ${e.message}`);
    return [];
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

// ─── Converte texto de cardápio em categorias estruturadas via IA ─────────────
async function parseMenuTextToCategories(menuText, restaurantName, source) {
  if (!menuText || menuText.trim().length < 50) return [];

  console.log(`[Menu Extractor] 🤖 Convertendo texto de cardápio em estrutura JSON...`);

  const menuChunkSchema = {
    name: 'extrator_cardapio',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category_name: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    price: { type: ['number', 'null'] },
                    photo_url: { type: ['string', 'null'] }
                  },
                  required: ['name', 'description', 'price', 'photo_url'],
                  additionalProperties: false
                }
              }
            },
            required: ['category_name', 'items'],
            additionalProperties: false
          }
        }
      },
      required: ['categories'],
      additionalProperties: false
    }
  };

  try {
    // Limita o texto para não exceder tokens
    const truncatedText = menuText.substring(0, 12000);

    const response = await callOpenAIWithRetry({
      model: MODEL_NAME,
      messages: [
        {
          role: 'user',
          content: `Extraia TODOS os itens de cardápio do texto abaixo do restaurante "${restaurantName}".
Fonte: ${source}

REGRAS:
- Extraia nome, descrição, preço (número sem R$, ex: 29.90) e foto_url (null se não houver)
- Agrupe por categorias (Entradas, Pratos Principais, Bebidas, Sobremesas, etc.)
- Se o preço não estiver visível, use null
- Ignore textos de navegação, botões, rodapés

TEXTO DO CARDÁPIO:
${truncatedText}`
        }
      ],
      response_format: { type: 'json_schema', json_schema: menuChunkSchema },
      temperature: 0.05,
      max_tokens: 8192
    });

    const result = JSON.parse(response.choices[0].message.content);
    const categories = result.categories || [];
    const totalItems = categories.reduce((acc, c) => acc + (c.items || []).length, 0);
    console.log(`[Menu Extractor] ✅ Texto parseado: ${totalItems} item(ns) em ${categories.length} categoria(s).`);
    
    // Normaliza para o formato interno
    return categories.map(c => ({
      nome: c.category_name,
      itens: (c.items || []).map(item => ({
        nome: item.name,
        descricao: item.description,
        preco: item.price,
        foto_url: item.photo_url
      }))
    }));
  } catch (e) {
    console.error(`[Menu Extractor] ❌ Erro ao parsear texto de cardápio: ${e.message}`);
    return [];
  }
}

// ─── Mescla categorias de múltiplas fontes ────────────────────────────────────
function mergeCategories(categoriesArrays) {
  const merged = {};
  
  for (const categories of categoriesArrays) {
    for (const cat of (categories || [])) {
      const catName = (cat.nome || cat.category_name || 'Outros').trim();
      if (!merged[catName]) {
        merged[catName] = { nome: catName, itens: [] };
      }
      const items = cat.itens || cat.items || [];
      for (const item of items) {
        const itemName = (item.nome || item.name || '').trim();
        if (!itemName) continue;
        // Evita duplicatas pelo nome
        const exists = merged[catName].itens.some(i => 
          (i.nome || '').toLowerCase() === itemName.toLowerCase()
        );
        if (!exists) {
          merged[catName].itens.push({
            nome: itemName,
            descricao: item.descricao || item.description || null,
            preco: item.preco ?? item.price ?? null,
            foto_url: item.foto_url || item.photo_url || null
          });
        }
      }
    }
  }
  
  return Object.values(merged).filter(c => c.itens.length > 0);
}

// ─── Função principal exportada ───────────────────────────────────────────────
/**
 * Extrai o cardápio completo de um restaurante usando múltiplas fontes.
 * 
 * @param {Object} params
 * @param {string} params.restaurantName - Nome do restaurante
 * @param {string} params.instagramUrl - URL do Instagram (ex: https://www.instagram.com/alainesfiharia/)
 * @param {string} params.googleMapsUrl - URL do Google Maps
 * @param {string} params.city - Cidade
 * @returns {Promise<{categories: Array, source: string, success: boolean}>}
 */
async function extractMenu({ restaurantName, instagramUrl, googleMapsUrl, city, neighborhood }) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🍽️  MENU EXTRACTOR: ${restaurantName}`);
  console.log(`${'='.repeat(60)}`);

  let allCategories = [];
  let successSource = null;

  // ── PRIORIDADE 1: Instagram — Link da bio ──────────────────────────────────
  if (instagramUrl) {
    try {
      const bioResult = await extractMenuFromInstagramBioLink(instagramUrl, restaurantName, city, neighborhood);
      if (bioResult && bioResult.text) {
        const cats = await parseMenuTextToCategories(bioResult.text, restaurantName, bioResult.source);
        if (cats.length > 0) {
          console.log(`[Menu Extractor] 🎯 Cardápio extraído via link da bio do Instagram! (${cats.length} categorias)`);
          allCategories = cats;
          successSource = 'instagram_bio_link';
        }
      }
    } catch (e) {
      console.error(`[Menu Extractor] ❌ Erro na FONTE 1: ${e.message}`);
    }
  }

  // ── PRIORIDADE 2: Instagram — Destaques ────────────────────────────────────
  if (allCategories.length === 0 && instagramUrl) {
    try {
      const highlightCats = await extractMenuFromInstagramHighlights(instagramUrl, restaurantName);
      if (highlightCats.length > 0) {
        console.log(`[Menu Extractor] 🎯 Cardápio extraído via destaques do Instagram! (${highlightCats.length} categorias)`);
        allCategories = highlightCats;
        successSource = 'instagram_highlights';
      }
    } catch (e) {
      console.error(`[Menu Extractor] ❌ Erro na FONTE 2: ${e.message}`);
    }
  }

  // ── PRIORIDADE 3: Google Maps — Aba Menu (texto) ───────────────────────────
  if (allCategories.length === 0 && googleMapsUrl) {
    try {
      const mapsMenuResult = await extractMenuFromGoogleMapsTab(googleMapsUrl, restaurantName);
      if (mapsMenuResult && mapsMenuResult.text) {
        const cats = await parseMenuTextToCategories(mapsMenuResult.text, restaurantName, mapsMenuResult.source);
        if (cats.length > 0) {
          console.log(`[Menu Extractor] 🎯 Cardápio extraído via aba Menu do Google Maps! (${cats.length} categorias)`);
          allCategories = cats;
          successSource = 'google_maps_menu_tab';
        }
      }
    } catch (e) {
      console.error(`[Menu Extractor] ❌ Erro na FONTE 3: ${e.message}`);
    }
  }

  // ── PRIORIDADE 4: Google Maps — Fotos recentes ─────────────────────────────
  if (allCategories.length === 0 && googleMapsUrl) {
    try {
      const photosCats = await extractMenuFromGoogleMapsPhotos(googleMapsUrl, restaurantName);
      if (photosCats.length > 0) {
        console.log(`[Menu Extractor] 🎯 Cardápio extraído via fotos do Google Maps! (${photosCats.length} categorias)`);
        allCategories = photosCats;
        successSource = 'google_maps_photos';
      }
    } catch (e) {
      console.error(`[Menu Extractor] ❌ Erro na FONTE 4: ${e.message}`);
    }
  }

  const totalItems = allCategories.reduce((acc, c) => acc + (c.itens || []).length, 0);

  if (allCategories.length === 0) {
    console.log(`\n[Menu Extractor] ⚠️ Nenhum item de cardápio encontrado em nenhuma fonte.`);
    return { categories: [], source: null, success: false };
  }

  console.log(`\n[Menu Extractor] 🎉 Extração concluída!`);
  console.log(`   Fonte: ${successSource}`);
  console.log(`   Categorias: ${allCategories.length}`);
  console.log(`   Total de itens: ${totalItems}`);

  return {
    categories: allCategories,
    source: successSource,
    success: true
  };
}

module.exports = { extractMenu };

// ─── Execução direta via linha de comando ─────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const restaurantId = getArg('--id');
  const restaurantName = getArg('--name') || 'Restaurante';
  const instagramUrl = getArg('--instagram');
  const googleMapsUrl = getArg('--maps');
  const city = getArg('--city') || '';
  const neighborhood = getArg('--neighborhood') || '';

  if (!restaurantId && !instagramUrl && !googleMapsUrl) {
    console.error('Uso: node menu_extractor.cjs --id <id> --name <nome> --instagram <url> --maps <url> --city <cidade>');
    process.exit(1);
  }

  // Se tiver ID do Supabase, carrega os dados de lá
  if (restaurantId) {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Credenciais do Supabase não encontradas no .env');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    (async () => {
      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .select('id, name, instagram, google_maps_url, city')
        .eq('id', restaurantId)
        .single();

      if (error || !restaurant) {
        console.error(`Restaurante ID ${restaurantId} não encontrado: ${error?.message}`);
        process.exit(1);
      }

      console.log(`📍 Restaurante: ${restaurant.name} (${restaurant.city})`);

      const result = await extractMenu({
        restaurantName: restaurant.name,
        instagramUrl: restaurant.instagram,
        googleMapsUrl: restaurant.google_maps_url,
        city: restaurant.city,
        neighborhood: restaurant.neighborhood
      });

      if (result.success && result.categories.length > 0) {
        // Salva no Supabase
        console.log(`\n[Menu Extractor] 💾 Salvando cardápio no Supabase...`);
        
        // Deleta categorias antigas
        await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId);

        let orderIdx = 0;
        for (const cat of result.categories) {
          const { data: catData, error: catError } = await supabase
            .from('menu_categories')
            .insert([{ restaurant_id: restaurantId, name: cat.nome, order_index: orderIdx++ }])
            .select()
            .single();

          if (catError || !catData) {
            console.error(`[Menu Extractor] ❌ Erro ao inserir categoria "${cat.nome}": ${catError?.message}`);
            continue;
          }

          const itemsToInsert = (cat.itens || []).map((item, idx) => {
            let parsedPrice = 0;
            if (item.preco !== null && item.preco !== undefined) {
              const strPrice = String(item.preco).replace(/[^\d.,]/g, '').replace(',', '.');
              const asFloat = parseFloat(strPrice);
              if (!isNaN(asFloat)) parsedPrice = asFloat;
            }

            return {
              category_id: catData.id,
              name: item.nome,
              description: item.descricao || null,
              price: parsedPrice,
              image_url: item.foto_url || null,
              order_index: idx
            };
          });

          if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase.from('menu_items').insert(itemsToInsert);
            if (itemsError) {
              console.error(`[Menu Extractor] ❌ Erro ao inserir itens na categoria ${cat.nome}:`, itemsError);
              console.log(`[Menu Extractor] Detalhes do erro: ${itemsError.message} - Payload: ${JSON.stringify(itemsToInsert)}`);
            }
          }
        }

        // Atualiza o restaurante com a fonte do cardápio
        await supabase.from('restaurants').update({
          menu_source: result.source,
          ai_validated: true
        }).eq('id', restaurantId);

        const totalItems = result.categories.reduce((acc, c) => acc + (c.itens || []).length, 0);
        console.log(`\n✅ Cardápio salvo com sucesso! ${result.categories.length} categorias, ${totalItems} itens.`);
        console.log(`RESULT:{"success":true,"message":"Cardápio extraído com ${totalItems} itens de ${result.categories.length} categorias via ${result.source}."}`);
      } else {
        console.log(`\n⚠️ Nenhum cardápio encontrado.`);
        console.log(`RESULT:{"success":false,"message":"Nenhum item de cardápio encontrado."}`);
      }
    })().catch(err => {
      console.error('Erro fatal:', err.message);
      process.exit(1);
    });
  } else {
    // Execução direta com parâmetros
    extractMenu({ restaurantName, instagramUrl, googleMapsUrl, city, neighborhood })
      .then(result => {
        console.log('\nResultado:', JSON.stringify(result, null, 2));
      })
      .catch(err => {
        console.error('Erro:', err.message);
        process.exit(1);
      });
  }
}
