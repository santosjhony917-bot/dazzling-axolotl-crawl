/**
 * Menu Scraper Robot (Extração de Cardápios dos Sites)
 * 
 * Após a coleta dos restaurantes, este robô visita o link do cardápio
 * de cada estabelecimento (menuSourceUrl) e tenta extrair:
 * - Categorias do cardápio (ex: Pizzas, Bebidas, Sobremesas)
 * - Itens do cardápio (nome, descrição, preço, imagem)
 * 
 * Para executar:
 * node scratch/menu_scraper.cjs
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function uuidFrom(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hex = Math.abs(hash).toString(16).padStart(8, '0') +
              Math.abs(hash * 31).toString(16).padStart(8, '0') +
              Math.abs(hash * 17).toString(16).padStart(8, '0') +
              Math.abs(hash * 13).toString(16).padStart(8, '0');

  const parts = [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(12, 15),
    ((parseInt(hex.substring(15, 17), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hex.substring(17, 19),
    hex.substring(19, 31)
  ];
  return parts.join('-');
}

const JSON_PATH = path.join(__dirname, '..', 'scraped_restaurants_google.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'scraped_menus.json');
const STATE_FILE = path.join(__dirname, 'menu_scraper_state.json');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
}

// Inicializa variáveis do .env
loadEnv();

let interceptedMenuData = null;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkAndHandleCaptcha(page) {
  if (page.url().includes('google.com/sorry/')) {
    console.log('\n⚠️  [CAPTCHA DETECTADO] O Google pausou o scraper de cardápios.');
    console.log('👉 Por favor, resolva o CAPTCHA no navegador do Chrome para continuar...');
    
    while (page.url().includes('google.com/sorry/')) {
      await delay(1000);
    }
    
    console.log('✅ Verificação resolvida! Continuando extração...\n');
    await delay(1500);
  }
}

async function navigateWithRetry(page, url, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await checkAndHandleCaptcha(page);
      await delay(2000);
      return true;
    } catch (err) {
      console.log(`   ⚠️ Tentativa ${attempt}/${maxRetries} falhou: ${err.message}`);
      if (attempt >= maxRetries) return false;
    }
  }
  return false;
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/\./g, '').replace(',', '.');
  const match = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (match) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? null : val;
  }
  return null;
}

async function extractFromRestaurantGuru(page) {
  return await page.evaluate(() => {
    const categories = [];
    const menuBlocks = document.querySelectorAll('.menu-block, .menu-category, .tabs__content, [class*="menu"]');
    
    menuBlocks.forEach(block => {
      const titleEl = block.querySelector('.menu-category__title, h3, h4, [class*="title"], [class*="heading"]');
      const catName = titleEl ? titleEl.textContent.trim() : 'Cardápio';
      
      const items = [];
      let itemEls = Array.from(block.querySelectorAll('.menu-item, [class*="menu-item"], .dish-card, [class*="dish"]'));
      
      // Filtra para remover sub-elementos de um item que já é container
      itemEls = itemEls.filter(el => {
        if (el.textContent.trim().length < 5) return false;
        let parent = el.parentElement;
        while (parent && parent !== block) {
          if (itemEls.includes(parent)) return false;
          parent = parent.parentElement;
        }
        return true;
      });
      
      itemEls.forEach(item => {
        const nameEl = item.querySelector('[class*="name"], [class*="title"] h4, h4, strong');
        const priceEl = item.querySelector('[class*="price"], .menu-item__price, [class*="value"]');
        const descEl = item.querySelector('[class*="desc"], [class*="description"], p');
        const imgEl = item.querySelector('img');
        
        const name = nameEl ? nameEl.textContent.trim() : '';
        const price = priceEl ? priceEl.textContent.trim() : '';
        const description = descEl ? descEl.textContent.trim() : '';
        const image_url = imgEl ? (imgEl.src || '') : '';
        
        if (name && price) {
          items.push({ name, price, description, image_url });
        }
      });
      
      if (items.length > 0) {
        categories.push({ name: catName, items });
      }
    });
    
    return categories;
  });
}

async function extractFromOlaClick(page) {
  return await page.evaluate(() => {
    const categories = [];
    const catEls = document.querySelectorAll('[class*="category"], [class*="categoria"], .menu-section, section');
    
    catEls.forEach(cat => {
      const titleEl = cat.querySelector('h2, h3, h4, [class*="title"], [class*="name"]');
      const catName = titleEl ? titleEl.textContent.trim() : 'Cardápio';
      
      const items = [];
      let itemEls = Array.from(cat.querySelectorAll('[class*="product"], [class*="item"], [class*="card"]'));
      
      // Filtra para remover sub-elementos de um item que já é container
      itemEls = itemEls.filter(el => {
        if (el.textContent.trim().length < 5) return false;
        let parent = el.parentElement;
        while (parent && parent !== cat) {
          if (itemEls.includes(parent)) return false;
          parent = parent.parentElement;
        }
        return true;
      });
      
      itemEls.forEach(item => {
        const nameEl = item.querySelector('[class*="name"], [class*="title"], h4, h5, strong');
        const priceEl = item.querySelector('[class*="price"], [class*="value"], [class*="preco"]');
        const descEl = item.querySelector('[class*="desc"], [class*="description"], p');
        const imgEl = item.querySelector('img');
        
        const name = nameEl ? nameEl.textContent.trim() : '';
        const price = priceEl ? priceEl.textContent.trim() : '';
        const description = descEl ? descEl.textContent.trim() : '';
        const image_url = imgEl ? (imgEl.src || '') : '';
        
        if (name) {
          items.push({ name, price, description, image_url });
        }
      });
      
      if (items.length > 0) {
        categories.push({ name: catName, items });
      }
    });
    
    return categories;
  });
}

async function extractGenericMenu(page) {
  return await page.evaluate(() => {
    const categories = [];
    const seenNames = new Set();

    // 1. Procura por tabelas de cardápio
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return;
      
      const items = [];
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length < 2) return;
        
        const textContent = Array.from(cells).map(c => c.textContent.trim()).filter(Boolean);
        const name = textContent[0] || '';
        const priceText = textContent[textContent.length - 1] || '';
        
        if (name && priceText.match(/[\d,.]*[$R$€]/i)) {
          const key = name.toLowerCase();
          if (!seenNames.has(key)) {
            seenNames.add(key);
            items.push({ name, price: priceText, description: '', image_url: '' });
          }
        }
      });
      
      if (items.length > 0) {
        categories.push({ name: 'Cardápio', items });
      }
    });

    // 2. Procura por listas de itens com preço
    if (categories.length === 0) {
      const allEls = document.querySelectorAll('[class*="menu"] li, [class*="cardapio"] li, .list-group-item, [class*="item"]');
      const items = [];
      
      allEls.forEach(el => {
        const text = el.textContent.trim();
        if (!text || text.length > 200) return;
        
        const priceMatch = text.match(/(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)/);
        if (priceMatch) {
          const name = text.replace(priceMatch[0], '').replace(/[–\-—|]/g, '').trim();
          if (name && name.length > 2 && name.length < 100) {
            const key = name.toLowerCase();
            if (!seenNames.has(key)) {
              seenNames.add(key);
              items.push({ name, price: priceMatch[0], description: '', image_url: '' });
            }
          }
        }
      });
      
      if (items.length > 0) {
        categories.push({ name: 'Cardápio', items });
      }
    }

    // 3. Varredura geral por divs/containers que parecem itens de menu
    if (categories.length === 0) {
      let potentialItems = Array.from(document.querySelectorAll(
        '[class*="product"], [class*="dish"], [class*="menu-item"], ' +
        '[class*="food"], [class*="plate"], [class*="prato"], ' +
        'article, .card, .item-card'
      ));
      
      // Filtra filhos
      potentialItems = potentialItems.filter(el => {
        if (el.textContent.trim().length < 5) return false;
        let parent = el.parentElement;
        while (parent) {
          if (potentialItems.includes(parent)) return false;
          parent = parent.parentElement;
        }
        return true;
      });
      
      const items = [];
      potentialItems.forEach(el => {
        const nameEl = el.querySelector('h2, h3, h4, h5, [class*="name"], [class*="title"], strong');
        const priceEl = el.querySelector('[class*="price"], [class*="preco"], [class*="value"]');
        const descEl = el.querySelector('p, [class*="desc"], [class*="description"]');
        const imgEl = el.querySelector('img');
        
        const name = nameEl ? nameEl.textContent.trim() : '';
        const price = priceEl ? priceEl.textContent.trim() : '';
        const description = descEl ? descEl.textContent.trim() : '';
        const image_url = imgEl ? (imgEl.src || '') : '';
        
        if (name && name.length > 2 && name.length < 100) {
          const key = name.toLowerCase();
          if (!seenNames.has(key)) {
            seenNames.add(key);
            items.push({ name, price, description, image_url });
          }
        }
      });
      
      if (items.length > 0) {
        categories.push({ name: 'Cardápio', items });
      }
    }

    return categories;
  });
}

async function extractFromGoogleSearchMenu(page) {
  return await page.evaluate(async () => {
    let menuContainer = null;
    const allDivs = Array.from(document.querySelectorAll('div'));
    
    // Procura o container que tem o título "Menu"
    for (const div of allDivs) {
      if (div.textContent.trim() === 'Menu' && div.nextElementSibling) {
        menuContainer = div.closest('[role="dialog"]') || div.parentElement;
        break;
      }
    }
    
    if (!menuContainer) {
      menuContainer = document.querySelector('[role="dialog"]') || document.querySelector('#rhs') || document.body;
    }
    
    // Procura por abas de categorias
    let tabs = Array.from(menuContainer.querySelectorAll('[role="tab"], button[aria-selected], .g27rU, [class*="tab"]'));
    if (tabs.length === 0) {
      tabs = Array.from(menuContainer.querySelectorAll('button')).filter(b => b.textContent.trim().length > 2 && b.textContent.trim().length < 30);
    }
    
    tabs = tabs.filter(t => {
      const text = t.textContent.trim().toLowerCase();
      return text && text !== 'mais' && text !== 'more' && text !== 'info' && text !== 'sobre';
    });
    
    const categories = [];
    
    const scrapeVisibleItems = () => {
      const items = [];
      const divs = Array.from(menuContainer.querySelectorAll('div, li, [class*="item"]'));
      const seen = new Set();
      
      for (const el of divs) {
        if (el.children.length === 0 || el.textContent.length > 300) continue;
        
        const text = el.textContent.trim();
        const priceMatch = text.match(/R\$\s*(\d+(?:[.,]\d{2})?)/);
        
        if (priceMatch) {
          const subPrices = Array.from(el.querySelectorAll('*')).filter(child => {
            return child !== el && child.textContent.match(/R\$\s*\d+/);
          });
          if (subPrices.length > 0) continue;
          
          const price = priceMatch[0];
          
          const titleEl = el.querySelector('h3, h4, h5, strong, [class*="title"], [class*="name"]');
          let name = titleEl ? titleEl.textContent.trim() : '';
          
          if (!name) {
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            name = lines.find(l => !l.includes('R$') && l.length > 2 && l.length < 60) || '';
          }
          
          name = name.replace(/R\$\s*\d+([\.,]\d{2})?/, '').trim();
          if (!name || name.length < 2 || name.length > 80) continue;
          
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          
          let description = '';
          const descEl = el.querySelector('[class*="description"], [class*="desc"], p, span:not([class*="price"])');
          if (descEl && descEl.textContent.trim() !== name && !descEl.textContent.includes(price)) {
            description = descEl.textContent.trim();
          } else {
            description = text.replace(name, '').replace(price, '').replace(/[\r\n\-–•]/g, ' ').replace(/\s+/g, ' ').trim();
          }
          
          const imgEl = el.querySelector('img');
          const image_url = imgEl ? (imgEl.src || '') : '';
          
          items.push({ name, price, description, image_url });
        }
      }
      return items;
    };
    
    if (tabs.length > 1) {
      for (const tab of tabs) {
        const catName = tab.textContent.trim();
        try {
          tab.click();
          await new Promise(resolve => setTimeout(resolve, 800));
          const items = scrapeVisibleItems();
          if (items.length > 0) {
            categories.push({ name: catName, items });
          }
        } catch (e) {
          const items = scrapeVisibleItems();
          if (items.length > 0 && !categories.some(c => c.name === 'Cardápio')) {
            categories.push({ name: 'Cardápio', items });
          }
        }
      }
    } else {
      const items = scrapeVisibleItems();
      if (items.length > 0) {
        categories.push({ name: 'Cardápio', items });
      }
    }
    
    return categories;
  });
}

async function getCleanedHtmlForAI(page) {
  return await page.evaluate(() => {
    // Helper to resolve absolute URLs
    function getAbsoluteUrl(url) {
      if (!url) return '';
      try {
        return new URL(url, window.location.href).href;
      } catch (e) {
        return url;
      }
    }
    
    // Step 1: Pre-process images: resolve lazy loaded ones
    const imgs = document.querySelectorAll('img');
    imgs.forEach(img => {
      const lazyAttrs = ['data-src', 'data-lazy-src', 'data-lazy', 'lazy-src', 'data-original', 'data-srcset'];
      for (const attrName of lazyAttrs) {
        const val = img.getAttribute(attrName);
        if (val && val.trim()) {
          img.setAttribute('src', getAbsoluteUrl(val.trim()));
          break;
        }
      }
      const currentSrc = img.getAttribute('src');
      if (currentSrc) {
        img.setAttribute('src', getAbsoluteUrl(currentSrc));
      }
    });

    const priceRegex = /(?:R\$\s*)?\d+[\.,]\d{2}/i;
    const allElements = Array.from(document.querySelectorAll('*'));
    
    // Step 2: Find potential item containers
    const candidates = [];
    allElements.forEach(el => {
      const tagName = el.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'header', 'footer', 'nav'].includes(tagName)) return;
      
      const text = el.textContent || '';
      if (!priceRegex.test(text)) return;
      
      let isItemPattern = false;
      const className = el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '';
      
      if (tagName === 'li' || tagName === 'article') {
        isItemPattern = true;
      } else if (
        className.includes('product') ||
        className.includes('item') ||
        className.includes('card') ||
        className.includes('dish') ||
        className.includes('prato') ||
        className.includes('menu-') ||
        className.includes('opcao') ||
        className.includes('prato-') ||
        className.includes('col-') ||
        className.includes('row')
      ) {
        isItemPattern = true;
      }
      
      if (isItemPattern) {
        candidates.push(el);
      }
    });
    
    // Find missing direct prices
    const allPriceEls = [];
    allElements.forEach(el => {
      const tagName = el.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'header', 'footer', 'nav'].includes(tagName)) return;
      
      let hasDirectPrice = false;
      for (let node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && priceRegex.test(node.textContent)) {
          hasDirectPrice = true;
          break;
        }
      }
      if (hasDirectPrice) {
        allPriceEls.push(el);
      }
    });
    
    allPriceEls.forEach(priceEl => {
      const insideCandidate = candidates.some(c => c.contains(priceEl));
      if (!insideCandidate) {
        let current = priceEl;
        for (let i = 0; i < 3; i++) {
          if (!current.parentElement || ['BODY', 'HTML'].includes(current.parentElement.tagName)) {
            break;
          }
          current = current.parentElement;
        }
        if (!candidates.includes(current)) {
          candidates.push(current);
        }
      }
    });
    
    // Filter to leaf-most outer containers
    let finalContainers = [];
    candidates.forEach(c => {
      const leafDescendants = candidates.filter(other => other !== c && c.contains(other) && !candidates.some(third => third !== other && other.contains(third)));
      if (leafDescendants.length > 1) {
        // c contains multiple items, ignore c
      } else {
        finalContainers.push(c);
      }
    });
    
    finalContainers = finalContainers.filter(c => {
      const isDescendantOfAnother = finalContainers.some(other => other !== c && other.contains(c));
      return !isDescendantOfAnother;
    });
    
    // Step 3: Find category headers
    const categoryElements = [];
    allElements.forEach(el => {
      const tagName = el.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'header', 'footer', 'nav'].includes(tagName)) return;
      
      const text = (el.textContent || '').trim();
      if (text.length < 2 || text.length > 80) return;
      if (priceRegex.test(text)) return;
      
      // Don't treat a category header if it's inside an item container
      const insideItem = finalContainers.some(c => c.contains(el));
      if (insideItem) return;
      
      let isCategory = false;
      const className = el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '';
      
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        isCategory = true;
      } else if (
        className.includes('category-title') ||
        className.includes('category-name') ||
        className.includes('titulo-categoria') ||
        className.includes('categoria-titulo') ||
        className.includes('menu-category-title') ||
        className.includes('menu-section-title') ||
        className.includes('category-header')
      ) {
        isCategory = true;
      }
      
      if (isCategory) {
        categoryElements.push(el);
      }
    });
    
    // Step 4: Sort in document order
    const allNodes = [...finalContainers, ...categoryElements];
    allNodes.sort((a, b) => {
      if (a === b) return 0;
      const position = a.compareDocumentPosition(b);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      return 0;
    });
    
    // Step 5: Format as XML
    let xml = '<menu>\n';
    allNodes.forEach(node => {
      if (categoryElements.includes(node)) {
        const catName = node.textContent.replace(/\s+/g, ' ').trim();
        xml += `  <category name="${catName}" />\n`;
      } else {
        // Find image
        let imgUrl = '';
        const imgEl = node.querySelector('img');
        if (imgEl) {
          imgUrl = imgEl.getAttribute('src') || '';
        }
        
        const itemText = node.textContent.replace(/\s+/g, ' ').trim();
        xml += `  <item>\n`;
        xml += `    <text>${itemText}</text>\n`;
        if (imgUrl) {
          xml += `    <image>${imgUrl}</image>\n`;
        }
        xml += `  </item>\n`;
      }
    });
    xml += '</menu>';
    
    return xml;
  });
}

async function loadAndCombineDynamicCategories(page) {
  console.log('   🔍 Detectando abas ou categorias dinâmicas (ex: grades de categorias)...');
  
  const categories = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    const seen = new Set();
    const list = [];
    
    anchors.forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent.trim() || a.getAttribute('title') || '';
      
      const hasHashNumber = /#\d+/.test(href);
      const isCategoryCard = a.closest('.portfolio-item') || a.closest('[class*="item"]') || a.closest('.scrollmenu');
      
      if (text && text.length > 2 && text.length < 50 && (hasHashNumber || (isCategoryCard && href.includes('#')))) {
        const cleanHref = href.split('?')[0] + (href.includes('#') ? '#' + href.split('#')[1] : '');
        if (!seen.has(cleanHref) && !href.includes('back-to-top')) {
          seen.add(cleanHref);
          
          let selector = '';
          if (a.id) {
            selector = `#${a.id}`;
          } else {
            selector = `a[href="${href}"]`;
          }
          
          list.push({
            text: text.replace(/[\r\n]+/g, ' ').trim(),
            href: href,
            selector: selector
          });
        }
      }
    });
    
    return list;
  });

  if (categories.length > 1) {
    console.log(`   📂 Encontradas ${categories.length} categorias/abas dinâmicas. Coletando itens de cada uma...`);
    let combinedHtml = '';
    
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      console.log(`      👉 Clicando na categoria [${i + 1}/${categories.length}]: "${cat.text}"...`);
      
      try {
        let clicked = false;
        try {
          await page.click(cat.selector);
          clicked = true;
        } catch (e) {
          // Fallback click via page.evaluate
          clicked = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el && typeof el.click === 'function') {
              el.click();
              return true;
            }
            return false;
          }, cat.selector);
        }
        
        if (clicked) {
          // Aguarda renderização dos pratos da categoria
          await new Promise(r => setTimeout(r, 1200));
          
          // Captura o HTML limpo e associa à categoria
          const cleaned = await getCleanedHtmlForAI(page);
          combinedHtml += `<div class="category-group" data-category-name="${cat.text}">\n${cleaned}\n</div>\n`;
        }
      } catch (err) {
        console.log(`      ⚠️ Erro ao acessar categoria "${cat.text}": ${err.message}`);
      }
    }
    
    if (combinedHtml) {
      console.log(`   ✨ Sucesso ao combinar HTML das categorias!`);
      return combinedHtml;
    }
  }
  
  return null;
}

async function extractFromRawJsonWithAI(rawJson, restaurantName) {
  const geminiKey = process.env.VITE_GEMINI_API_KEY;
  const openAiKey = process.env.VITE_OPENAI_API_KEY;
  
  const isGemini = geminiKey && geminiKey.startsWith('AIzaSy');
  const isOpenAI = (geminiKey && geminiKey.startsWith('sk-proj-')) || (openAiKey && openAiKey.startsWith('sk-proj-'));
  const activeKey = isGemini ? geminiKey : (openAiKey || geminiKey);
  
  if (!activeKey) return null;

  const systemPrompt = `Você é um extrator de cardápios especializado. 
Sua tarefa é analisar o JSON bruto interceptado da API interna do site do restaurante "${restaurantName}" e estruturar todos os itens, categorias, preços e imagens.

Diretrizes CRÍTICAS de Precisão:
1. Extraia APENAS itens de comida ou bebida comercializados pelo restaurante.
2. NUNCA extraia informações de contato, endereços, telefones, depoimentos/reviews de clientes, estrelas de avaliação, ou nomes de pessoas como se fossem pratos ou preços do cardápio.
3. Se um item no JSON não for um prato ou bebida vendida pelo restaurante, ignore-o completamente.
4. DIVISÃO DE PREÇOS MÚLTIPLOS: Se encontrar variações de preço/tamanho descritas no mesmo item (ex: "Individual R$ 36,90 / Dupla R$ 60,90"), crie pratos independentes na lista de retorno (ex: "Nome do Prato (Individual)" com preço "R$ 36,90" e "Nome do Prato (Dupla)" com preço "R$ 60,90").

Regras de Extração de Dados:
1. Agrupe os itens pelas categorias reais exibidas no JSON.
2. Para cada item, extraia:
   - "name": Nome exato do prato (incluindo o sufixo de tamanho como "(Individual)" ou "(Dupla)" se for dividido).
   - "price": Preço formatado (ex: "R$ 29,90" ou "R$ 15,00").
   - "description": Ingredientes ou descrição (se houver).
   - "image_url": A URL absoluta da imagem/foto do prato (se houver).
3. Retorne a resposta estritamente no seguinte formato JSON:
{
  "categories": [
    {
      "name": "Nome da Categoria",
      "items": [
        {
          "name": "Nome do Prato",
          "price": "R$ XX,XX",
          "description": "Descrição do prato...",
          "image_url": "URL da imagem..."
        }
      ]
    }
  ]
}`;

  let truncatedJson = JSON.stringify(rawJson);
  if (truncatedJson.length > 150000) {
    truncatedJson = truncatedJson.substring(0, 150000);
  }

  try {
    if (isGemini) {
      console.log(`   🤖 Chamando API do Gemini 1.5 Flash para formatar JSON de rede de "${restaurantName}"...`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nJSON bruto para formatar:\n${truncatedJson}` }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) return null;
      return JSON.parse(jsonText).categories || [];
    } else if (isOpenAI) {
      console.log(`   🤖 Chamando API do OpenAI GPT-4o-mini para formatar JSON de rede de "${restaurantName}"...`);
      const endpoint = 'https://api.openai.com/v1/chat/completions';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Aqui está o JSON bruto para analisar:\n${truncatedJson}` }
          ]
        })
      });
      
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      const jsonText = data.choices?.[0]?.message?.content;
      if (!jsonText) return null;
      return JSON.parse(jsonText).categories || [];
    }
  } catch (err) {
    console.log(`   ⚠️ Erro ao estruturar JSON de rede: ${err.message}`);
    return null;
  }
  return null;
}

async function extractMenuWithAI(cleanedHtml, restaurantName) {
  const geminiKey = process.env.VITE_GEMINI_API_KEY;
  const openAiKey = process.env.VITE_OPENAI_API_KEY;
  
  const isGemini = geminiKey && geminiKey.startsWith('AIzaSy');
  const isOpenAI = (geminiKey && geminiKey.startsWith('sk-proj-')) || (openAiKey && openAiKey.startsWith('sk-proj-'));
  const activeKey = isGemini ? geminiKey : (openAiKey || geminiKey);
  
  if (!activeKey) {
    return null; // Sem chave, cai no scraper normal
  }

  const systemPrompt = `Você é um extrator de cardápios de restaurantes de alta precisão. 
Sua tarefa é analisar o HTML simplificado do site do restaurante "${restaurantName}" e extrair todos os pratos, bebidas, categorias, preços e imagens dos pratos.

Diretrizes CRÍTICAS de Precisão:
1. Extraia APENAS itens reais de comida ou bebida comercializados pelo restaurante (ex: pratos, lanches, pizzas, combos, sobremesas, bebidas).
2. NUNCA extraia informações de contato do restaurante, endereços físicos, bairros, cidades, CEPs, links do Google Maps ou números de telefone como se fossem pratos ou preços do cardápio!
3. NUNCA extraia avaliações/depoimentos de clientes (reviews), pontuação de estrelas (ex: "★", "*****"), nomes de clientes que avaliaram (ex: "Rosimere", "Eduardo", "Daniel"), ou datas das avaliações como pratos.
4. NUNCA extraia artigos de blog, posts, notícias ou páginas de ajuda.
5. Se um elemento de texto não for um prato/bebida real do cardápio, ignore-o completamente.
6. DIVISÃO DE PREÇOS MÚLTIPLOS: Se encontrar variações de preço/tamanho descritas no mesmo item (ex: "Individual R$ 36,90 / Dupla R$ 60,90"), crie pratos independentes na lista de retorno (ex: "Nome do Prato (Individual)" com preço "R$ 36,90" e "Nome do Prato (Dupla)" com preço "R$ 60,90").

Regras de Extração de Dados:
1. Agrupe os itens pelas categorias reais exibidas no site (ex: "Entradas", "Pratos Principais", "Sobremesas", "Bebidas").
2. Para cada item, extraia:
   - "name": Nome exato do prato (incluindo o sufixo de tamanho como "(Individual)" ou "(Dupla)" se for dividido).
   - "price": Preço exato formatado (ex: "R$ 29,90" ou "R$ 15,00"). Se não houver preço visível, deixe em branco.
   - "description": Descrição ou ingredientes do prato (se houver).
   - "image_url": O valor absoluto do atributo "src" da tag <img> correspondente a este prato (se houver uma imagem associada ao prato no HTML).
3. Ignore links de redes sociais, rodapés, termos de uso ou propagandas.
4. Retorne a resposta estritamente no seguinte formato JSON:
{
  "categories": [
    {
      "name": "Nome da Categoria",
      "items": [
        {
          "name": "Nome do Prato",
          "price": "R$ XX,XX",
          "description": "Descrição do prato...",
          "image_url": "URL da imagem..."
        }
      ]
    }
  ]
}`;

  try {
    if (isGemini) {
      console.log(`   🤖 Chamando API do Gemini 1.5 Flash para extrair cardápio de "${restaurantName}"...`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nHTML para análise:\n${cleanedHtml}` }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) return null;
      return JSON.parse(jsonText).categories || [];
    } else if (isOpenAI) {
      console.log(`   🤖 Chamando API do OpenAI GPT-4o-mini para extrair cardápio de "${restaurantName}"...`);
      const endpoint = 'https://api.openai.com/v1/chat/completions';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Aqui está o HTML para analisar:\n${cleanedHtml}` }
          ]
        })
      });
      
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      const jsonText = data.choices?.[0]?.message?.content;
      if (!jsonText) return null;
      return JSON.parse(jsonText).categories || [];
    }
  } catch (err) {
    console.log(`   ⚠️ Erro ao chamar a API de IA: ${err.message}. caindo no seletor manual...`);
    return null;
  }
  return null;
}

async function expandAndLoadAllContent(page) {
  console.log('   🔄 Rolando e expandindo conteúdo da página para carregar itens dinâmicos...');
  
  // 1. Rola a página progressivamente para disparar lazy loading de imagens/itens
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= scrollHeight || totalHeight > 10000) {
          clearInterval(timer);
          resolve();
        }
      }, 250);
    });
  });
  await delay(1000);
  
  // 2. Tenta clicar em qualquer botão de "Carregar mais", "Ver mais" ou "Mostrar mais"
  let clickedMore = true;
  let clickLimit = 6;
  
  while (clickedMore && clickLimit > 0) {
    clickedMore = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, span, div[role="button"]'));
      const loadMoreBtn = buttons.find(b => {
        const text = b.textContent.trim().toLowerCase();
        return (
          (text.includes('carregar') && text.includes('mais')) ||
          (text.includes('ver') && text.includes('mais')) ||
          (text.includes('mostrar') && text.includes('mais')) ||
          (text.includes('load') && text.includes('more')) ||
          (text.includes('show') && text.includes('more')) ||
          text === 'ver mais' ||
          text === 'carregar mais' ||
          text === 'mostrar mais'
        );
      });
      
      if (loadMoreBtn && typeof loadMoreBtn.click === 'function') {
        loadMoreBtn.click();
        return true;
      }
      return false;
    });
    
    if (clickedMore) {
      console.log('   🖱️ Botão "Carregar Mais" clicado! Aguardando novos pratos...');
      await delay(2000);
      clickLimit--;
      // Rola até o final para acionar novos itens carregados
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
  }

  // 3. Tenta expandir accordions/abas colapsadas de forma sequencial com delays
  console.log('   📂 Identificando acordeões de categorias colapsados para expandir sequencialmente...');
  
  const accordionCount = await page.evaluate(() => {
    // Limpa marcações antigas se houver
    document.querySelectorAll('[data-scraper-accordion]').forEach(el => {
      el.removeAttribute('data-scraper-accordion');
    });

    const headers = Array.from(document.querySelectorAll([
      '[class*="header"]', '[class*="heading"]', '[class*="toggle"]', '[class*="trigger"]',
      '.panel-title', '[id*="heading"]', '[id*="toggle"]', '[aria-expanded]',
      'h3', 'h4', 'h2', '.category-card'
    ].join(', ')));
    
    let count = 0;
    headers.forEach(header => {
      // Evita cabeçalhos do site principal ou do rodapé
      if (header.closest('footer') || header.closest('header') || header.closest('nav')) return;

      const ariaExpanded = header.getAttribute('aria-expanded');
      let isCollapsed = false;
      
      if (ariaExpanded === 'false') {
        isCollapsed = true;
      } else if (ariaExpanded === 'true') {
        return; // Já está expandido
      } else {
        const parent = header.parentElement;
        if (!parent) return;
        
        const siblings = Array.from(parent.children);
        const headerIdx = siblings.indexOf(header);
        const nextSibling = headerIdx !== -1 ? siblings[headerIdx + 1] : null;
        
        if (nextSibling) {
          const style = window.getComputedStyle(nextSibling);
          const isHidden = style.display === 'none' || style.visibility === 'hidden' || parseInt(style.height || '0') === 0;
          const classNameStr = String(nextSibling.className || '');
          const hasCollapseClass = classNameStr.includes('collapse') || classNameStr.includes('content') || classNameStr.includes('body');
            
          if (isHidden || (hasCollapseClass && nextSibling.clientHeight === 0)) {
            isCollapsed = true;
          }
        }
        
        const headerClassStr = String(header.className || '');
        if (headerClassStr.includes('collapsed') || headerClassStr.includes('close')) {
          isCollapsed = true;
        }
      }
      
      if (isCollapsed) {
        const target = header.querySelector('button, a, span') || header;
        if (typeof target.click === 'function') {
          target.setAttribute('data-scraper-accordion', String(count));
          count++;
        }
      }
    });
    
    return count;
  });
  
  if (accordionCount > 0) {
    console.log(`   🖱️ Encontrados ${accordionCount} acordeões colapsados. Expandindo um por um...`);
    for (let i = 0; i < accordionCount; i++) {
      try {
        await page.evaluate((idx) => {
          const el = document.querySelector(`[data-scraper-accordion="${idx}"]`);
          if (el) {
            el.click();
          }
        }, i);
        // Espera 600ms após clicar em cada acordeão para dar tempo da animação/carregamento AJAX
        await delay(600);
      } catch (clickErr) {
        console.log(`      ⚠️ Erro ao clicar no acordeão ${i}: ${clickErr.message}`);
      }
    }
    console.log('   ✨ Todos os acordeões clicados!');
    
    // Rola novamente para disparar carregamento de imagens preguiçosas dentro dos acordeões recém-abertos
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 500));
      window.scrollTo(0, document.body.scrollHeight / 2);
      await new Promise(r => setTimeout(r, 500));
      window.scrollTo(0, document.body.scrollHeight);
    });
    await delay(1000);
  }
}

async function extractMenuWithAIVision(images, restaurantName) {
  const geminiKey = process.env.VITE_GEMINI_API_KEY;
  const openAiKey = process.env.VITE_OPENAI_API_KEY;
  
  const isGemini = geminiKey && geminiKey.startsWith('AIzaSy');
  const isOpenAI = (geminiKey && geminiKey.startsWith('sk-proj-')) || (openAiKey && openAiKey.startsWith('sk-proj-'));
  const activeKey = isGemini ? geminiKey : (openAiKey || geminiKey);
  
  if (!activeKey) return null;

  const systemPrompt = `Você é um extrator de cardápios por imagem (OCR visual de cardápios) de alta precisão. 
Sua tarefa é analisar a(s) imagem(ns) do cardápio do restaurante "${restaurantName}" e extrair todos os pratos, bebidas, categorias, preços e descrições.
Diretrizes:
1. Agrupe os itens pelas categorias exibidas visualmente na imagem (ex: "Entradas", "Pratos Principais", "Sobremesas", "Bebidas").
2. DIVISÃO DE PREÇOS MÚLTIPLOS: Se encontrar variações de preço/tamanho descritas no mesmo item (ex: "Individual R$ 36,90 / Dupla R$ 60,90"), crie pratos independentes na lista de retorno (ex: "Nome do Prato (Individual)" com preço "R$ 36,90" e "Nome do Prato (Dupla)" com preço "R$ 60,90").
3. Para cada item, extraia:
   - "name": Nome exato do prato (incluindo o sufixo de tamanho como "(Individual)" ou "(Dupla)" se for dividido).
   - "price": Preço exato formatado (ex: "R$ 29,90" ou "R$ 15,00").
   - "description": Descrição ou ingredientes do prato (se houver escrito).
   - "image_url": Deixe sempre em branco ("").
3. Retorne a resposta estritamente no seguinte formato JSON:
{
  "categories": [
    {
      "name": "Nome da Categoria",
      "items": [
        {
          "name": "Nome do Prato",
          "price": "R$ XX,XX",
          "description": "Descrição do prato..."
        }
      ]
    }
  ]
}`;

  try {
    if (isGemini) {
      console.log(`   📸 Chamando API de Visão do Gemini 1.5 Flash para ler imagem do cardápio de "${restaurantName}"...`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`;
      
      const parts = [
        { text: systemPrompt }
      ];
      
      images.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.data
          }
        });
      });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) return null;
      return JSON.parse(jsonText).categories || [];
    } else if (isOpenAI) {
      console.log(`   📸 Chamando API de Visão do OpenAI GPT-4o-mini para ler imagem do cardápio de "${restaurantName}"...`);
      const endpoint = 'https://api.openai.com/v1/chat/completions';
      
      const content = [
        { type: "text", text: systemPrompt }
      ];
      
      images.forEach(img => {
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`
          }
        });
      });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: "json_object" },
          messages: [
            { role: 'user', content }
          ]
        })
      });
      
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      const jsonText = data.choices?.[0]?.message?.content;
      if (!jsonText) return null;
      return JSON.parse(jsonText).categories || [];
    }
  } catch (err) {
    console.log(`   ⚠️ Erro ao chamar a API de Visão: ${err.message}`);
    return null;
  }
  return null;
}

async function extractMenuItems(page, url, restaurant) {
  const urlLower = url.toLowerCase();
  
  // 1. Rola a página e clica em botões de expandir/ver mais para exibir todos os itens
  await expandAndLoadAllContent(page);
  
  const hasAIKey = process.env.VITE_GEMINI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  let categories = null;

  // 1.5. Interceptador de Rede: Se capturamos JSON bruto da API do site
  if (hasAIKey && interceptedMenuData) {
    try {
      console.log(`   🌐 [INTERCEPTADO] Encontrado JSON de API de rede interceptado. Processando...`);
      categories = await extractFromRawJsonWithAI(interceptedMenuData, restaurant.name);
      if (categories && categories.length > 0 && categories.some(c => c.items.length > 0)) {
        console.log(`   ✨ Sucesso! IA mapeou o JSON de API de rede com perfeição.`);
        return categories;
      }
    } catch (e) {
      console.log(`   ⚠️ Falha ao estruturar JSON de rede interceptado: ${e.message}`);
    }
  }

  // 2. Tenta extração baseada em texto com IA primeiro se tiver chave de API
  if (hasAIKey) {
    try {
      console.log(`   🤖 Iniciando extração de texto com IA para "${restaurant.name}"...`);
      
      // Tenta detectar e combinar categorias dinâmicas primeiro
      let cleanedHtml = await loadAndCombineDynamicCategories(page);
      
      // Se não houver abas dinâmicas, pega o HTML limpo padrão
      if (!cleanedHtml) {
        console.log(`   📝 Usando estrutura de página única para o cardápio.`);
        cleanedHtml = await getCleanedHtmlForAI(page);
      }
      
      const plainText = await page.evaluate(() => document.body.innerText.trim());
      
      // Reduz o limite de caracteres para processar qualquer página com texto válido (> 50 caracteres)
      if (plainText.length > 50) {
        categories = await extractMenuWithAI(cleanedHtml, restaurant.name);
        if (categories && categories.length > 0 && categories.some(c => c.items.length > 0)) {
          console.log(`   ✨ Sucesso! IA extraiu o cardápio textual com perfeição.`);
          return categories;
        }
      }
    } catch (e) {
      console.log(`   ⚠️ Falha ao tentar extração textual com IA: ${e.message}`);
    }
  }

  // 3. Fallback Visual: Se a página é principalmente imagem ou a extração textual falhou
  if (hasAIKey && (!categories || categories.length === 0 || categories.every(c => c.items.length === 0))) {
    try {
      console.log(`   📸 Detectado possível cardápio em formato de imagem/panfleto. Capturando imagens da tela...`);
      
      // Tenta extrair imagens grandes do DOM (geralmente fotos do cardápio físico no Restaurant Guru ou blogs)
      let images = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        const largeImgs = imgs.filter(img => img.naturalWidth > 350 && img.naturalHeight > 350);
        
        return largeImgs.map(img => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            return {
              mimeType: 'image/jpeg',
              data: canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
            };
          } catch (e) {
            return null;
          }
        }).filter(Boolean);
      });
      
      // Se não achou tags img grandes no DOM, tira um screenshot da página inteira
      if (images.length === 0) {
        console.log(`   📸 Nenhuma imagem grande no DOM. Capturando screenshot da tela cheia...`);
        const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 80 });
        images = [{
          mimeType: 'image/jpeg',
          data: screenshotBuffer.toString('base64')
        }];
      }
      
      // Envia os prints/imagens coletados para a IA Vision ler
      const visionCategories = await extractMenuWithAIVision(images.slice(0, 3), restaurant.name);
      if (visionCategories && visionCategories.length > 0 && visionCategories.some(c => c.items.length > 0)) {
        console.log(`   ✨ Sucesso! IA Vision realizou o OCR visual do cardápio perfeitamente.`);
        return visionCategories;
      }
    } catch (visionErr) {
      console.log(`   ⚠️ Erro ao realizar a extração visual por IA Vision: ${visionErr.message}`);
    }
  }

  // 4. Último caso: Extratores clássicos baseados em seletores manuais CSS
  console.log(`   🕵️ Caindo no extrator manual por seletores CSS clássicos...`);
  
  if (urlLower.includes('google.com/search') || urlLower.includes('google.com.br/search')) {
    console.log('   🏪 Detectado: Google Search Menu');
    try {
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, span'));
        const menuBtn = elements.find(b => {
          const txt = b.textContent.trim().toLowerCase();
          return txt === 'menu' || txt === 'cardápio' || txt === 'cardapio';
        });
        if (menuBtn) {
          menuBtn.click();
        }
      });
      await delay(1500);
    } catch (e) {
      console.log('   ⚠️ Não foi possível forçar o clique do Menu:', e.message);
    }
    categories = await extractFromGoogleSearchMenu(page);
  } else if (urlLower.includes('restaurantguru.com')) {
    console.log('   🏪 Detectado: Restaurant Guru');
    categories = await extractFromRestaurantGuru(page);
  } else if (urlLower.includes('ola.click') || urlLower.includes('pedir.delivery') || urlLower.includes('deliverydireto') || urlLower.includes('instadelivery')) {
    console.log('   🏪 Detectado: Delivery Platform');
    categories = await extractFromOlaClick(page);
  } else if (urlLower.includes('tagme.com.br')) {
    console.log('   🏪 Detectado: TagMe');
    categories = await extractFromOlaClick(page);
  } else {
    console.log('   🏪 Site genérico - usando detecção automática');
    categories = await extractGenericMenu(page);
  }

  if (!categories || categories.length === 0 || categories.every(c => c.items.length === 0)) {
    console.log('   ⚠️ Estratégia inicial não encontrou itens. Tentando varredura genérica...');
    categories = await extractGenericMenu(page);
  }

  return categories;
}

function normalizeCategories(categories) {
  if (!categories || categories.length === 0) return [];

  // Filtra categorias sem itens e normaliza nomes
  const valid = categories.filter(c => c.items && c.items.length > 0);

  if (valid.length === 0) return [];

  // Se todas as categorias têm o mesmo nome genérico, mescla em uma só
  const names = [...new Set(valid.map(c => c.name))];
  if (names.length === 1) {
    const allItems = [];
    const seen = new Set();
    valid.forEach(c => {
      c.items.forEach(item => {
        const key = item.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          allItems.push(item);
        }
      });
    });
    return [{ name: names[0], items: allItems }];
  }

  return valid;
}

async function saveMenuToSupabase(restaurantId, categories) {
  try {
    console.log(`📡 [Supabase] Salvando cardápio no Supabase para o restaurante ${restaurantId}...`);
    
    // 1. Deleta categorias antigas (o cascade delete limpa pratos antigos)
    const { error: deleteError } = await supabase
      .from('menu_categories')
      .delete()
      .eq('restaurant_id', restaurantId);
      
    if (deleteError) {
      console.warn(`⚠️ [Supabase] Erro ao deletar categorias antigas:`, deleteError.message);
    }
    
    // 2. Inserir as novas categorias e pratos
    for (let catIdx = 0; catIdx < categories.length; catIdx++) {
      const cat = categories[catIdx];
      // Gera UUID determinístico para a categoria
      const catUuid = uuidFrom(restaurantId + '-' + cat.name + '-' + catIdx);
      
      const { error: catError } = await supabase
        .from('menu_categories')
        .insert({
          id: catUuid,
          restaurant_id: restaurantId,
          name: cat.name,
          order_index: catIdx,
          is_active: true
        });
        
      if (catError) {
        console.error(`⚠️ [Supabase] Erro ao inserir categoria "${cat.name}":`, catError.message);
        continue;
      }
      
      const items = cat.items || [];
      if (items.length > 0) {
        const itemsToInsert = items.map((item, itemIdx) => {
          let priceVal = 0;
          if (typeof item.price === 'number') {
            priceVal = item.price;
          } else if (item.price) {
            const parsed = parsePrice(String(item.price));
            priceVal = parsed !== null ? parsed : 0;
          }
          
          return {
            id: uuidFrom(catUuid + '-' + item.name + '-' + itemIdx),
            category_id: catUuid,
            name: item.name,
            description: item.description || '',
            price: priceVal,
            image_url: item.image_url || '',
            order_index: itemIdx,
            is_active: true
          };
        });
        
        const { error: itemsError } = await supabase
          .from('menu_items')
          .insert(itemsToInsert);
          
        if (itemsError) {
          console.error(`⚠️ [Supabase] Erro ao inserir pratos da categoria "${cat.name}":`, itemsError.message);
        }
      }
    }
    console.log(`✅ [Supabase] Cardápio salvo com sucesso no banco remoto!`);
  } catch (err) {
    console.error(`⚠️ [Supabase] Erro inesperado ao salvar cardápio:`, err.message);
  }
}

async function run() {
  console.log(`\n=============================================================`);
  console.log(`📋 MENU SCRAPER: EXTRAÇÃO DE CARDÁPIOS`);
  console.log(`=============================================================\n`);

  // Parse command line arguments
  let targetId = null;
  const singleIdx = process.argv.indexOf('--single');
  const idIdx = process.argv.indexOf('--id');
  if (singleIdx !== -1 && idIdx !== -1 && idIdx + 1 < process.argv.length) {
    targetId = process.argv[idIdx + 1];
    console.log(`🎯 Modo Single ativado para o restaurante ID: ${targetId}`);
  }

  console.log('📡 Buscando estabelecimentos no Supabase...');
  const { data, error: fetchError } = await supabase
    .from('restaurants')
    .select('*');

  if (fetchError) {
    console.error('❌ Erro ao buscar do Supabase:', fetchError.message);
    process.exit(1);
  }

  console.log(`📂 Carregados ${data.length} estabelecimentos do Supabase.`);

  // Filtra restaurantes que têm link de cardápio (other_url ou external_url)
  let withMenu = data.filter(r => {
    const menuUrl = r.other_url || r.external_url;
    return menuUrl && menuUrl.startsWith('http');
  }).map(r => ({
    id: r.id, // Já é UUID
    name: r.name,
    category: r.category,
    menuSourceUrl: r.other_url || r.external_url,
    city: r.city || 'João Pessoa',
    address: r.address || ''
  }));

  if (targetId) {
    withMenu = withMenu.filter(r => r.id === targetId);
    if (withMenu.length === 0) {
      console.log(`❌ O restaurante com ID "${targetId}" não possui link de cardápio válido cadastrado.`);
      console.log(`RESULT:{"success":false,"error":"O restaurante não possui link de cardápio cadastrado no Supabase."}`);
      return;
    }
  }

  console.log(`🔗 ${withMenu.length} estabelecimentos possuem link de cardápio no Supabase.`);

  if (withMenu.length === 0) {
    console.log(`❌ Nenhum restaurante com link de cardápio disponível.`);
    return;
  }

  // Carrega resultados existentes localmente (como backup/status)
  let results = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      results = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      console.log(`📂 Carregados ${results.length} resultados anteriores.`);
    } catch (e) {
      results = [];
    }
  }

  // Carrega estado para resumo
  let startIndex = 0;
  if (!targetId && fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      startIndex = state.lastProcessedIndex + 1;
      console.log(`🔄 Retomando do índice ${startIndex}...`);
    } catch (e) {}
  }

  // Mapa de IDs já processados
  const processedIds = new Set(results.map(r => r.restaurantId));

  // Filtra apenas os não processados ainda
  let pending = withMenu;
  if (!targetId) {
    pending = withMenu.filter(r => !processedIds.has(r.id)).slice(startIndex);
  }

  if (!targetId && pending.length === 0 && processedIds.size > 0) {
    console.log(`✨ Todos os cardápios já foram processados!`);
    return;
  }

  console.log(`🔄 ${pending.length} cardápios pendentes para processar.\n`);

  console.log(`🚀 Inicializando navegador Chrome...`);
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--lang=pt-BR']
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9'
  });

  // Habilita escuta de respostas JSON de API para interceptação
  page.on('response', async (response) => {
    try {
      const url = response.url().toLowerCase();
      const contentType = response.headers()['content-type'] || '';
      
      if (contentType.includes('application/json')) {
        if (
          url.includes('catalog') || 
          url.includes('menu') || 
          url.includes('products') || 
          url.includes('itens') || 
          url.includes('produtos') || 
          url.includes('graphql') ||
          url.includes('estabelecimentos') ||
          url.includes('merchant')
        ) {
          const json = await response.json();
          if (json && (json.categories || json.products || json.data || json.items || Array.isArray(json))) {
            interceptedMenuData = json;
          }
        }
      }
    } catch (e) {
      // Ignora falhas ao ler corpo da resposta
    }
  });

  let updatedCount = 0;
  let failedCount = 0;
  let emptyCount = 0;

  for (let idx = 0; idx < pending.length; idx++) {
    const restaurant = pending[idx];
    const url = restaurant.menuSourceUrl;

    // Reseta dados interceptados
    interceptedMenuData = null;

    console.log(`\n-------------------------------------------------------------`);
    console.log(`[${startIndex + idx + 1}/${withMenu.length}] "${restaurant.name}"`);
    console.log(`   🔗 ${url}`);

    const navSuccess = await navigateWithRetry(page, url);
    if (!navSuccess) {
      console.log(`   ❌ Não foi possível carregar a página.`);
      failedCount++;
      
      // Salva print de erro de navegação
      try {
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const nameClean = restaurant.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await page.screenshot({ path: path.join(logDir, `${nameClean}_error_nav.png`) });
      } catch (screenshotErr) {}
      continue;
    }

    // Aguarda um pouco para renderização de JS
    await delay(2000);

    let categories;
    try {
      categories = await extractMenuItems(page, url, restaurant);
    } catch (err) {
      console.log(`   ❌ Erro ao extrair cardápio: ${err.message}`);
      failedCount++;
      
      // Salva print de erro de extração
      try {
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const nameClean = restaurant.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await page.screenshot({ path: path.join(logDir, `${nameClean}_error_extract.png`) });
      } catch (screenshotErr) {}
      continue;
    }

    const normalized = normalizeCategories(categories);

    if (normalized.length === 0 || normalized.every(c => c.items.length === 0)) {
      console.log(`   ⚠️ Nenhum item de cardápio encontrado nesta página.`);
      emptyCount++;

      // Tenta rolar a página para carregar conteúdo dinâmico
      console.log(`   🔄 Rolando a página para carregar conteúdo dinâmico...`);
      try {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await delay(2000);
        const retryCategories = await extractMenuItems(page, url, restaurant);
        const retryNormalized = normalizeCategories(retryCategories);
        if (retryNormalized.length > 0 && retryNormalized.some(c => c.items.length > 0)) {
          console.log(`   ✅ Itens encontrados após scroll!`);
          const menuResult = {
            id: restaurant.id,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            restaurantCategory: restaurant.category,
            menuSourceUrl: url,
            categories: retryNormalized
          };
          results.push(menuResult);
          updatedCount++;
          // fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
          
          // Salva no Supabase
          await saveMenuToSupabase(restaurant.id, retryNormalized);
        }
      } catch (scrollErr) {}
    } else {
      // Contagem total de itens
      const totalItems = normalized.reduce((sum, c) => sum + c.items.length, 0);
      console.log(`   ✅ Encontradas ${normalized.length} categorias, ${totalItems} itens!`);
      normalized.forEach(c => console.log(`      - ${c.name}: ${c.items.length} itens`));

      const menuResult = {
        id: restaurant.id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantCategory: restaurant.category,
        menuSourceUrl: url,
        categories: normalized
      };
      results.push(menuResult);
      updatedCount++;
      // fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
      
      // Salva no Supabase
      await saveMenuToSupabase(restaurant.id, normalized);
    }

    // Salva estado
    if (!targetId) {
      const state = { lastProcessedIndex: startIndex + idx };
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    }

    // Aguarda para evitar bloqueio
    if (!targetId && idx < pending.length - 1) {
      const waitTime = 1500 + Math.random() * 2000;
      console.log(`   ⏱️ Aguardando ${Math.round(waitTime)}ms...`);
      await delay(waitTime);
    }
  }

  let singleResultObj = { success: false, error: "Nenhum prato/categoria estruturado foi identificado na página." };
  if (targetId && updatedCount > 0) {
    singleResultObj = { success: true };
  } else if (targetId && failedCount > 0) {
    singleResultObj = { success: false, error: "O robô encontrou um erro de navegação ou extração." };
  }

  if (targetId) {
    console.log(`RESULT:${JSON.stringify(singleResultObj)}`);
  }

  await browser.close();

  // Remove estado se tudo concluído
  if (!targetId && fs.existsSync(STATE_FILE)) {
    const remaining = withMenu.length - results.length;
    if (remaining <= 0) {
      fs.unlinkSync(STATE_FILE);
    }
  }

  console.log(`\n=============================================================`);
  console.log(`🎉 MENU SCRAPER CONCLUÍDO!`);
  console.log(`📊 Total de cardápios processados: ${updatedCount}`);
  console.log(`❌ Falhas: ${failedCount}`);
  console.log(`⚠️ Sem itens encontrados: ${emptyCount}`);
  console.log(`💾 Resultados salvos em: scraped_menus.json`);
  console.log(`=============================================================\n`);
}

run().catch(err => {
  console.error('\n❌ Erro fatal:', err);
  process.exit(1);
});
