const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Carrega as variáveis de ambiente
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?$/);
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
      "X-Title": "Restaurant Scraper"
    }
  });
  isOpenRouter = true;
  console.log('[IA Validadora] 🚀 Usando OpenRouter como API de IA.');
} else if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('[IA Validadora] 🚀 Usando OpenAI nativa como API de IA.');
} else {
  console.error('[⚠️ ALERTA] Chave de API de IA não configurada no arquivo .env');
}

const MODEL_NAME = process.env.VITE_AI_MODEL || (isOpenRouter ? "openrouter/free" : "gpt-4o-mini");

function parseJSONFromAI(content) {
  if (!content) return null;
  let clean = content.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error('[IA Validadora] Falha ao tentar fazer parse de JSON da IA:', err.message, '\nConteúdo original:', content);
    return null;
  }
}

async function parseWorkingHoursStringToJSON(hoursString) {
  if (!hoursString) return null;
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "Você é um formatador de horários de funcionamento de restaurantes. Sua tarefa é converter um texto livre contendo horários em um JSON estruturado para toda a semana (monday a sunday). Para cada dia, defina 'isOpen' como true (se houver funcionamento) ou false (se fechado). Em 'slots', adicione objetos contendo 'start' e 'end' no formato 'HH:MM'. Se o local fechar para almoço e reabrir, adicione múltiplos slots. Se não houver horário disponível para um dia ou se ele for fechado, defina 'isOpen': false e 'slots': []." },
        { role: "user", content: `Converta este horário de funcionamento em JSON estruturado:\n\n${hoursString}` }
      ],
      response_format: { type: "json_schema", json_schema: weekScheduleSchema },
      temperature: 0.05
    });
    return parseJSONFromAI(completion.choices[0].message.content);
  } catch (err) {
    console.error('[IA Validadora] Erro ao formatar string de horários:', err.message);
    return null;
  }
}

/**
 * Função para buscar o contexto real do estabelecimento usando Jina AI
 */
async function fetchDuckDuckGoFallback(query) {
  let browser = null;
  try {
    console.log(`🔍 [DuckDuckGo Fallback] Pesquisando: "${query}"...`);
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9'
    });
    
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    await delay(1500);
    
    const results = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.result__body'));
      return links.slice(0, 5).map((el, index) => {
        const titleEl = el.querySelector('.result__title a');
        const snippetEl = el.querySelector('.result__snippet');
        return {
          index,
          title: titleEl ? titleEl.textContent.trim() : '',
          url: titleEl ? titleEl.getAttribute('href') : '',
          snippet: snippetEl ? snippetEl.textContent.trim() : ''
        };
      });
    });
    
    let contextText = '';
    for (const r of results) {
      if (r.url) {
        contextText += `[Link ${r.index}]: ${r.url}\n`;
        contextText += `[Título]: ${r.title}\n`;
        contextText += `[Conteúdo]: ${r.snippet}\n\n`;
      }
    }
    
    if (contextText.trim().length > 0) {
      console.log(`✅ [DuckDuckGo Fallback] Encontrados ${results.length} resultados.`);
      return contextText;
    }
    return null;
  } catch (err) {
    console.error(`❌ Erro no Fallback DuckDuckGo:`, err.message);
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        // Ignora
      }
    }
  }
}

async function fetchBingFallback(query) {
  try {
    console.log(`🔍 [Bing Fallback] Pesquisando: "${query}"...`);
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://www.bing.com/'
      }
    });
    
    if (!response.ok) throw new Error(`Bing status ${response.status}`);
    const html = await response.text();
    
    const urlRegex = /href="https:\/\/www\.bing\.com\/ck\/a\?[^"]*u=([^"&]+)/g;
    let match;
    const results = [];
    let index = 0;
    while ((match = urlRegex.exec(html)) !== null && index < 8) {
      let encodedUrl = match[1];
      encodedUrl = encodedUrl.replace(/&amp;/g, '&');
      
      if (encodedUrl.length > 2) {
        const base64Str = encodedUrl.substring(2);
        try {
          let padded = base64Str;
          while (padded.length % 4 !== 0) padded += '=';
          const decoded = Buffer.from(padded, 'base64').toString('utf8');
          if (decoded.startsWith('http') && !results.some(r => r.url === decoded)) {
            results.push({
              index: index++,
              url: decoded
            });
          }
        } catch (e) {
          // Ignora falha de decodificação
        }
      }
    }
    
    let contextText = '';
    for (const r of results) {
      contextText += `[Link ${r.index}]: ${r.url}\n`;
    }
    
    if (contextText.trim().length > 0) {
      console.log(`✅ [Bing Fallback] Encontrados e decodificados ${results.length} links.`);
      return contextText;
    }
    return null;
  } catch (err) {
    console.error(`❌ Erro no Fallback Bing:`, err.message);
    return null;
  }
}

/**
 * Função para buscar o contexto real do estabelecimento usando Jina AI
 */
async function fetchJinaContext(query) {
  try {
    const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
    const headers = {
      'Accept': 'application/json',
      'X-Retain-Images': 'none'
    };
    
    if (process.env.VITE_JINA_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.VITE_JINA_API_KEY}`;
    }

    const response = await fetch(url, { headers });
    
    if (response.ok) {
      const data = await response.json();
      let contextText = '';
      if (data && data.data) {
        if (Array.isArray(data.data)) {
           data.data.forEach((item, index) => {
             if (index < 5) {
               contextText += `[Link ${index}]: ${item.url}\n`;
               contextText += `[Título]: ${item.title}\n`;
               contextText += `[Conteúdo]: ${item.content ? item.content.substring(0, 1000) : ''}\n\n`;
             }
           });
        } else {
          contextText = data.data.content ? data.data.content.substring(0, 5000) : JSON.stringify(data.data).substring(0, 5000);
        }
      }
      if (contextText.trim().length > 0) {
        return contextText;
      }
    }
    console.error(`[⚠️ ALERTA] Falha ao consultar o Jina AI (status ${response.status}). Acionando Fallback DuckDuckGo...`);
  } catch (e) {
    console.error(`[⚠️ ALERTA] Falha ao consultar o Jina AI: ${e.message}. Acionando Fallback DuckDuckGo...`);
  }
  
  const ddgCtx = await fetchDuckDuckGoFallback(query);
  if (ddgCtx) return ddgCtx;
  
  console.log(`[⚠️ ALERTA] Fallback DuckDuckGo retornou vazio (bloqueio ou captcha). Acionando Fallback Bing...`);
  return await fetchBingFallback(query);
}

// ============================================================
// SCHEMAS SEPARADOS: PASSO 1 (Metadados) e PASSO 2 (Cardápio por lote)
// ============================================================

const daySchema = {
  type: "object",
  properties: {
    isOpen: { type: "boolean" },
    slots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          start: { type: "string" },
          end: { type: "string" }
        },
        required: ["start", "end"],
        additionalProperties: false
      }
    }
  },
  required: ["isOpen", "slots"],
  additionalProperties: false
};

const weekScheduleSchema = {
  name: "week_schedule",
  strict: true,
  schema: {
    type: "object",
    properties: {
      monday: daySchema,
      tuesday: daySchema,
      wednesday: daySchema,
      thursday: daySchema,
      friday: daySchema,
      saturday: daySchema,
      sunday: daySchema
    },
    required: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    additionalProperties: false
  }
};

const metadataSchema = {
  name: "validador_metadados",
  strict: true,
  schema: {
    type: "object",
    properties: {
      nome_validado: { type: "string" },
      instagram_url: { type: ["string", "null"] },
      telefone: { type: ["string", "null"] },
      site_oficial: { type: ["string", "null"] },
      categoria_correta: { type: "string" },
      about: { type: "string" },
      working_hours: { type: ["string", "null"] },
      logo_url: { type: ["string", "null"] },
      cover_url: { type: ["string", "null"] },
      confianca_confirmada: { type: "boolean" },
      motivo_divergencia: { type: ["string", "null"] }
    },
    required: ["nome_validado", "instagram_url", "telefone", "site_oficial", "categoria_correta", "about", "working_hours", "logo_url", "cover_url", "confianca_confirmada", "motivo_divergencia"],
    additionalProperties: false
  }
};

const menuChunkSchema = {
  name: "extrator_cardapio_lote",
  strict: true,
  schema: {
    type: "object",
    properties: {
      categories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category_name: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: ["number", "null"] },
                  description: { type: ["string", "null"] },
                  image_url: { type: ["string", "null"] }
                },
                required: ["name", "price", "description", "image_url"],
                additionalProperties: false
              }
            }
          },
          required: ["category_name", "items"],
          additionalProperties: false
        }
      }
    },
    required: ["categories"],
    additionalProperties: false
  }
};

/**
 * Limpa o texto bruto extraído pelo scraper: remove cabeçalhos/rodapés repetidos,
 * divide em blocos de tela e deduplica telas idênticas.
 */
function cleanAndSplitRawDump(rawText) {
  if (!rawText) return [];
  
  // Separa por marcador de tela
  const screens = rawText.split('--- TELA EXTRAÍDA ---').filter(s => s.trim().length > 100);
  
  const cleanedScreens = screens.map(screen => {
    // Remove lixo repetido de rodapé do LiveMenu e outros sites
    return screen
      .replace(/Seu pedido foi atualizado!.*?Copiar/gs, '')
      .replace(/Falha ao carregar o menu\..*?OK/gs, '')
      .replace(/Mesa fechada com sucesso!.*?Fechar/gs, '')
      .replace(/O pedido não pôde ser aceito\..*?Voltar/gs, '')
      .replace(/Desculpe, o pedido não foi processado.*?compreensão\./gs, '')
      .replace(/Deseja fechar sua parte da conta\?.*?Voltar/gs, '')
      .replace(/OK Nome alterado com sucesso OK/g, '')
      .replace(/Facebook Twitter Whatsapp Copiar/g, '')
      .replace(/\[IMAGEM: https:\/\/livemenu\.app\/assets\/images\/(powered-by-live-menu\.svg|status\/ilustra-erro\.svg|pt-br\.svg|preload\.svg)\]/g, '')
      .replace(/\d+ \d+ \d+ \d+ \d+/g, '') // Remove "0 1 2 3 4" paginação
      .replace(/Confirmar Voltar OK/g, '')
      .replace(/\[IMAGEM: https:\/\/static\.tagme\.com\.br\/pubimg\/thumbs\/admin\/theme\/[^\]]+\]/g, '') // Remove imagens de tema/capa
      .trim();
  });
  
  // Detecta e remove o cabeçalho repetido de forma genérica:
  // Pega os primeiros 200 chars da tela 1, busca o trecho antes de "Leia mais" ou antes do primeiro item de menu
  let headerToRemove = '';
  if (cleanedScreens.length > 1) {
    // Encontra o padrão de cabeçalho: tudo antes da primeira categoria de menu
    const firstScreen = cleanedScreens[0];
    // Procura por "Leia mais" ou padrão de início de cardápio
    const headerEnd = firstScreen.search(/Leia mais|Entradas|Menu|Cardápio|Prato/i);
    if (headerEnd > 100) {
      headerToRemove = firstScreen.substring(0, Math.min(headerEnd + 10, 500));
    }
  }
  
  const dedupedScreens = cleanedScreens.map((screen, idx) => {
    if (idx > 0 && headerToRemove) {
      // Remove cabeçalho repetido em telas subsequentes
      const headerPos = screen.indexOf(headerToRemove.substring(0, 80));
      if (headerPos !== -1 && headerPos < 200) {
        // Encontra onde o cabeçalho termina nesta tela
        const endPos = screen.search(/Leia mais|Entradas|Menu|Cardápio|Prato/i);
        if (endPos > 0) {
          screen = screen.substring(endPos);
        }
      }
    }
    return screen.trim();
  });
  
  // Deduplica telas idênticas (mesma página com scroll diferente)
  // Usa hash dos primeiros 500 chars + últimos 500 chars para detectar duplicatas
  const seen = new Set();
  const uniqueScreens = dedupedScreens.filter(screen => {
    if (screen.length < 50) return false;
    const fingerprint = screen.substring(0, 500) + '|||' + screen.substring(Math.max(0, screen.length - 500));
    if (seen.has(fingerprint)) {
      return false; // Duplicata!
    }
    seen.add(fingerprint);
    return true;
  });
  
  console.log(`[Cleanup] ${screens.length} telas brutas → ${uniqueScreens.length} telas únicas após limpeza e deduplicação`);
  return uniqueScreens;
}

function getChromeLaunchOptions() {
  const fs = require('fs');
  const path = require('path');

  // Carrega variáveis do arquivo .env
  try {
    const dotenvPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(dotenvPath)) {
      const lines = fs.readFileSync(dotenvPath, 'utf-8').split('\n');
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
  } catch (e) {}

  const options = {
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--disable-setuid-sandbox', '--no-sandbox', '--lang=pt-BR']
  };

  const useLocalChrome = true;

  if (useLocalChrome) {
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
          console.log(`💡 [Chrome Launcher] Usando executável local do Chrome (Forçado): ${p}`);
          options.executablePath = p;
          // Deixamos que o Puppeteer crie o perfil temporário por padrão, 
          // evitando que a janela fique escondida em background por estar atrelada a uma instância presa.
          break;
        }
      }
    } else if (process.platform === 'darwin') {
      const p = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      if (fs.existsSync(p)) {
        options.executablePath = p;
      }
    } else if (process.platform === 'linux') {
      const paths = ['/usr/bin/google-chrome', '/usr/bin/chrome'];
      for (const p of paths) {
        if (fs.existsSync(p)) {
          options.executablePath = p;
          break;
        }
      }
    }

    if (!options.executablePath) {
      console.log(`💡 [Chrome Launcher] Google Chrome não encontrado nos caminhos padrão. Tentando channel: 'chrome'...`);
      options.channel = 'chrome';
    }
  } else {
    console.log("💡 [Chrome Launcher] Usando Chromium integrado do Puppeteer (Mesmo comportamento do robô).");
  }

  return options;
}

async function loadInstagramCookies(page) {
  const fs = require('fs');
  const path = require('path');
  const cookiesPath = path.join(__dirname, 'instagram_cookies.json');
  if (fs.existsSync(cookiesPath)) {
    try {
      const cookiesStr = fs.readFileSync(cookiesPath, 'utf-8');
      const cookies = JSON.parse(cookiesStr);
      await page.setCookie(...cookies);
      console.log(`🍪 [Instagram Session] Cookies carregados com sucesso.`);
    } catch (cookieErr) {
      console.warn(`⚠️ [Instagram Session] Falha ao carregar cookies: ${cookieErr.message}`);
    }
  }
}

async function saveInstagramCookies(page) {
  const fs = require('fs');
  const path = require('path');
  try {
    const cookies = await page.cookies();
    const cookiesPath = path.join(__dirname, 'instagram_cookies.json');
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
    console.log(`💾 [Instagram Session] Cookies salvos com sucesso.`);
  } catch (cookieErr) {
    console.warn(`⚠️ [Instagram Session] Erro ao salvar cookies: ${cookieErr.message}`);
  }
}

async function fetchInstagramProfileText(instagramUrl) {
  if (!instagramUrl) return null;
  
  let handle = instagramUrl.trim();
  if (handle.includes('instagram.com/')) {
    const parts = handle.split('instagram.com/');
    if (parts[1]) {
      handle = parts[1].split('?')[0].split('#')[0].replace(/\//g, '').trim();
    }
  }
  handle = handle.replace(/[^a-zA-Z0-9_\.]/g, '');
  if (!handle) return null;
  
  const targetUrl = `https://www.instagram.com/${handle}/`;
  console.log(`📸 [IA Validadora] Acessando perfil do Instagram via Puppeteer: "${targetUrl}"...`);
  
  let browser = null;
  try {
    const puppeteer = require('puppeteer');
    const path = require('path');
    const userDataDir = path.join(__dirname, 'puppeteer_user_data_single');
    
    // Remove SingletonLock anterior do Chrome para garantir que abra visível
    const lockPath = path.join(userDataDir, 'SingletonLock');
    if (fs.existsSync(lockPath)) {
      try {
        fs.unlinkSync(lockPath);
        console.log(`🧹 [IA Validadora] Removido lock de perfil anterior para abrir Chrome visível.`);
      } catch (lockErr) {
        console.warn(`⚠️ [IA Validadora] Falha ao remover SingletonLock (pode estar em uso): ${lockErr.message}`);
      }
    }

    // Abre em modo visível (headless: false) e com executável local do Chrome para permitir login interativo se necessário (sem userDataDir para evitar bloqueio)
    const launchOptions = getChromeLaunchOptions();
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Carrega cookies salvos se existirem
    await loadInstagramCookies(page);
    
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    await delay(3500);
    
    let title = await page.title();
    if (title.includes('não está disponível') || title.includes('not available') || title.includes('Page Not Found')) {
      console.log(`⚠️  O Instagram bloqueou o acesso anônimo ("Perfil não disponível").`);
      console.log(`👉 Redirecionando para a tela de login do Instagram...`);
      await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' });
      await delay(2000);
    }
    
    let currentUrl = page.url();
    if (currentUrl.includes('/accounts/login/') || currentUrl.includes('/login')) {
      console.log(`⏱️  [LOGIN INSTAGRAM DETECTADO]`);
      console.log(`👉 Por favor, faça login na sua conta do Instagram na janela do Chrome aberta na sua tela.`);
      console.log(`⏱️  O robô está pausado e aguardando você concluir o login para continuar...`);
      
      let waitCount = 0;
      // Espera até que a URL mude e não contenha mais login, ou até 5 minutos (300 segundos)
      while ((page.url().includes('/accounts/login/') || page.url().includes('/login')) && waitCount < 300) {
        await delay(1000);
        waitCount++;
      }
      
      if (page.url().includes('/accounts/login/') || page.url().includes('/login')) {
        console.log(`❌ Tempo limite de login esgotado (5 minutos). Prosseguindo com fallback...`);
        return null;
      }
      
      console.log(`✅ Login concluído com sucesso! Recarregando o perfil de "${handle}"...`);
      // Salva os novos cookies da sessão logada
      await saveInstagramCookies(page);
      
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(3500);
    }
    
    // Tenta fechar o popup de login se houver
    try {
      await page.evaluate(() => {
        const svgs = Array.from(document.querySelectorAll('svg'));
        for (const svg of svgs) {
          if (svg.getAttribute('aria-label') === 'Fechar' || svg.getAttribute('aria-label') === 'Close') {
            const btn = svg.closest('button') || svg.closest('[role="button"]');
            if (btn) { btn.click(); return; }
          }
        }
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('fechar') || text.includes('agora não') || text.includes('close') || text.includes('not now')) {
            btn.click();
            return;
          }
        }
      });
      await delay(1000);
    } catch (err) {}
    
    const profileData = await page.evaluate(() => {
      const header = document.querySelector('header');
      const text = header ? header.textContent.trim() : '';
      
      let bioLink = null;
      const anchors = Array.from(document.querySelectorAll('a'));
      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        if (href.includes('l.instagram.com/?u=') || href.includes('l.instagram.com/')) {
          try {
            const urlObj = new URL(href);
            const u = urlObj.searchParams.get('u');
            if (u) { bioLink = decodeURIComponent(u); break; }
          } catch (e) {}
        }
      }
      return { text, bioLink };
    });
    
    let info = `[Perfil Instagram: @${handle}]\n`;
    info += `Título da Página: ${title}\n`;
    if (profileData.text) {
      info += `Conteúdo do Cabeçalho/Bio: ${profileData.text}\n`;
    }
    if (profileData.bioLink) {
      info += `Link na Bio: ${profileData.bioLink}\n`;
    }
    
    console.log(`   ✅ [IA Validadora] Dados do Instagram de @${handle} obtidos.`);
    return info;
  } catch (err) {
    console.error(`   ⚠️ [IA Validadora] Erro ao extrair dados do Instagram:`, err.message);
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

/**
 * Função principal do middleware de validação e enriquecimento
 * ARQUITETURA DE 2 PASSOS:
 *   Passo 1: Validação de metadados (identidade, links, about, horários) — chamada leve
 *   Passo 2: Extração de cardápio em LOTES por bloco de texto — múltiplas chamadas paralelas
 */
async function validarECompletarDados(estabelecimento, dadosColetados) {
  const { name, city, state, address, neighborhood } = estabelecimento;
  
  let googleMapsUrl = '';
  if (dadosColetados.visit_notes) {
    const gmMatch = dadosColetados.visit_notes.match(/Google Maps:\s*(https:\/\/[^\s\n]*)/i);
    if (gmMatch) googleMapsUrl = gmMatch[1];
  }

  console.log(`\n[IA Validadora] Analisando consistência e enriquecendo "${name}"...`);

  let contextoWeb = '';
  let rawMenuDump = ''; // Texto bruto completo do cardápio navegado

  let jinaContext = '';
  if (dadosColetados.googleSearchResults) {
    console.log(`[IA Validadora] Utilizando resultados do Google Nativo fornecidos pela extensão do Chrome.`);
    try {
      const parsedGoogle = JSON.parse(dadosColetados.googleSearchResults);
      jinaContext = `[Resultados do Google Nativo]:\n`;
      for (const item of parsedGoogle) {
        jinaContext += `- Título: ${item.title}\n  URL: ${item.link}\n  Resumo: ${item.snippet}\n\n`;
      }
    } catch(e) {
      console.log(`[IA Validadora] Falha ao parsear resultados do Google Nativo. Usando fallback vazio.`);
    }
  } else if (dadosColetados.browserContext) {
    console.log(`[IA Validadora] Utilizando contexto web do Google Maps pré-coletado pela extensão do navegador.`);
    jinaContext = `[Conteúdo da Página do Google Maps]:\n${dadosColetados.browserContext.substring(0, 8000)}\n\n`;
  } else {
    console.log(`[IA Validadora] Nenhum contexto do Google recebido. Jina/Bing foram desativados a pedido do usuário.`);
    jinaContext = '';
  }
  
  if (dadosColetados.instagramContext) {
    console.log(`[IA Validadora] Utilizando contexto da Bio do Instagram pré-coletado pela extensão.`);
    jinaContext += `[Contexto da Bio do Instagram (${dadosColetados.instagram || 'link'})]:\n${dadosColetados.instagramContext.substring(0, 5000)}\n\n`;
    contextoWeb += `\n[Contexto Instagram]:\n${dadosColetados.instagramContext.substring(0, 5000)}\n`;
  }
  
  // 1.2 Tenta coletar o Instagram via Puppeteer ANTES da Cura, para usar a Bio na Cura (Apenas se a extensão não o fez)
  if (dadosColetados.instagram && !dadosColetados.instagramContext) {
    const instaCtx = await fetchInstagramProfileText(dadosColetados.instagram);
    if (instaCtx) {
      jinaContext = (jinaContext || '') + `\n\n[Contexto da Bio do Instagram (${dadosColetados.instagram})]:\n${instaCtx}`;
      contextoWeb += `\n[Contexto Instagram]:\n${instaCtx}\n`;
    }
  }

  if (jinaContext) {
    contextoWeb += `\n[Resultados do Google e Bio]:\n${jinaContext}\n`;
  } else {
    console.log(`[⚠️ ALERTA] Contexto de pesquisa do Jina AI vazio.`);
  }

  // 1.5. FASE DE DETETIVE (Auto-Cura de Links Falsos)
  if (jinaContext) {
    console.log(`[IA Validadora] Verificando se os links coletados são verdadeiros...`);
    const healPrompt = `Você é um detetive de dados. Seu objetivo é consertar links errados coletados num mapa.
Alvo real: ${name}
Endereço do Alvo (Cadastro Google): ${address || 'Não informado'} - ${neighborhood || ''} - ${city || 'Sem Cidade'}/${state || 'Sem Estado'}
Link do Alvo no Google Maps: ${googleMapsUrl || 'Não fornecido'}

Links Suspeitos Coletados:
- Instagram: ${dadosColetados.instagram || 'Nenhum'}
- Site/Menu: ${dadosColetados.menuSourceUrl || dadosColetados.website || 'Nenhum'}

Resultados reais do Google e da Bio do Instagram sobre a marca:
${jinaContext.substring(0, 5000)}

Tarefa: Verifique se os links suspeitos estão errados/falsos.
Se estiverem errados, procure nos resultados acima os links VERDADEIROS e substitua-os.
REGRAS CRÍTICAS:
1. CONFERÊNCIA DE ENDEREÇO DA BIO (CRÍTICO): Verifique o endereço/cidade na Bio do Instagram. O sistema DEVE conferir se a localização da Bio tem relação com o Endereço do Alvo. Se houver um "Link do Alvo no Google Maps" fornecido e pela URL der para notar que aponta para outra rua/bairro/cidade divergente da Bio (ou vice-versa), ou se a pesquisa web desmentir o local, assuma que o Instagram é falso/impostor. Descarte-o.
2. Se o "Site/Menu" suspeito já for o site oficial da marca (ex: naufrutosdomar.com.br), MANTENHA-O, mesmo que não cite a cidade.
3. NUNCA substitua ou defina um "Site/Menu" com links de: TripAdvisor, iFood, Facebook, Instagram, Google Maps, Yelp, GuiaMais. Estes NÃO SÃO sites/menus.
4. Se o "Site/Menu" estiver vazio ou errado, e você encontrar um link de Cardápio (ex: Linktree, Goomer, LiveMenu, site próprio) na Bio do Instagram (ou seus derivados), use-o como "Site/Menu". NÃO utilize links de cardápio vindos de resultados do Google que não sejam derivados do Instagram. A busca por links de cardápio deve se restringir exclusivamente aos derivados dos links de Instagram.
5. Se não achar o certo, e o suspeito for fraude, retorne null. Se o suspeito for verdadeiro, mantenha-o.

Retorne um JSON rigoroso no formato: {"instagram": "novo_ou_mesmo", "menuSourceUrl": "novo_ou_mesmo", "modificado": true_ou_false}`;
    try {
      const healResponse = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [{ role: "user", content: healPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      });
      const healedData = parseJSONFromAI(healResponse.choices[0].message.content);
      if (!healedData) throw new Error('Retorno vazio ou JSON inválido da IA de Cura.');
      if (healedData.modificado) {
        console.log(`[IA Validadora] 🚨 LINKS CORRIGIDOS! A IA substituiu os links falsos/errados pelos corretos encontrados no Google.`);
        const oldInsta = dadosColetados.instagram;
        if (healedData.instagram !== undefined) dadosColetados.instagram = healedData.instagram;
        if (healedData.menuSourceUrl !== undefined) dadosColetados.menuSourceUrl = healedData.menuSourceUrl;
        
        // Se o Instagram mudou e não está vazio, vamos obter a bio do novo Instagram também
        if (dadosColetados.instagram && dadosColetados.instagram !== oldInsta) {
          const newInstaCtx = await fetchInstagramProfileText(dadosColetados.instagram);
          if (newInstaCtx) {
            contextoWeb += `\n[Contexto do Novo Instagram Corrigido]:\n${newInstaCtx}\n`;
          }
        }
      } else {
        console.log(`[IA Validadora] Links confirmados como verdadeiros na pré-análise.`);
      }
    } catch(e) {
      console.log(`[IA Validadora] Erro na pré-análise de links: ${e.message}`);
    }
  }

  // Tenta extrair do site oficial ou menu usando o novo Agente Puppeteer
  if (dadosColetados.menuSourceUrl && !dadosColetados.menuSourceUrl.includes('tripadvisor') && !dadosColetados.menuSourceUrl.includes('facebook')) {
    const menuUrl = dadosColetados.menuSourceUrl.toLowerCase();
    const isPDF = menuUrl.endsWith('.pdf') || menuUrl.includes('.pdf?') || menuUrl.includes('/pdf/');
    
    if (isPDF) {
      // PDF: Baixa e extrai texto diretamente, sem Puppeteer
      console.log(`[IA Validadora] 📄 URL de PDF detectada! Extraindo texto do PDF diretamente...`);
      try {
        const pdfParse = require('pdf-parse');
        const pdfResponse = await fetch(dadosColetados.menuSourceUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          redirect: 'follow'
        });
        if (pdfResponse.ok) {
          const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
          const pdfData = await pdfParse(pdfBuffer);
          if (pdfData.text && pdfData.text.trim().length > 50) {
            rawMenuDump = pdfData.text;
            contextoWeb += `\n[Texto do Cardápio PDF (${pdfData.numpages} páginas)]:\n${pdfData.text.substring(0, 5000)}\n`;
            console.log(`[IA Validadora] ✅ PDF processado: ${pdfData.text.length} chars, ${pdfData.numpages} páginas`);
          } else {
            console.log(`[IA Validadora] ⚠️ PDF sem texto extraível (imagem escaneada). Sem fallback disponível.`);
          }
        }
      } catch (pdfErr) {
        console.log(`[IA Validadora] ⚠️ Erro ao processar PDF: ${pdfErr.message}. Sem fallback disponível.`);
      }
    } else if (dadosColetados.menuSourceUrl && dadosColetados.menuSourceUrl !== 'null' && dadosColetados.menuSourceUrl !== 'undefined') {
      // Não é PDF e a URL existe: usa o Agente Puppeteer normal
      console.log(`[IA Validadora] Acionando Robô de Navegação Autônoma para vasculhar: ${dadosColetados.menuSourceUrl}...`);
      const { agenticFetch } = require('./agentic_scraper.cjs');
      
      const objective = `Encontrar o cardápio COMPLETO e informações vitais do restaurante "${name}". 
MUITO IMPORTANTE:
1. Se for um Linktree, clique na opção da unidade de ${city} / ${state}.
2. Se você entrar no Cardápio e houver ABAS/CATEGORIAS de navegação (ex: "Menu à La Carte", "Sobremesas", "Bebidas"), você DEVE usar a ação 'extract_and_click' para clicar em CADA UMA DELAS iterativamente e extrair o conteúdo. 
3. NÃO responda com 'found' na primeira tela se houver outras abas visíveis que ainda não foram exploradas. Varre todas as abas principais antes de finalizar!`;
      
      const ctx = await agenticFetch(dadosColetados.menuSourceUrl, objective);
      if (ctx) {
        rawMenuDump = ctx;
        contextoWeb += `\n[Contexto do Site via Agente Autônomo]:\n${ctx}\n`;
      } else {
        console.log(`[⚠️ ALERTA] Agente não encontrou nada na URL. Sem fallback Jina disponível.`);
      }
    } else {
       console.log(`[IA Validadora] Nenhuma URL válida fornecida para extração de cardápio.`);
    }
  }

  // ============================================================
  // PASSO 1: Validação de METADADOS (chamada leve — sem cardápio)
  // ============================================================
  console.log(`[IA Validadora] PASSO 1/2: Validando identidade e metadados...`);
  
  const metadataPrompt = `
  Sua tarefa é VALIDAR a identidade e extrair METADADOS do "Estabelecimento Alvo".
  NÃO extraia cardápio aqui — apenas valide a identidade e preencha os campos de metadados.

  [Estabelecimento Alvo]
  Nome: ${name}
  Endereço Físico: ${address || 'Não informado'}
  Bairro: ${neighborhood || 'Não informado'}
  Cidade/Estado: ${city || 'Não informada'} / ${state || 'Não informado'}
  Link do Google Maps Original: ${googleMapsUrl || 'Não fornecido'}

  [Dados Coletados pelo Robô]
  Instagram: ${dadosColetados.instagram || 'Nenhum'}
  Site/Cardápio: ${dadosColetados.menuSourceUrl || dadosColetados.website || 'Nenhum'}
  Telefone: ${dadosColetados.phone || dadosColetados.telefone || 'Nenhum'}
  Conteúdo Extraído da Página:
  ${dadosColetados.pageContent ? dadosColetados.pageContent.substring(0, 3000) : 'Nenhum conteúdo bruto'}

  [Resultados Reais da Web]
  ${contextoWeb ? contextoWeb.substring(0, 8000) : 'Nenhum contexto web disponível'}

  [Regras]
  1. CRUZAMENTO DE IDENTIDADE DO ESTABELECIMENTO E ENDEREÇO (CRÍTICO): Avalie se o restaurante "Alvo" realmente existe. Se houver "Link do Google Maps Original" disponível, utilize a URL ou os resultados de busca para garantir a localização. Você DEVE conferir se o endereço/cidade que está na Bio do Instagram tem relação com a localização real do Alvo. Se a Bio mencionar um endereço completamente diferente sem relação com a localização oficial do Alvo (exemplo: Alvo é no Bessa, Bio é no Jaguaribe), trata-se de um homônimo e o Instagram é falso.
  2. EXTRAIA OS HORÁRIOS (working_hours): Identifique e descreva resumidamente por extenso os horários de funcionamento do estabelecimento nos resultados de busca ou na página.
  3. DESCRIÇÃO DO RESTAURANTE (about): Você DEVE SEMPRE gerar ou extrair uma descrição em português extremamente curta, direta e atraente (com no MÁXIMO 10 palavras).
  4. Extraia logo_url e cover_url apenas se forem URLs reais no texto.
  5. VALIDAÇÃO E CORREÇÃO DO INSTAGRAM (instagram_url): Analise CUIDADOSAMENTE o Instagram fornecido em "Dados Coletados".
     - **Verificação de Impostores**: Conforme a regra 1, confira expressamente a correspondência de endereço da Bio do Instagram com a real localização do Google. Se o bairro, cidade ou endereço não bater com o Alvo original, é FALSO/IMPOSTOR.
     - **Ação em caso de Falso**: Se o Instagram fornecido for falso, NÃO reprove o restaurante inteiro (mantenha confianca_confirmada=true para a entidade em si, se as outras fontes forem válidas). Ao invés disso, procure nos "Resultados Reais da Web" se existe um link do Instagram que seja o VERDADEIRO.
     - **Regra de Ouro**: Se o link for falso, você JAMAIS deve retorná-lo. Retorne NULL para a propriedade instagram_url se não achar o verdadeiro. Melhor vazio do que outra empresa.
     - **NÃO CONFUNDA NOMES (CRÍTICO)**: Motores de busca frequentemente trazem concorrentes com nomes parecidos (Ex: "A Casa Café" vs "La Casa Café"). Você está ESTRITAMENTE PROIBIDO de substituir o Instagram original por um perfil de nome parecido mas diferente. Se o perfil exato não for encontrado, mantenha o original ou retorne NULL.
  6. Confirme ou corrija telefone e site_oficial com base no cruzamento de dados.
  7. Preencha categoria_correta (ex: "Frutos do Mar", "Pizzaria", "Hambúrgueria").
  `;

  let metadataPayload;
  try {
    const metaCompletion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "Você é um especialista em validação de dados de restaurantes. Foque APENAS em metadados (identidade, links, descrição, horários). NÃO extraia cardápio." },
        { role: "user", content: metadataPrompt }
      ],
      response_format: { type: "json_schema", json_schema: metadataSchema },
      temperature: 0.1,
      max_tokens: 2000
    });
    metadataPayload = parseJSONFromAI(metaCompletion.choices[0].message.content);
    if (!metadataPayload) throw new Error('Retorno vazio ou JSON inválido da IA de Metadados.');
    
    if (metadataPayload.working_hours && typeof metadataPayload.working_hours === 'string') {
      console.log(`[IA Validadora] Formatando texto de horários para JSON estruturado...`);
      const structuredHours = await parseWorkingHoursStringToJSON(metadataPayload.working_hours);
      metadataPayload.working_hours = structuredHours;
    }
  } catch (error) {
    console.error(`[⚠️ ALERTA] Falha na validação de metadados:`, error.message);
    return {
      nome_validado: name,
      instagram_url: dadosColetados.instagram || null,
      telefone: dadosColetados.phone || null,
      site_oficial: dadosColetados.menuSourceUrl || dadosColetados.website || null,
      categoria_correta: "Outros",
      confianca_confirmada: false,
      motivo_divergencia: `Erro interno na OpenAI: ${error.message}`,
      menu_categories: []
    };
  }

  if (!metadataPayload.confianca_confirmada) {
    console.log(`[⚠️ ALERTA] Link ou dados suspeitos! Pertencem a outra marca.`);
    console.log(`[Motivo] ${metadataPayload.motivo_divergencia}`);
    metadataPayload.menu_categories = [];
    return metadataPayload;
  }
  console.log(`[IA Validadora] ✅ Identidade confirmada! Instagram e marca validados.`);

  const isErrorOrDeactivatedPage = (() => {
    if (!rawMenuDump) return true;
    const cleanDump = rawMenuDump.trim();
    if (cleanDump.length < 250) {
      const lower = cleanDump.toLowerCase();
      if (
        lower.includes('not found') || 
        lower.includes('não encontrado') || 
        lower.includes('não disponível') || 
        lower.includes('login • instagram') ||
        lower.includes('error') ||
        lower.includes('deletado') ||
        lower.includes('removed') ||
        lower.includes('manutenção') ||
        lower.includes('agora não')
      ) {
        return true;
      }
      if (cleanDump.length < 150 && !lower.includes('r$') && !/\d+/.test(lower)) {
        return true;
      }
    }
    return false;
  })();

  if (isErrorOrDeactivatedPage) {
    console.log(`[IA Validadora] Sem texto de cardápio válido ou página de erro/desativada detectada.`);
    console.log(`[IA Validadora] Tentando gerar um Cardápio Básico de Fallback usando Resultados da Web...`);
    
    if (contextoWeb && contextoWeb.length > 500) {
      const fallbackPrompt = `Extraia pratos, bebidas ou especialidades mencionadas nestes resultados de busca para montar um cardápio resumido.
      
REGRAS:
1. Retorne apenas pratos REAIS citados nos textos. Se não houver nenhum, retorne categories: [].
2. Agrupe em "Especialidades da Casa" ou categorias lógicas.
3. Preços e imagens serão null.

[TEXTO DOS RESULTADOS DA BUSCA]
${contextoWeb}`;

      try {
        const fallbackCompletion = await openai.chat.completions.create({
          model: MODEL_NAME,
          messages: [
            { role: "system", content: "Você é um extrator de cardápio de fallback. Gere JSON estruturado com os pratos mencionados em reviews/textos." },
            { role: "user", content: fallbackPrompt }
          ],
          response_format: { type: "json_schema", json_schema: menuChunkSchema },
          temperature: 0.1,
          max_tokens: 2000
        });
        const fallbackResult = parseJSONFromAI(fallbackCompletion.choices[0].message.content);
        if (fallbackResult && fallbackResult.categories && fallbackResult.categories.length > 0) {
          metadataPayload.menu_categories = fallbackResult.categories;
          console.log(`[IA Validadora] Fallback: Gerado cardápio resumido com ${fallbackResult.categories.length} categoria(s) a partir de buscas.`);
          return metadataPayload;
        }
      } catch (e) {
        console.error(`[⚠️ ALERTA] Falha ao gerar cardápio de fallback: ${e.message}`);
      }
    }
    
    metadataPayload.menu_categories = [];
    return metadataPayload;
  }

  console.log(`[IA Validadora] PASSO 2/2: Extraindo cardápio completo (${rawMenuDump.length} caracteres brutos)...`);
  
  // Limpa e divide o dump bruto em blocos de tela
  const cleanedScreens = cleanAndSplitRawDump(rawMenuDump);
  console.log(`[IA Validadora] ${cleanedScreens.length} telas limpas encontradas. Processando em lotes...`);

  // Agrupa as telas em lotes de ~15.000 caracteres cada para ficar dentro do limite de saída
  const CHUNK_SIZE = 15000;
  const chunks = [];
  let currentChunk = '';
  
  for (const screen of cleanedScreens) {
    if (currentChunk.length + screen.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = screen;
    } else {
      currentChunk += '\n\n=== PRÓXIMA SEÇÃO DO MENU ===\n\n' + screen;
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  console.log(`[IA Validadora] Dividido em ${chunks.length} lote(s) para extração paralela.`);

  // Processa cada lote em paralelo
  const chunkPromises = chunks.map(async (chunk, idx) => {
    const chunkPrompt = `Extraia TODOS os itens de cardápio/menu do texto abaixo em formato JSON estruturado.
    
REGRAS OBRIGATÓRIAS:
1. Extraia CADA prato/item individualmente com: name, price (número ou null), description (ou null), image_url (ou null).
2. Agrupe por categorias (Entradas, Camarões, Peixes, Massas, Sobremesas, Drinks, Bebidas, Carnes, Kids, etc.).
3. Para image_url: use APENAS URLs que aparecem como [IMAGEM: url] DIRETAMENTE ANTES ou DEPOIS do nome do prato. NUNCA invente URLs.
4. Ignore imagens do cabeçalho/logo/capa do site (URLs com /admin/theme/ ou /Menu/ sem /MenuItem/ ou /Product/).
5. NÃO PULE NENHUM ITEM. Se houver 20 pratos de camarão, TODOS os 20 devem estar no JSON.
6. Preço "Sob consulta" ou ausente = null.
7. REGRA RIGOROSA CONTRA ALUCINAÇÕES: Se o texto do lote não contiver pratos, bebidas ou itens de cardápio reais, ou for apenas texto institucional, aviso de erro ou lixo de layout, retorne o JSON de categorias vazio: {"categories": []}. NUNCA invente, presuma ou alucine dados.

[TEXTO DO CARDÁPIO - LOTE ${idx + 1}/${chunks.length}]
${chunk}`;

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "Você é um extrator de dados de cardápio de restaurante. Sua única tarefa é converter texto bruto em JSON estruturado. Extraia TODOS os itens, sem exceção. Se o texto fornecido não contiver itens de cardápio reais, você DEVE retornar a lista de categorias vazia (categories: []). Jamais invente ou alucine dados." },
          { role: "user", content: chunkPrompt }
        ],
        response_format: { type: "json_schema", json_schema: menuChunkSchema },
        temperature: 0.05,
        max_tokens: 16384
      });
      const result = parseJSONFromAI(completion.choices[0].message.content);
      if (!result) throw new Error('Retorno vazio ou JSON inválido da IA de Cardápios.');
      console.log(`[IA Validadora] Lote ${idx + 1}: ${result.categories.length} categorias extraídas com ${result.categories.reduce((acc, c) => acc + c.items.length, 0)} itens.`);
      return result.categories;
    } catch (err) {
      console.error(`[⚠️] Erro no lote ${idx + 1}: ${err.message}`);
      return [];
    }
  });

  const allChunkResults = await Promise.all(chunkPromises);
  
  // Mescla categorias de todos os lotes (agrupa por nome de categoria)
  const categoryMap = new Map();
  for (const chunkCategories of allChunkResults) {
    for (const cat of chunkCategories) {
      const key = cat.category_name.toLowerCase().trim();
      if (categoryMap.has(key)) {
        // Adiciona itens à categoria existente, evitando duplicatas
        const existing = categoryMap.get(key);
        const existingNames = new Set(existing.items.map(i => i.name.toLowerCase().trim()));
        for (const item of cat.items) {
          if (!existingNames.has(item.name.toLowerCase().trim())) {
            existing.items.push(item);
            existingNames.add(item.name.toLowerCase().trim());
          }
        }
      } else {
        categoryMap.set(key, { category_name: cat.category_name, items: [...cat.items] });
      }
    }
  }

  const mergedCategories = Array.from(categoryMap.values());
  const totalItems = mergedCategories.reduce((acc, c) => acc + c.items.length, 0);
  
  console.log(`[IA Validadora] 🎯 RESULTADO FINAL: ${mergedCategories.length} categorias com ${totalItems} itens TOTAIS.`);

  metadataPayload.menu_categories = mergedCategories;
  return metadataPayload;
}

module.exports = { 
  validarECompletarDados,
  isErrorOrDeactivatedPage: (rawMenuDump) => {
    if (!rawMenuDump) return true;
    const cleanDump = rawMenuDump.trim();
    if (cleanDump.length < 250) {
      const lower = cleanDump.toLowerCase();
      if (
        lower.includes('not found') || 
        lower.includes('não encontrado') || 
        lower.includes('não disponível') || 
        lower.includes('login • instagram') ||
        lower.includes('error') ||
        lower.includes('deletado') ||
        lower.includes('removed') ||
        lower.includes('manutenção') ||
        lower.includes('agora não')
      ) {
        return true;
      }
      if (cleanDump.length < 150 && !lower.includes('r$') && !/\d+/.test(lower)) {
        return true;
      }
    }
    return false;
  }
};
