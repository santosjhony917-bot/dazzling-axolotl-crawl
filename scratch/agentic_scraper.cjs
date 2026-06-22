const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Carrega variáveis de ambiente
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = value.trim();
      }
    });
  }
}
loadEnv();

const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY;

let openai;
let isOpenRouter = false;

if (OPENROUTER_API_KEY) {
  openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Restaurant Scraper Agent"
    }
  });
  isOpenRouter = true;
  console.log('[Agente Scraper] 🚀 Usando OpenRouter como API de IA.');
} else if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('[Agente Scraper] 🚀 Usando OpenAI nativa como API de IA.');
} else {
  console.error('[⚠️ ALERTA] Chave de API de IA não configurada no arquivo .env');
}

const MODEL_NAME = process.env.VITE_AGENT_MODEL || (isOpenRouter ? "openrouter/free" : "gpt-4o");

async function getPageContext(page) {
  try {
    // 1. Auto-Expansão de Categorias (Auto-Clicker)
    await page.evaluate(() => {
      const selectors = [
        '.accordion', '.category-header', '[aria-expanded="false"]', '[data-toggle="collapse"]', 
        '.MuiAccordionSummary-root', 
        '[class*="category"]', '[class*="Category"]', '[class*="accordion"]', 
        '[class*="group-header"]', '[class*="MenuHeader"]'
      ].join(', ');
      
      const expandables = document.querySelectorAll(selectors);
      expandables.forEach(el => {
        try { 
          if(el.getAttribute('aria-expanded') !== 'true') el.click(); 
        } catch(e){}
      });

      // Expansor agressivo genérico (clica em tudo que é clicável mas não é link)
      const clickables = document.querySelectorAll('div, span, li, button');
      for (let el of clickables) {
        try {
          const style = window.getComputedStyle(el);
          if (style.cursor === 'pointer' && !el.closest('a') && !el.closest('button[type="submit"]')) {
             el.click();
          }
        } catch(e) {}
      }
    });
    
    // Aguarda animações de expansão e imagens lazy load
    await new Promise(r => setTimeout(r, 2000));

    // Rola até o final para disparar lazy loading
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 1000;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if(totalHeight >= scrollHeight || totalHeight > 15000){
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    const context = await page.evaluate(() => {
      const interactables = [];
      const elements = document.querySelectorAll('a, button, [role="button"], [role="tab"], .nav__item, .menus__items, .swiper-slide, .MuiTab-root');
      
      elements.forEach((el, index) => {
        // Usa textContent para pegar o texto real sem cortes visuais do line-clamp
        const text = el.textContent?.trim() || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '';
        if (text && text.length > 1) {
          const tag = `el-${index}`;
          el.setAttribute('data-agent-id', tag);
          interactables.push({
            id: tag,
            text: text.substring(0, 100),
            href: el.href || null
          });
        }
      });
      
      // 2. Extrator de DOM Híbrido (Texto + Imagens + Bypass de CSS Ellipsis)
      function extractContent(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent.trim();
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Pula scripts, styles, forms invisiveis
          if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || node.tagName === 'NOSCRIPT' || node.tagName === 'SVG' || node.tagName === 'IFRAME') {
            return '';
          }
          
          if (node.tagName === 'IMG') {
            const src = node.src || node.getAttribute('data-src') || '';
            // Só pega se não for base64 ou ícone pequeno
            if (src && !src.startsWith('data:image') && !src.includes('icon')) {
              return ` [IMAGEM: ${src}] `;
            }
          }
          
          let text = '';

          // 2.5. Tenta extrair background-image se houver
          try {
            const style = window.getComputedStyle(node);
            if (style && style.backgroundImage && style.backgroundImage !== 'none' && style.backgroundImage.includes('url(')) {
              const src = style.backgroundImage.match(/url\((["']?)(.*?)\1\)/)[2];
              if (src && !src.startsWith('data:image') && !src.includes('icon')) {
                text += ` [IMAGEM: ${src}] `;
              }
            }
          } catch(e) {}

          const titleOrLabel = node.getAttribute('title') || node.getAttribute('aria-label');
          if (titleOrLabel && titleOrLabel.length > 30) {
             // Injeta o texto completo oculto que foi cortado por reticências no layout
             text += ` [${titleOrLabel}] `;
          }

          for (let child of node.childNodes) {
            const childText = extractContent(child);
            if (childText) text += ' ' + childText;
          }
          
          // Quebra de linha para blocos
          if (['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'ARTICLE', 'SECTION'].includes(node.tagName)) {
            text += '\n';
          }
          return text;
        }
        return '';
      }
      
      let bodyText = extractContent(document.body).replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
      
      return {
        text: bodyText.substring(0, 50000), // Aumentado para 50.000
        interactables: interactables.slice(0, 150) // Aumentado botões mapeados
      };
    });
    return context;
  } catch (e) {
    console.error(`[Agente] Erro ao extrair contexto da página: ${e.message}`);
    return { text: '', interactables: [] };
  }
}
function cleanAndParseJSON(text) {
  if (!text) return null;
  let clean = text.trim();
  if (clean.includes('```')) {
    clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();
  }
  try {
    return JSON.parse(clean);
  } catch (err) {
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
      } catch (nestedErr) {
        console.error('[Agente] Falha ao parsear JSON aninhado:', nestedErr.message);
      }
    }
    throw err;
  }
}

// Detecta o tipo de página para aplicar a estratégia correta
function detectPageType(url) {
  const u = url.toLowerCase();
  if (u.endsWith('.pdf') || u.includes('/pdf') || u.includes('cardapio.pdf') || u.includes('menu.pdf')) return 'pdf';
  if (u.includes('linktr.ee') || u.includes('linktree') || u.includes('bio.link') || u.includes('beacons.ai') || u.includes('taplink')) return 'linktree';
  if (u.includes('livemenu.app') || u.includes('ifood.com.br') || u.includes('rappi.com') || u.includes('aiqfome.com') || u.includes('anota.ai') || u.includes('goomer.app') || u.includes('saipos.com') || u.includes('abrahao.app') || u.includes('delivery.') || u.includes('cardapio.') || u.includes('menu.') || u.includes('pedido.') || u.includes('pedidos.') || u.includes('pedir.') || u.includes('menudigital') || u.includes('ola.menu') || u.includes('instadelivery')) return 'delivery_spa';
  return 'generic';
}

async function agenticFetch(url, objective) {
  console.log(`[Agente] Iniciando navegação autônoma em: ${url}`);
  
  const pageType = detectPageType(url);
  console.log(`[Agente] 🔍 Tipo de página detectado: ${pageType}`);

  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  
  let page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  let globalAccumulatedContent = "";
  let clickedElements = [];
  let lastUrl = '';
  let sameUrlCount = 0;

  try {
    console.log(`[Agente] Carregando a página inicial...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>console.log(`[Agente] Aviso: Timeout no carregamento inicial, tentando continuar...`));

    // ── Estratégia: Linktree / Agregador de links ──
    // Extrai todos os links da página e retorna para o chamador decidir qual seguir
    if (pageType === 'linktree') {
      console.log(`[Agente] 🔗 Estratégia Linktree: extraindo todos os links da página...`);
      await new Promise(r => setTimeout(r, 3000));
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors.map(a => ({ text: a.textContent.trim(), href: a.href })).filter(l => l.text && l.href && !l.href.includes('linktr.ee') && !l.href.includes('instagram.com') && !l.href.includes('facebook.com') && !l.href.includes('twitter.com') && !l.href.includes('whatsapp'));
      });
      const menuKeywords = ['cardapio', 'cardápio', 'menu', 'delivery', 'pedido', 'pedir', 'ifood', 'rappi', 'aiqfome', 'saipos', 'goomer', 'anota', 'abrahao'];
      const menuLinks = links.filter(l => menuKeywords.some(k => l.text.toLowerCase().includes(k) || l.href.toLowerCase().includes(k)));
      const targetLinks = menuLinks.length > 0 ? menuLinks : links.slice(0, 5);
      console.log(`[Agente] 🔗 Links encontrados: ${targetLinks.map(l => l.text + ' → ' + l.href).join(' | ')}`);
      await browser.close();
      // Retorna os links para que o chamador possa navegar neles recursivamente
      return `LINKTREE_LINKS:${JSON.stringify(targetLinks)}`;
    }

    // ── Estratégia: SPA / Delivery (URL não muda) ──
    // Extrai o conteúdo completo do DOM de uma vez após scroll total
    if (pageType === 'delivery_spa') {
      console.log(`[Agente] 🍔 Estratégia SPA/Delivery: extraindo conteúdo completo do DOM...`);
      await new Promise(r => setTimeout(r, 4000));
      // Scroll completo para disparar lazy loading
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 500;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= document.body.scrollHeight || totalHeight > 30000) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve();
            }
          }, 150);
        });
      });
      // Espera extra (aumentado para garantir carregamento de SPAs como Anota.AI)
      await new Promise(r => setTimeout(r, 8000));
      const fullContext = await getPageContext(page);
      await browser.close();
      return fullContext.text;
    }
    
    // Aumentado o limite de passos para 30
    for (let step = 0; step < 30; step++) {
      const currentUrl = page.url();
      console.log(`\n[Agente] --- Passo ${step+1}/30 ---`);
      console.log(`[Agente] URL Atual: ${currentUrl}`);

      // Avaliação dinâmica de SPA durante a navegação
      if (step > 0 && detectPageType(currentUrl) === 'delivery_spa') {
        console.log(`[Agente] 🍔 Detectou URL de cardápio SPA dinamicamente: ${currentUrl}. Alterando estratégia para extração completa!`);
        await new Promise(r => setTimeout(r, 8000)); // Aguarda carregar
        
        // Scroll completo para disparar lazy loading
        await page.evaluate(async () => {
          await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
              window.scrollBy(0, distance);
              totalHeight += distance;
              if (totalHeight >= document.body.scrollHeight || totalHeight > 30000) {
                clearInterval(timer);
                window.scrollTo(0, 0);
                resolve();
              }
            }, 150);
          });
        });
        
        await new Promise(r => setTimeout(r, 4000)); // Aguarda imagens
        
        const fullContext = await getPageContext(page);
        globalAccumulatedContent += "\n\n--- CONTEÚDO COMPLETO DA PÁGINA DE CARDÁPIO ---\n" + fullContext.text;
        await browser.close();
        return globalAccumulatedContent;
      }

      // Detecta URL estacionária (SPA que não muda de URL)
      if (currentUrl === lastUrl) {
        sameUrlCount++;
      } else {
        sameUrlCount = 0;
        lastUrl = currentUrl;
      }

      // Se a URL não mudou por 3 passos, extrai o conteúdo completo e finaliza
      if (sameUrlCount >= 3) {
        console.log(`[Agente] 🔄 URL não mudou por ${sameUrlCount} passos consecutivos. Detectado SPA — extraindo conteúdo completo e finalizando.`);
        const fullContext = await getPageContext(page);
        globalAccumulatedContent += "\n\n--- CONTEÚDO COMPLETO DA PÁGINA ---\n" + fullContext.text;
        await browser.close();
        return globalAccumulatedContent;
      }

      await new Promise(r => setTimeout(r, 6000));
      
      // Auto-scroll para carregar imagens com lazy loading
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          let distance = 300;
          let timer = setInterval(() => {
            let scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if(totalHeight >= scrollHeight || totalHeight > 5000){
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve();
            }
          }, 100);
        });
      });
      
      const pageContext = await getPageContext(page);
      
      console.log(`[Agente] Analisando ${pageContext.interactables.length} botões e ${pageContext.text.length} caracteres de texto com imagens...`);
      
      const response = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { 
            role: "system", 
            content: `Você é um agente navegador da web autônomo. O seu objetivo é: ${objective}\nVocê pode navegar pela página, ou se o site for dividido em múltiplas categorias por clique, comandar o robô a clicar na próxima aba/botão. O texto da página é extraído automaticamente.` 
          },
          { 
            role: "user", 
            content: `Página Atual: ${currentUrl}\n\nBotões/Links clicáveis na tela atual:\n${JSON.stringify(pageContext.interactables, null, 2)}\n\n[HISTÓRICO] Você já clicou nestes botões no passado: ${JSON.stringify(clickedElements)}\nREGRA: NUNCA clique novamente nos botões que já estão no seu histórico, a menos que seja um botão de 'Voltar' ou estritamente necessário. O objetivo é varrer TODAS AS ABAS NOVAS (principais e sub-abas).\n\nO que deseja fazer?` 
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "agent_decision",
            schema: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["click", "extract_and_click", "found", "fail"], description: "Ação: 'click' (apenas navega), 'extract_and_click' (salva o conteúdo desta tela e clica no próximo botão), 'found' (achou tudo, finaliza), 'fail' (não é possível)." },
                element_id: { type: ["string", "null"], description: "Se action=click ou extract_and_click, passe o ID ('el-X') do botão para clicar." }
              },
              required: ["action", "element_id"],
              additionalProperties: false
            },
            strict: true
          }
        }
      });
      
      if (!response || !response.choices || !response.choices[0]) {
        console.log(`[Agente] 🚨 Resposta vazia da IA. Extraindo conteúdo atual e finalizando.`);
        await browser.close();
        return globalAccumulatedContent + "\n\n--- TELA EXTRAÍDA ---\n" + pageContext.text || null;
      }
      const decisionText = response.choices[0].message.content;
      const decision = cleanAndParseJSON(decisionText);
      
      if (decision.action === 'fail') {
        console.log(`[Agente] ❌ IA não encontrou o objetivo e desistiu, mas retornaremos o conteúdo da última tela por precaução.`);
        await browser.close();
        return (globalAccumulatedContent || "") + "\n\n--- TELA EXTRAÍDA (ÚLTIMA) ---\n" + pageContext.text;
      } 
      else if (decision.action === 'found') {
        console.log(`[Agente] ✅ IA encontrou todas as informações necessárias.`);
        await browser.close();
        globalAccumulatedContent += "\n\n--- TELA EXTRAÍDA ---\n" + pageContext.text;
        return globalAccumulatedContent;
      }
      else if (decision.action === 'extract_and_click') {
        const targetBtn = pageContext.interactables.find(b => b.id === decision.element_id);
        console.log(`[Agente] 💾 Extraindo dados da tela atual e CLICANDO em: [${targetBtn ? targetBtn.text : decision.element_id}]`);
        if (targetBtn) clickedElements.push(targetBtn.text);
        globalAccumulatedContent += "\n\n--- TELA EXTRAÍDA ---\n" + pageContext.text;
        
        try {
          if (targetBtn && targetBtn.href && targetBtn.href !== page.url() && !targetBtn.href.startsWith('javascript:')) {
            console.log(`[Agente] 🔗 Redirecionando direto para o link: ${targetBtn.href}`);
            await page.goto(targetBtn.href, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
          } else {
            await page.click(`[data-agent-id="${decision.element_id}"]`);
            await new Promise(r => setTimeout(r, 4000)); 
            const pages = await browser.pages();
            if (pages.length > 1) {
               page = pages[pages.length - 1];
               await page.bringToFront();
            }
          }
        } catch (err) {
          console.log(`[Agente] ⚠️ Erro ao clicar: ${err.message}`);
        }
      }
      else if (decision.action === 'click') {
        const targetBtn = pageContext.interactables.find(b => b.id === decision.element_id);
        console.log(`[Agente] 🖱️ Decidiu CLICAR em: [${targetBtn ? targetBtn.text : decision.element_id}]`);
        if (targetBtn) clickedElements.push(targetBtn.text);
        
        try {
          if (targetBtn && targetBtn.href && targetBtn.href !== page.url() && !targetBtn.href.startsWith('javascript:')) {
            console.log(`[Agente] 🔗 Redirecionando direto para o link: ${targetBtn.href}`);
            await page.goto(targetBtn.href, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
          } else {
            await page.click(`[data-agent-id="${decision.element_id}"]`);
            await new Promise(r => setTimeout(r, 4000)); 
            const pages = await browser.pages();
            if (pages.length > 1) {
               page = pages[pages.length - 1];
               await page.bringToFront();
            }
          }
        } catch (err) {
          console.log(`[Agente] ⚠️ Erro ao tentar clicar no elemento: ${err.message}`);
        }
      }
    }
    
    console.log(`[Agente] ⏳ Limite de 15 cliques atingido, finalizando extração parcial.`);
    const fallbackContext = await getPageContext(page);
    globalAccumulatedContent += "\n\n" + fallbackContext.text;
    await browser.close();
    return globalAccumulatedContent;
    
  } catch (e) {
    console.error(`[Agente] 🚨 Erro crítico na navegação: ${e.message}`);
    await browser.close();
    return globalAccumulatedContent || null;
  }
}

module.exports = { agenticFetch };
