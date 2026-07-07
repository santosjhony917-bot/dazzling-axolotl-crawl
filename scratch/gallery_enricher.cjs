/**
 * Gallery Enricher Robot (Fase 6: Coleta e Curadoria de Galeria de Fotos via Google)
 * 
 * Busca fotos do estabelecimento no Google (via Google Places API ou Puppeteer fallback),
 * filtra as fotos usando IA de Visão para remover pessoas e imagens ruins,
 * faz o download das 4 melhores e envia para o bucket do Supabase.
 * 
 * Para executar:
 * node scratch/gallery_enricher.cjs --single --id <restaurantId>
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
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

  const useLocalChrome = false;

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
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const MODEL_NAME = process.env.VITE_AI_MODEL || "gpt-4o-mini";

const PLACES_API_KEY = process.env.VITE_GOOGLE_PLACES_API_KEY;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function callOpenAIWithRetry(params, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await openai.chat.completions.create(params);
    } catch (err) {
      const isRateLimit = err.status === 429 || (err.message && err.message.toLowerCase().includes('rate limit'));
      if (isRateLimit && i < retries - 1) {
        console.log(`      ⚠️ Rate limit (429) atingido no OpenAI. Aguardando ${delayMs}ms para tentar novamente (Tentativa ${i+1}/${retries})...`);
        await delay(delayMs);
        delayMs *= 2;
        continue;
      }
      throw err;
    }
  }
}

async function downloadAndUploadImage(url, filePath) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    
    const { data, error } = await supabase.storage
      .from('restaurant-images')
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });
      
    if (error) throw error;
    
    const { data: publicData } = supabase.storage.from('restaurant-images').getPublicUrl(filePath);
    return publicData.publicUrl;
  } catch (err) {
    console.error(`   ⚠️ Erro ao baixar/upload de imagem: ${err.message}`);
    return null;
  }
}

// 1. Método Oficial: Google Places API
async function mediaStatus(restaurantId) {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('image_url, cover_image_url')
    .eq('id', restaurantId)
    .single();
  const { count } = await supabase
    .from('restaurant_gallery')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);
  const galleryCount = Number(count || 0);
  const missing = [];
  if (!String(restaurant?.image_url || '').trim()) missing.push('logo');
  if (!String(restaurant?.cover_image_url || '').trim()) missing.push('capa');
  if (galleryCount < 3) missing.push('galeria_min_3');
  return {
    complete: missing.length === 0,
    missing,
    galleryCount,
    hasLogo: Boolean(String(restaurant?.image_url || '').trim()),
    hasCover: Boolean(String(restaurant?.cover_image_url || '').trim()),
  };
}

async function hasStructuredMenu(restaurantId) {
  const { count, error } = await supabase
    .from('menu_categories')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);
  return !error && Number(count || 0) > 0;
}

async function promoteIfMediaComplete(restaurantId) {
  const status = await mediaStatus(restaurantId);
  const menuReady = await hasStructuredMenu(restaurantId);
  if (!menuReady) return { promoted: false, reason: 'menu_not_ready', mediaStatus: status };
  if (!status.complete) return { promoted: false, reason: `missing_${status.missing.join('_')}`, mediaStatus: status };

  const { error } = await supabase
    .from('restaurants')
    .update({
      ai_validated: true,
      menu_status: 'found',
      menu_status_reason: `Cardapio estruturado e midia minima completa: logo, capa e ${status.galleryCount} fotos de galeria.`,
      menu_last_checked_at: new Date().toISOString(),
    })
    .eq('id', restaurantId);
  if (error) return { promoted: false, reason: error.message, mediaStatus: status };
  return { promoted: true, reason: 'media_gate_complete', mediaStatus: status };
}

async function fetchPhotosFromPlacesAPI(name, city) {
  if (!PLACES_API_KEY) {
    console.log('   ⚠️ Chave do Google Places API não configurada no .env');
    return [];
  }
  
  try {
    const query = `${name} ${city}`;
    console.log(`   🔍 [Places API] Buscando Place ID para: "${query}"...`);
    
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name&key=${PLACES_API_KEY}`;
    const findRes = await fetch(findUrl);
    if (!findRes.ok) throw new Error(`Status ${findRes.status}`);
    const findData = await findRes.json();
    
    if (!findData.candidates || findData.candidates.length === 0) {
      console.log('   ⚠️ Nenhum candidato encontrado no Places API.');
      return [];
    }
    
    const placeId = findData.candidates[0].place_id;
    console.log(`   ✅ Place ID encontrado: ${placeId}. Buscando detalhes...`);
    
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${PLACES_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) throw new Error(`Status ${detailsRes.status}`);
    const detailsData = await detailsRes.json();
    
    const photos = detailsData.result?.photos || [];
    if (photos.length === 0) {
      console.log('   ⚠️ Nenhuma foto associada a este estabelecimento no Places API.');
      return [];
    }
    
    console.log(`   ✅ Encontradas ${photos.length} fotos no Places API. Gerando links...`);
    const urls = photos.slice(0, 12).map(p => {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photoreference=${p.photo_reference}&key=${PLACES_API_KEY}`;
    });
    
    return urls;
  } catch (err) {
    console.error('   ❌ Falha ao buscar fotos via Places API:', err.message);
    return [];
  }
}

// 2. Método Fallback: Puppeteer Scraper
async function fetchPhotosViaPuppeteer(name, city, fetchMenu = false) {
  console.log(`   🌐 [Puppeteer Fallback] Iniciando raspagem manual no Google Maps...`);
  
  const query = `${name} ${city}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  
  let browser = null;
  try {
    const userDataDir = path.join(__dirname, 'puppeteer_user_data_single');
    // Remove SingletonLock anterior do Chrome para garantir que abra visível
    const lockPath = path.join(userDataDir, 'SingletonLock');
    if (fs.existsSync(lockPath)) {
      try {
        fs.unlinkSync(lockPath);
        console.log(`   🧹 [Enriquecedor de Galeria] Removido lock de perfil anterior.`);
      } catch (lockErr) {
        console.warn(`   ⚠️ [Enriquecedor de Galeria] Não foi possível remover SingletonLock: ${lockErr.message}`);
      }
    }
    const launchOptions = getChromeLaunchOptions();
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log(`   🧭 Navegando para a busca no Maps...`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(5000);
    
    // Verifica se caiu em lista ou direto na página do restaurante
    const isList = await page.evaluate(() => {
      return !!document.querySelector('a[href*="/maps/place/"]');
    });
    
    if (isList) {
      console.log(`   🗂️ Resultado de busca em lista. Clicando no primeiro resultado...`);
      await page.click('a[href*="/maps/place/"]');
      await delay(5000);
    }
    
    // Encontra o botão para abrir a galeria de fotos
    console.log(`   📸 Procurando galeria de fotos...`);
    const photoClicked = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button'));
      for (const btn of candidates) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = btn.textContent.toLowerCase();
        const jsaction = btn.getAttribute('jsaction') || '';
        if (
          label.includes('foto') || label.includes('photo') || 
          jsaction.includes('photo') || 
          text.includes('foto') || text.includes('photo') ||
          btn.querySelector('img[src*="photo"]')
        ) {
          btn.click();
          return true;
        }
      }
      
      const firstImage = document.querySelector('button[jsaction*="pane.heroHeaderImage"] img') || document.querySelector('img[src*="googleusercontent.com"]');
      if (firstImage) {
        const btn = firstImage.closest('button');
        if (btn) {
          btn.click();
          return true;
        }
      }
      
      return false;
    });
    
    if (!photoClicked) {
      throw new Error("Não foi possível encontrar o botão da galeria de fotos na página.");
    }
    
    await delay(5000);
    
    // Rola o painel de fotos para carregar mais opções
    console.log(`   📜 Fazendo scroll no painel de fotos para carregar mais opções...`);
    for (let s = 0; s < 5; s++) {
      await page.evaluate(() => {
        const scrollableDivs = Array.from(document.querySelectorAll('div.m6QErb, div[role="grid"], div[jsaction*="scroll"]'));
        for (const div of scrollableDivs) {
          if (div.scrollHeight > div.clientHeight) {
            div.scrollTop = div.scrollHeight;
          }
        }
      });
      await delay(1500);
    }
    
    // Extrai as URLs das imagens da galeria
    console.log(`   🔗 Extraindo links das imagens da galeria...`);
    const scrapedUrls = await page.evaluate(() => {
      const list = [];
      
      // 1. Tags IMG
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        if (src.includes('googleusercontent.com') || src.includes('streetviewpixels')) {
          // Ignora fotos de perfil de usuários do Google (contêm /a-/ ou /a/ no path)
          if (!src.includes('/a-/') && !src.includes('/a/')) {
            if (!list.includes(src)) list.push(src);
          }
        }
      });
      
      // 2. Tags DIV com background-image
      document.querySelectorAll('div').forEach(div => {
        const style = div.getAttribute('style') || '';
        if (style.includes('background-image')) {
          const match = style.match(/url\("?([^"]+)"?\)/);
          if (match) {
            const url = match[1];
            if (url.includes('googleusercontent.com') || url.includes('streetviewpixels')) {
              // Ignora fotos de perfil de usuários do Google (contêm /a-/ ou /a/ no path)
              if (!url.includes('/a-/') && !url.includes('/a/')) {
                if (!list.includes(url)) list.push(url);
              }
            }
          }
        }
      });
      
      return list;
    });
    
    // Normaliza para alta resolução e remove duplicados reais (causados por tamanhos diferentes no Maps)
    const uniqueHighRes = [];
    for (const url of scrapedUrls) {
      let clean = url.trim();
      if (clean.includes('googleusercontent.com')) {
        if (clean.includes('=')) {
          clean = clean.split('=')[0] + '=w1000-h800-k-no';
        } else {
          clean = clean + '=w1000-h800-k-no';
        }
      }
      if (clean.startsWith('http') && !uniqueHighRes.includes(clean)) {
        uniqueHighRes.push(clean);
      }
    }
    
    const highResUrls = uniqueHighRes.slice(0, 12);
    console.log(`   ✅ Raspadas ${highResUrls.length} fotos únicas de galeria de alta resolução.`);
    
    let menuUrls = [];
    if (fetchMenu) {
      console.log(`   📸 Alternando para a aba 'Menu'/'Cardápio' para coletar fotos do cardápio...`);
      const menuTabClicked = await page.evaluate(() => {
        const robustTab = document.querySelector('button[aria-label*="Menu"], button[aria-label*="Cardápio"], button[jsaction*="pane.focusandflyout"]');
        if (robustTab) {
           robustTab.click();
           return true;
        }
        const tabs = Array.from(document.querySelectorAll('button'));
        const tab = tabs.find(t => {
          const txt = t.textContent.trim().toLowerCase();
          return txt === 'menu' || txt === 'cardápio';
        });
        if (tab) {
          tab.click();
          return true;
        }
        return false;
      });
      
      if (menuTabClicked) {
        console.log(`   ✅ Alternado para aba 'Menu'/'Cardápio'.`);
        await delay(4000);
      } else {
        console.log(`   ⚠️ Não foi possível encontrar a aba 'Menu'/'Cardápio'. Usando fotos da galeria geral.`);
      }

      // Clica na primeira foto do grid para abrir o visualizador em tela cheia (slideshow)
      console.log("   📸 Clicando na primeira foto para abrir visualizador...");
      const firstPhotoClicked = await page.evaluate(() => {
        const link = document.querySelector('a.Wry4Ob');
        if (link) {
          link.click();
          return true;
        }
        const img = document.querySelector('img[src*="googleusercontent.com/p/"]');
        if (img) {
          img.click();
          return true;
        }
        return false;
      });
      
      if (firstPhotoClicked) {
        await delay(5000); // Aguarda carregar o visualizador
        
        console.log("   🔄 Iniciando loop no visualizador de fotos para filtrar por data (limite de 12 meses)...");
        const recentMenuUrls = [];
        let previousUrl = null;
        let consecutiveDuplicatedUrls = 0;
        
        // Escaneia até 20 fotos no total, ou até achar 4 fotos válidas recentes, ou se o botão Next não funcionar
        for (let i = 0; i < 20; i++) {
          const data = await page.evaluate(() => {
            // 1. Encontra a imagem principal no visualizador
            let imgUrl = null;
            const viewerImages = Array.from(document.querySelectorAll('img[src*="googleusercontent.com"]'));
            const mainImg = viewerImages.find(img => img.offsetWidth > 300 || img.offsetHeight > 300);
            if (mainImg) {
              imgUrl = mainImg.src;
            } else if (viewerImages.length > 0) {
              imgUrl = viewerImages[0].src;
            }
            
            // 2. Encontra a data da foto
            let dateText = null;
            const lg5SpSpans = Array.from(document.querySelectorAll('span.lg5Sp'));
            if (lg5SpSpans.length > 0) {
              dateText = lg5SpSpans[0].textContent.trim();
            }
            
            if (!dateText) {
              const candidates = Array.from(document.querySelectorAll('span, div'));
              for (const el of candidates) {
                const txt = el.textContent.trim();
                if (txt.length > 0 && txt.length < 50) {
                  const lower = txt.toLowerCase();
                  if (
                    (lower.includes('há') && (lower.includes('ano') || lower.includes('mês') || lower.includes('mes') || lower.includes('dia') || lower.includes('semana') || lower.includes('hora') || lower.includes('minuto'))) ||
                    (lower.includes('ago') && (lower.includes('year') || lower.includes('month') || lower.includes('day') || lower.includes('week') || lower.includes('hour') || lower.includes('minute')))
                  ) {
                    dateText = txt;
                    break;
                  }
                }
              }
            }
            
            // 3. Clica no botão Seguinte para a próxima iteração
            const nextBtn = document.querySelector('button[jsaction*="next"]') || 
                            document.querySelector('button[aria-label="Seguinte"]') || 
                            document.querySelector('button[aria-label*="next"]') ||
                            document.querySelector('button[aria-label*="Next"]') ||
                            document.querySelector('button.w6728d[aria-label*="Seguinte"]') ||
                            document.querySelector('button.w6728d[aria-label*="next"]');
                            
            let clickedNext = false;
            if (nextBtn) {
              nextBtn.click();
              clickedNext = true;
            }
            
            return { imgUrl, dateText, clickedNext };
          });
          
          if (!data.imgUrl) {
            console.log(`      ⚠️ [Foto ${i+1}] Não foi possível obter URL da imagem. Pulando...`);
            if (!data.clickedNext) break;
            await delay(2500);
            continue;
          }
          
          // Verifica se a URL da imagem é a mesma da anterior (fim da lista de fotos)
          if (data.imgUrl === previousUrl) {
            consecutiveDuplicatedUrls++;
            if (consecutiveDuplicatedUrls >= 3) {
              console.log(`      🏁 Chegou ao final das fotos (URL repetida 3 vezes). Parando.`);
              break;
            }
          } else {
            consecutiveDuplicatedUrls = 0;
          }
          previousUrl = data.imgUrl;
          
          // Limpa e normaliza a URL
          let cleanUrl = data.imgUrl.trim();
          if (cleanUrl.includes('googleusercontent.com')) {
            if (cleanUrl.includes('=')) {
              cleanUrl = cleanUrl.split('=')[0] + '=w1000-h1000-k-no';
            } else {
              cleanUrl = cleanUrl + '=w1000-h1000-k-no';
            }
          }
          
          // Verifica se é recente (dentro dos 12 meses)
          const isRecent = (() => {
            if (!data.dateText) return false; // Descarte se a data for desconhecida
            const lower = data.dateText.toLowerCase();
            
            // Rejeita anos
            if (lower.includes('ano') || lower.includes('year')) {
              return false;
            }
            
            const recentKeywords = [
              'dia', 'semana', 'mês', 'mes', 'hora', 'minuto', 'segundo',
              'day', 'week', 'month', 'hour', 'minute', 'second',
              'ontem', 'yesterday', 'agora', 'now'
            ];
            
            const hasKeyword = recentKeywords.some(kw => lower.includes(kw));
            if (!hasKeyword) return false;
            
            const match = lower.match(/(\d+)\s*(mes|mês|month)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > 12) return false;
            }
            
            return true;
          })();
          
          if (isRecent) {
            if (!recentMenuUrls.includes(cleanUrl)) {
              recentMenuUrls.push(cleanUrl);
              console.log(`      ✅ [Foto ${i+1}] Aceita (Recente: "${data.dateText}"): ${cleanUrl.substring(0, 70)}...`);
            }
          } else {
            console.log(`      ❌ [Foto ${i+1}] Descartada (Antiga ou Desconhecida: "${data.dateText}"): ${cleanUrl.substring(0, 70)}...`);
          }
          
          // Se já coletamos 4 fotos recentes válidas, podemos parar
          if (recentMenuUrls.length >= 4) {
            console.log(`      🎯 Coletou as 4 fotos válidas necessárias.`);
            break;
          }
          
          if (!data.clickedNext) {
            console.log(`      ⚠️ Botão Seguinte não disponível. Parando.`);
            break;
          }
          
          await delay(2500);
        }
        
        menuUrls = recentMenuUrls;
        console.log(`   ✅ Encontradas ${menuUrls.length} fotos do cardápio físico recentes (últimos 12 meses) no Google Maps.`);
      } else {
        console.log(`   ⚠️ Não foi possível abrir o visualizador de fotos.`);
      }
    }
    
    return { galleryUrls: highResUrls, menuUrls };
  } catch (err) {
    console.error('   ❌ Falha ao raspar fotos via Puppeteer:', err.message);
    return { galleryUrls: [], menuUrls: [] };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error('   ⚠️ Erro ao fechar o navegador:', closeErr.message);
      }
    }
  }
}

// 3. IA de Visão para Curadoria de Fotos (GPT-4o-mini)
async function selectBestPhotosWithAI(urls) {
  if (urls.length === 0) return [];
  console.log(`   🤖 [IA de Visão] Enviando ${urls.length} fotos para curadoria...`);
  
  try {
    const messages = [
      {
        role: "system",
        content: "Você é um assistente especializado em curadoria visual de alta qualidade para restaurantes premium. Sua tarefa é analisar as imagens fornecidas e selecionar as 4 melhores e mais belas imagens que representam pratos de comida, bebidas ou o ambiente físico do local (fachada, salão interno, decoração). REGRAS RÍGIDAS DE ESTÉTICA E SELEÇÃO:\n1. Não escolha de forma alguma fotos que tenham pessoas visíveis (clientes, garçons, rostos, corpos, selfies, grupos de pessoas, etc.).\n2. Não escolha fotos desfocadas, escuras, com reflexos ruins, capturas de tela (screenshots), cardápios, ou panfletos promocionais/logos com texto.\n3. Priorize o maior apelo visual possível (fotos 'instagramáveis'): iluminação excelente, cores vibrantes, pratos bem montados e apetitosos, sem comida mordida ou mesas bagunçadas.\n4. Para ambientes, prefira ângulos amplos, limpos e bem iluminados que transmitam uma atmosfera aconchegante ou moderna.\n5. Evite fotos amadoras; escolha aquelas que pareçam ter sido tiradas por um fotógrafo profissional.\n6. Retorne APENAS um objeto JSON válido contendo a lista dos índices das imagens selecionadas (0-indexed). Exemplo de retorno: {\"selectedIndices\": [0, 2, 5, 7]}"
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analise rigorosamente as seguintes imagens e retorne os índices das 4 fotos mais esteticamente atraentes e de maior qualidade que cumprem as regras no formato JSON." },
          ...urls.flatMap((url, idx) => [
            { type: "text", text: `Imagem índice ${idx}:` },
            { type: "image_url", image_url: { url } }
          ])
        ]
      }
    ];

    const completion = await callOpenAIWithRetry({
      model: MODEL_NAME,
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const indices = result.selectedIndices || [];
    
    console.log(`   ✅ IA de Visão selecionou as fotos nos índices:`, indices);
    
    const selectedUrls = indices.map(idx => urls[idx]).filter(Boolean);
    return selectedUrls.slice(0, 4);
  } catch (err) {
    console.error('   ❌ Falha na curadoria de fotos via IA:', err.message);
    // Em caso de erro, retorna as 4 primeiras como fallback
    return urls.slice(0, 4);
  }
}

// 4. Verificação se o restaurante precisa de cardápio com preços
async function checkIfNeedMenu(restaurantId) {
  try {
    const { data: categories, error } = await supabase
      .from('menu_categories')
      .select('id, name, menu_items(id, name, price)')
      .eq('restaurant_id', restaurantId);
      
    if (error) {
      console.error('   ⚠️ Erro ao verificar cardápio no Supabase:', error.message);
      return true;
    }
    
    if (!categories || categories.length === 0) return true;
    
    let totalItems = 0;
    let pricedItems = 0;
    
    for (const cat of categories) {
      const items = cat.menu_items || [];
      totalItems += items.length;
      pricedItems += items.filter(i => i.price !== null && i.price > 0).length;
    }
    
    if (totalItems === 0) return true;
    
    const pricedRatio = pricedItems / totalItems;
    console.log(`   📊 Verificação de Cardápio: ${pricedItems}/${totalItems} pratos com preços (${Math.round(pricedRatio * 100)}%).`);
    
    // Se menos de 20% dos itens têm preço, precisamos de um cardápio com preços
    return pricedRatio < 0.2;
  } catch (err) {
    console.error('   ⚠️ Falha ao verificar cardápio:', err.message);
    return true;
  }
}

// 5. IA de Visão para Extração de Cardápio (OCR)
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
                  description: { type: ["string", "null"] }
                },
                required: ["name", "price", "description"],
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

async function extractMenuFromPhotosWithAI(restaurantId, urls) {
  if (!urls || urls.length === 0) return null;
  console.log(`   🤖 [IA de Visão] Processando ${urls.length} fotos do cardápio físico individualmente para OCR e extração...`);
  
  const allCategories = [];
  
  for (let idx = 0; idx < urls.length; idx++) {
    const url = urls[idx];
    console.log(`      📸 [IA de Visão] Processando imagem de cardápio ${idx + 1}/${urls.length}...`);
    try {
      const messages = [
        {
          role: "system",
          content: "Você é um extrator de cardápios especializado de alta precisão. Sua tarefa é analisar as imagens do cardápio físico e extrair todos os pratos/bebidas com preços e categorias em formato JSON. Seja extremamente preciso nos nomes e preços. REGRA RIGOROSA CONTRA ALUCINAÇÕES: Se a foto não contiver um cardápio legível, contiver fotos de pessoas, decoração, pratos prontos (sem texto/preço) ou qualquer outra imagem que não seja um cardápio com itens e preços, você DEVE retornar a lista de categorias vazia: {\"categories\": []}. Jamais invente ou alucine dados."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Por favor, analise a foto do cardápio físico anexada e extraia todos os itens estruturados em JSON.
REGRAS OBRIGATÓRIAS:
1. Agrupe os itens em categorias claras em português (ex: Entradas, Sucos, Bebidas, Cervejas, Drinks, Pratos Principais, Sobremesas, etc.).
2. Para cada item individual, forneça:
   - "name": o nome exato do prato/bebida.
   - "price": o preço em formato de número decimal (ex: 29.90). Se não houver preço visível de forma alguma, use null.
   - "description": ingredientes ou detalhes descritos, ou null.
3. Se um item tiver tamanhos ou opções com preços diferentes (ex: Suco Copo R$ 8,00, Suco Jarra R$ 18,00), extraia-os como itens separados.
4. Extraia o máximo de itens que conseguir visualizar de forma legível. Ignore apenas textos incompreensíveis.
5. REGRA RIGOROSA CONTRA ALUCINAÇÕES: Se a foto não mostrar de fato um cardápio de restaurante com pratos/bebidas e preços legíveis (ex: for foto do local, pratos montados sem preços, pessoas, paisagens, fachadas), você DEVE retornar a lista de categorias vazia: {"categories": []}. Nunca invente itens ou pratos.`
            },
            {
              type: "image_url",
              image_url: { url }
            }
          ]
        }
      ];

      const completion = await callOpenAIWithRetry({
        model: MODEL_NAME,
        messages: messages,
        response_format: { type: "json_schema", json_schema: menuChunkSchema },
        temperature: 0.1,
        max_tokens: 4096
      });

      const result = JSON.parse(completion.choices[0].message.content);
      const categories = result.categories || [];
      console.log(`      ✅ [IA de Visão] Extraídas ${categories.length} categorias da imagem ${idx + 1}.`);
      
      // Mescla com as categorias já extraídas das fotos anteriores
      for (const cat of categories) {
        const normalizedCatName = cat.category_name.trim().toLowerCase();
        let existing = allCategories.find(c => c.category_name.trim().toLowerCase() === normalizedCatName);
        
        if (existing) {
          // Mescla itens sem duplicar nomes idênticos
          for (const item of cat.items) {
            const normalizedItemName = item.name.trim().toLowerCase();
            const alreadyExists = existing.items.some(it => it.name.trim().toLowerCase() === normalizedItemName);
            if (!alreadyExists) {
              existing.items.push(item);
            }
          }
        } else {
          // Cria uma nova cópia estruturada para não modificar referências compartilhadas indesejadas
          allCategories.push({
            category_name: cat.category_name,
            items: [...cat.items]
          });
        }
      }
    } catch (err) {
      console.error(`      ❌ Falha ao extrair cardápio da foto ${idx + 1}:`, err.message);
    }
  }
  
  return allCategories;
}

// 6. Salvamento de Cardápio no Supabase
async function saveMenuToSupabase(restaurantId, menuCategories) {
  if (!menuCategories || menuCategories.length === 0) return;
  console.log(`   📡 Salvando cardápio extraído no Supabase (${menuCategories.length} categorias)...`);
  
  try {
    // 1. Limpa o cardápio antigo
    const { error: delError } = await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId);
    if (delError) throw delError;
    
    // 2. Insere as novas categorias e pratos
    let orderIdx = 0;
    for (const cat of menuCategories) {
      if (!cat.items || cat.items.length === 0) continue;
      
      const { data: catData, error: catError } = await supabase
        .from('menu_categories')
        .insert([{ restaurant_id: restaurantId, name: cat.category_name, order_index: orderIdx++ }])
        .select()
        .single();
        
      if (catError) {
        console.error(`      ⚠️ Erro ao inserir categoria "${cat.category_name}":`, catError.message);
        continue;
      }
      
      const itemsToInsert = cat.items.map(item => ({
        category_id: catData.id,
        name: item.name,
        price: item.price || 0,
        description: item.description || '',
        image_url: null
      }));
      
      const { error: itemsError } = await supabase.from('menu_items').insert(itemsToInsert);
      if (itemsError) {
        console.error(`      ⚠️ Erro ao inserir itens na categoria "${cat.category_name}":`, itemsError.message);
      }
    }
    console.log(`   ✅ Cardápio físico extraído e salvo com sucesso!`);
  } catch (err) {
    console.error('   ❌ Falha ao salvar cardápio no Supabase:', err.message);
  }
}

async function run() {
  console.log(`\n=============================================================`);
  console.log(`📸 GALLERY ENRICHER: CURADORIA DE GALERIA E CARDÁPIO VIA IA`);
  console.log(`=============================================================\n`);

  const args = process.argv.slice(2);
  const singleIdx = process.argv.indexOf('--single');
  const idIdx = process.argv.indexOf('--id');
  let targetId = null;
  
  if (singleIdx !== -1 && idIdx !== -1 && idIdx + 1 < process.argv.length) {
    targetId = process.argv[idIdx + 1];
  }

  if (!targetId) {
    console.error('❌ ID do restaurante não fornecido.');
    process.exit(1);
  }

  const highlightsIdx = process.argv.indexOf('--instagram-highlights-file');
  let highlightUrls = [];
  if (highlightsIdx !== -1 && highlightsIdx + 1 < process.argv.length) {
    const highlightsFile = process.argv[highlightsIdx + 1];
    if (fs.existsSync(highlightsFile)) {
      try {
        highlightUrls = JSON.parse(fs.readFileSync(highlightsFile, 'utf-8'));
        console.log(`   📸 [Destaques Instagram] Carregados ${highlightUrls.length} links de destaques do arquivo temporário.`);
        try { fs.unlinkSync(highlightsFile); } catch(e){}
      } catch (err) {
        console.error('   ⚠️ Erro ao carregar arquivo de destaques:', err.message);
      }
    }
  }

  console.log(`📡 Carregando restaurante ID ${targetId} do Supabase...`);
  const { data: rest, error } = await supabase.from('restaurants').select('*').eq('id', targetId).single();
  
  if (error || !rest) {
    console.error(`❌ Restaurante não encontrado no banco:`, error?.message);
    process.exit(1);
  }

  console.log(`📍 Restaurante selecionado: "${rest.name}" em ${rest.city}/${rest.state}`);

  const needMenu = await checkIfNeedMenu(rest.id);
  let candidateUrls = [];
  let menuPhotoUrls = [];

  if (needMenu) {
    console.log(`   📝 Cardápio com preços ausente no Supabase. Forçando Puppeteer para coletar fotos do cardápio...`);
    const result = await fetchPhotosViaPuppeteer(rest.name, rest.city, true);
    candidateUrls = result.galleryUrls || [];
    menuPhotoUrls = result.menuUrls || [];
  } else {
    // Tenta primeiro via Places API oficial
    candidateUrls = await fetchPhotosFromPlacesAPI(rest.name, rest.city);
    // Fallback para Puppeteer se falhar
    if (candidateUrls.length === 0) {
      const result = await fetchPhotosViaPuppeteer(rest.name, rest.city, false);
      candidateUrls = result.galleryUrls || [];
    }
  }

  if (candidateUrls.length === 0) {
    console.log('❌ Nenhuma foto do estabelecimento pôde ser encontrada no Google.');
    console.log(`RESULT:{"success":false,"error":"Nenhuma foto encontrada no Google."}`);
    return;
  }

  // Faz a curadoria de fotos usando IA de visão
  const bestUrls = await selectBestPhotosWithAI(candidateUrls);
  console.log(`✨ Curadoria de fotos concluída. Baixando e enviando ${bestUrls.length} fotos para o Supabase...`);

  // Deleta a galeria anterior para substituir pela nova limpa
  await supabase.from('restaurant_gallery').delete().eq('restaurant_id', rest.id);

  let insertedCount = 0;
  const insertedUrls = [];
  for (let i = 0; i < bestUrls.length; i++) {
    const url = bestUrls[i];
    const filePath = `gallery/${rest.id}/photo_${i + 1}_${Date.now()}.jpg`;
    
    console.log(`   [${i+1}/${bestUrls.length}] Baixando e enviando para o storage...`);
    const publicUrl = await downloadAndUploadImage(url, filePath);
    
    if (publicUrl) {
      const { error: dbErr } = await supabase
        .from('restaurant_gallery')
        .insert([{
          restaurant_id: rest.id,
          image_url: publicUrl,
          caption: 'Foto do Estabelecimento',
          order_index: i
        }]);
        
      if (!dbErr) {
        insertedCount++;
        insertedUrls.push(publicUrl);
      } else {
        console.error('      ⚠️ Erro ao inserir na tabela de galeria:', dbErr.message);
      }
    }
  }

  // Se coletou fotos do cardápio e precisa processar
  if (!String(rest.cover_image_url || '').trim() && insertedUrls[0]) {
    await supabase
      .from('restaurants')
      .update({ cover_image_url: insertedUrls[0] })
      .eq('id', rest.id);
  }

  const allMenuUrls = [...menuPhotoUrls, ...highlightUrls];
  if (allMenuUrls.length > 0) {
    console.log(`✨ Fotos do cardápio prontas (${menuPhotoUrls.length} do Google, ${highlightUrls.length} do Instagram). Iniciando OCR e extração...`);
    const extractedCategories = await extractMenuFromPhotosWithAI(rest.id, allMenuUrls);
    if (extractedCategories && extractedCategories.length > 0) {
      await saveMenuToSupabase(rest.id, extractedCategories);
    }
  }

  const promotion = await promoteIfMediaComplete(rest.id);

  console.log(`\n🎉 Processo concluído! ${insertedCount} fotos salvas na galeria do restaurante.`);
  console.log(`RESULT:${JSON.stringify({ success: true, message: `Galeria de fotos enriquecida com ${insertedCount} fotos.`, promotion })}`);
}

if (require.main === module) {
  run();
} else {
  module.exports = { extractMenuFromPhotosWithAI, saveMenuToSupabase };
}
