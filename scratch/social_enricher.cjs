const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
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

const JSON_PATH = path.join(__dirname, '../scraped_restaurants_google.json');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function navigateWithRetry(page, url, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await delay(1500);
      return true;
    } catch (err) {
      console.log(`   ⚠️ Tentativa ${attempt}/${maxRetries} falhou: ${err.message}`);
      if (attempt >= maxRetries) return false;
    }
  }
  return false;
}

async function extractOpeningHoursFromPage(page, dayMap) {
  return await page.evaluate((dayMapping) => {
    const isAlreadyExpanded = (() => {
      const tbl = document.querySelector('table.e25n6b') || document.querySelector('table[class*="hours"]');
      if (!tbl) return false;
      return tbl.querySelectorAll('tr').length > 2;
    })();

    if (!isAlreadyExpanded) {
      const candidates = Array.from(document.querySelectorAll('div, button, span'));
      for (const el of candidates) {
        const text = el.textContent.trim().toLowerCase();
        if ((text.includes('aberto') || text.includes('fechado') || text.includes('fecha às') || text.includes('horários') || text.includes('expediente') || text.includes('schedule')) &&
            (el.querySelector('img[src*="clock"]') || el.className?.includes('hours') || el.closest('[data-item-id="oh"]'))) {
          const clickable = el.closest('button') || el.closest('div[role="button"]') || el.querySelector('button') || el;
          clickable.click();
          break;
        }
      }
    }

    const tempHours = {};
    Object.values(dayMapping).forEach(day => {
      tempHours[day] = { isOpen: false, slots: [] };
    });

    let foundAny = false;
    const hoursTable = (() => {
      const tables = Array.from(document.querySelectorAll('table'));
      for (const tbl of tables) {
        const text = tbl.textContent.toLowerCase();
        const hasDay = Object.keys(dayMapping).some(day => text.includes(day));
        if (hasDay) return tbl;
      }
      return null;
    })();

    if (hoursTable) {
      const rows = Array.from(hoursTable.querySelectorAll('tr'));
      rows.forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        let dayCell = null;
        let timeCell = null;

        cells.forEach(td => {
          const text = td.textContent.trim().toLowerCase();
          let isDay = false;
          for (const key of Object.keys(dayMapping)) {
            if (text.startsWith(key)) { isDay = true; break; }
          }
          if (isDay) {
            dayCell = td;
          } else if (text.match(/\d/) || text.includes('fechado') || text.includes('closed') || text.includes('24')) {
            timeCell = td;
          }
        });

        if (dayCell && timeCell) {
          const dayRaw = dayCell.textContent.toLowerCase().trim();
          const timeRaw = timeCell.textContent.trim();

          let targetDay = null;
          for (const [key, val] of Object.entries(dayMapping)) {
            if (dayRaw.startsWith(key)) { targetDay = val; break; }
          }

          if (targetDay) {
            foundAny = true;
            if (timeRaw.toLowerCase().includes('fechado') || timeRaw.toLowerCase().includes('closed')) {
              tempHours[targetDay] = { isOpen: false, slots: [] };
            } else if (timeRaw.toLowerCase().includes('24 horas') || timeRaw.toLowerCase().includes('24h') || timeRaw.toLowerCase().includes('24 hours')) {
              tempHours[targetDay] = { isOpen: true, slots: [{ start: '00:00', end: '23:59' }] };
            } else {
              const slots = timeRaw.split(/[,;]/).map(s => {
                const times = s.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi);
                if (times && times.length === 2) {
                  const formatTime = (t) => {
                    let cleanT = t.trim().toUpperCase();
                    const isPM = cleanT.includes('PM');
                    const isAM = cleanT.includes('AM');
                    cleanT = cleanT.replace('AM', '').replace('PM', '').trim();
                    const parts = cleanT.split(':');
                    let hours = parseInt(parts[0], 10);
                    let minutes = parseInt(parts[1], 10);
                    if (isPM && hours < 12) hours += 12;
                    if (isAM && hours === 12) hours = 0;
                    const pad = (num) => String(num).padStart(2, '0');
                    return `${pad(hours)}:${pad(minutes)}`;
                  };
                  return { start: formatTime(times[0]), end: formatTime(times[1]) };
                }
                return null;
              }).filter(Boolean);
              tempHours[targetDay] = { isOpen: slots.length > 0, slots };
            }
          }
        }
      });
    }

    if (!foundAny) {
      const allElements = Array.from(document.querySelectorAll('div, span, p, tr, li'));
      for (const el of allElements) {
        const text = el.textContent.trim();
        if (!text || text.length > 150) continue;
        const lowerText = text.toLowerCase();
        for (const [key, val] of Object.entries(dayMapping)) {
          if (lowerText.startsWith(key) && (lowerText.includes(':') || lowerText.includes('–') || lowerText.includes('-') || lowerText.includes('fechado') || lowerText.includes('closed'))) {
            let timePart = text.substring(key.length).replace(/^[:\s\-–—]+/, '').trim();
            if (timePart && timePart.length > 2) {
              foundAny = true;
              if (timePart.toLowerCase().includes('fechado') || timePart.toLowerCase().includes('closed')) {
                tempHours[val] = { isOpen: false, slots: [] };
              } else if (timePart.toLowerCase().includes('24 horas') || timePart.toLowerCase().includes('24h') || timePart.toLowerCase().includes('24 hours')) {
                tempHours[val] = { isOpen: true, slots: [{ start: '00:00', end: '23:59' }] };
              } else {
                const slots = timePart.split(/[,;]/).map(s => {
                  const times = s.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi);
                  if (times && times.length === 2) {
                    const formatTime = (t) => {
                      let cleanT = t.trim().toUpperCase();
                      const isPM = cleanT.includes('PM');
                      const isAM = cleanT.includes('AM');
                      cleanT = cleanT.replace('AM', '').replace('PM', '').trim();
                      const parts = cleanT.split(':');
                      let hours = parseInt(parts[0], 10);
                      let minutes = parseInt(parts[1], 10);
                      if (isPM && hours < 12) hours += 12;
                      if (isAM && hours === 12) hours = 0;
                      const pad = (num) => String(num).padStart(2, '0');
                      return `${pad(hours)}:${pad(minutes)}`;
                    };
                    return { start: formatTime(times[0]), end: formatTime(times[1]) };
                  }
                  return null;
                }).filter(Boolean);
                tempHours[val] = { isOpen: slots.length > 0, slots };
              }
            }
          }
        }
      }
    }

    return foundAny ? { openingHours: tempHours } : null;
  }, dayMap);
}


function extractPhoneFromWhatsapp(url) {
  if (!url) return null;
  let phoneDigits = '';
  
  if (url.includes('wa.me/')) {
    const parts = url.split('wa.me/');
    if (parts[1]) {
      phoneDigits = parts[1].split('?')[0].replace(/\D/g, '');
    }
  } else if (url.includes('whatsapp.com/send')) {
    try {
      const urlObj = new URL(url.replace('/?', '?'));
      const phoneParam = urlObj.searchParams.get('phone');
      if (phoneParam) {
        phoneDigits = phoneParam.replace(/\D/g, '');
      }
    } catch (err) {
      const match = url.match(/[?&]phone=(\d+)/);
      if (match && match[1]) phoneDigits = match[1];
    }
  }
  
  if (phoneDigits && phoneDigits.length >= 10) {
    if (phoneDigits.startsWith('55') && phoneDigits.length > 10) {
      phoneDigits = phoneDigits.substring(2);
    }
    
    if (phoneDigits.length === 11) {
      const ddd = phoneDigits.substring(0, 2);
      const first = phoneDigits.substring(2, 7);
      const second = phoneDigits.substring(7);
      return `(${ddd}) ${first}-${second}`;
    } else if (phoneDigits.length === 10) {
      const ddd = phoneDigits.substring(0, 2);
      const first = phoneDigits.substring(2, 6);
      const second = phoneDigits.substring(6);
      return `(${ddd}) ${first}-${second}`;
    }
    return phoneDigits;
  }
  
  return null;
}

async function checkAndHandleCaptcha(page) {
  if (page.url().includes('google.com/sorry/')) {
    console.log('\n⚠️  [CAPTCHA DETECTADO] O Google pausou as buscas.');
    console.log('👉 Por favor, clique na caixinha "Não sou um robô" na janela do Chrome.');
    console.log('⏱️  O robô está aguardando você resolver a verificação para continuar...');
    
    while (page.url().includes('google.com/sorry/')) {
      await delay(1000);
    }
    
    console.log('✅ Verificação concluída! Retomando buscas...\n');
    await delay(1500); // tempo extra seguro
  }
}


function cleanRestaurantNameForSearch(name) {
  if (!name) return '';
  let clean = name.replace(/\*/g, '');
  
  const neighborhoods = [
    'tambaú', 'tambau', 'bancários', 'bancarios', 'manaíra', 'manaira', 
    'cabo branco', 'altiplano', 'bessa', 'miramar', 'torre', 'centro', 
    'jaguaribe', 'castelo branco', 'geisel', 'mangabeira', 'valentina', 
    'portal do sol', 'aeroclube', 'intermares', 'expedicionários', 'expedicionarios',
    'bairro dos estados', 'estados', 'jose americo', 'josé américo', 'cristo redentor',
    'cristo', 'cruz das armas', 'funcionarios', 'funcionários'
  ];
  
  const neighborhoodPattern = new RegExp(`\\s*(?:-|\\|)\\s*(?:${neighborhoods.join('|')})(?![a-z0-9])`, 'i');
  clean = clean.replace(neighborhoodPattern, '');
  
  const trailingNeighborhoodPattern = new RegExp(`\\s+(?:${neighborhoods.join('|')})(?![a-z0-9])\\s*$`, 'i');
  clean = clean.replace(trailingNeighborhoodPattern, '');
 
  clean = clean.replace(/\s*(?:-|\|)\s*$/, '');
 
  return clean.trim();
}


async function searchGoogleForSocials(page, restaurant) {
  const cleanedName = cleanRestaurantNameForSearch(restaurant.name);
  const query = `${cleanedName} ${restaurant.city || ''} instagram`.replace(/\s+/g, ' ').trim();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  
  console.log(`🔍 Buscando Instagram para "${restaurant.name}" com a query: "${query}"...`);
  
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await checkAndHandleCaptcha(page);
  await delay(1500); 
  
  const extracted = await page.evaluate((targetCity, targetState, restaurantName) => {
    const normalizeText = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .trim();
    };

    const containsWord = (text, word) => {
      const regex = new RegExp('\\b' + word + '\\b', 'i');
      return regex.test(text);
    };

    const otherStates = ['sp', 'rj', 'mg', 'rs', 'pr', 'sc', 'go', 'df', 'am', 'pa', 'ba', 'pe', 'ce', 'rn', 'al', 'se', 'ma', 'pi', 'to', 'ro', 'ac', 'rr', 'ap', 'ms', 'mt'];
    const otherCities = [
      'sao paulo', 'saopaulo', 'rio de janeiro', 'riodejaneiro', 'belo horizonte', 'belohorizonte', 
      'curitiba', 'porto alegre', 'portoalegre', 'salvador', 'recife', 'fortaleza', 'brasilia', 
      'goiania', 'manaus', 'belem', 'campinas', 'niteroi', 'florianopolis', 'vitoria', 
      'aracaju', 'maceio', 'natal', 'campina grande', 'campinagrande', 'caruaru', 'petrolina'
    ];

    const stateNames = {
      'sp': 'sao paulo', 'rj': 'rio de janeiro', 'mg': 'minas gerais', 'rs': 'rio grande do sul',
      'pr': 'parana', 'sc': 'santa catarina', 'go': 'goias', 'df': 'distrito federal',
      'am': 'amazonas', 'pa': 'para', 'ba': 'bahia', 'pe': 'pernambuco', 'ce': 'ceara',
      'rn': 'rio grande do norte', 'al': 'alagoas', 'se': 'sergipe', 'ma': 'maranhao',
      'pi': 'piaui', 'to': 'tocantins', 'ro': 'rondonia', 'ac': 'acre', 'rr': 'roraima',
      'ap': 'amapa', 'ms': 'mato grosso do sul', 'mt': 'mato grosso', 'pb': 'paraiba'
    };

    const tState = targetState.toLowerCase().trim();
    const tCity = targetCity.toLowerCase().trim();
    const normTargetCity = normalizeText(tCity).replace(/\s+/g, '');
    const normRestaurantName = normalizeText(restaurantName);
    const nameWords = normRestaurantName.split(/\s+/).filter(w => w.length > 2);

    const filteredStates = otherStates.filter(s => s !== tState);
    const filteredCities = otherCities.filter(c => c !== tCity && c !== normTargetCity);

    const links = Array.from(document.querySelectorAll('a'));
    const candidates = [];

    for (const a of links) {
      const href = a.getAttribute('href') || '';
      
      let url = href;
      if (href.includes('url?q=')) {
        const parts = href.split('url?q=');
        if (parts[1]) {
          url = decodeURIComponent(parts[1].split('&')[0]);
        }
      }
      url = url.split('?')[0];

      if (url.includes('instagram.com/')) {
        const lowerUrl = url.toLowerCase();
        if (
          !lowerUrl.includes('/p/') && 
          !lowerUrl.includes('/reel/') && 
          !lowerUrl.includes('/explore/') && 
          !lowerUrl.includes('/tags/') && 
          !lowerUrl.includes('/developer') &&
          !lowerUrl.includes('google.com') &&
          !lowerUrl.includes('google.co')
        ) {
          const pathSegments = url.replace('https://', '').replace('http://', '').replace('www.', '').split('/');
          const handle = (pathSegments[1] || '').trim().toLowerCase();
          if (handle.length === 0) continue;

          const container = a.closest('.g, .MjjYud, [data-ved], li, tr, td');
          const context = container ? (container.innerText || '') : '';
          const h3 = container ? container.querySelector('h3') : null;
          const title = h3 ? h3.innerText : (a.textContent || '');

          const normTitle = normalizeText(title);
          const normContext = normalizeText(context);

          let score = 100;
          let hasMismatch = false;

          for (const st of filteredStates) {
            if (handle.endsWith(st)) {
              score -= 150;
              hasMismatch = true;
            }
          }
          for (const ct of filteredCities) {
            const cleanCt = ct.replace(/\s+/g, '');
            if (handle.includes(cleanCt)) {
              score -= 150;
              hasMismatch = true;
            }
          }

          for (const st of filteredStates) {
            const fullName = stateNames[st];
            if (fullName && (normTitle.includes(fullName) || normContext.includes(fullName))) {
              if (containsWord(normTitle, tState) || containsWord(normContext, tState) || containsWord(normTitle, normTargetCity) || containsWord(normContext, normTargetCity)) {
                score -= 40;
              } else {
                score -= 120;
                hasMismatch = true;
              }
            }
          }
          for (const ct of filteredCities) {
            if (containsWord(normTitle, ct) || containsWord(normContext, ct)) {
              if (containsWord(normTitle, tCity) || containsWord(normContext, tCity)) {
                score -= 40;
              } else {
                score -= 120;
                hasMismatch = true;
              }
            }
          }

          if (handle.endsWith(tState) || handle.endsWith('jp') || handle.includes(normTargetCity)) {
            score += 50;
          }

          if (containsWord(normTitle, tState) || containsWord(normContext, tState)) {
            score += 30;
          }
          if (containsWord(normTitle, tCity) || containsWord(normContext, tCity)) {
            score += 40;
          }

          let nameMatches = 0;
          for (const word of nameWords) {
            if (normTitle.includes(word) || handle.includes(word)) {
              nameMatches++;
            }
          }
          score += nameMatches * 15;

          candidates.push({ url, score, handle, title, hasMismatch });
        }
      }
    }

    const valid = candidates.filter(c => c.score >= 50);
    valid.sort((x, y) => y.score - x.score);
    return valid.length > 0 ? valid[0].url : null;
  }, restaurant.city || '', restaurant.state || '', cleanedName);
  
  return extracted;
}

async function searchGoogleForMenu(page, restaurant) {
  const cleanedName = cleanRestaurantNameForSearch(restaurant.name);
  const query = `${cleanedName} ${restaurant.city || ''} cardapio menu`.replace(/\s+/g, ' ').trim();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  
  console.log(`📋 Buscando Cardápio para "${restaurant.name}" com a query: "${query}"...`);
  
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await checkAndHandleCaptcha(page);
  await delay(1500);
  
  const extracted = await page.evaluate((targetCity, targetState, restaurantName) => {
    const normalizeText = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .trim();
    };

    const containsWord = (text, word) => {
      const regex = new RegExp('\\b' + word + '\\b', 'i');
      return regex.test(text);
    };

    const otherStates = ['sp', 'rj', 'mg', 'rs', 'pr', 'sc', 'go', 'df', 'am', 'pa', 'ba', 'pe', 'ce', 'rn', 'al', 'se', 'ma', 'pi', 'to', 'ro', 'ac', 'rr', 'ap', 'ms', 'mt'];
    const otherCities = [
      'sao paulo', 'saopaulo', 'rio de janeiro', 'riodejaneiro', 'belo horizonte', 'belohorizonte', 
      'curitiba', 'porto alegre', 'portoalegre', 'salvador', 'recife', 'fortaleza', 'brasilia', 
      'goiania', 'manaus', 'belem', 'campinas', 'niteroi', 'florianopolis', 'vitoria', 
      'aracaju', 'maceio', 'natal', 'campina grande', 'campinagrande', 'caruaru', 'petrolina'
    ];

    const stateNames = {
      'sp': 'sao paulo', 'rj': 'rio de janeiro', 'mg': 'minas gerais', 'rs': 'rio grande do sul',
      'pr': 'parana', 'sc': 'santa catarina', 'go': 'goias', 'df': 'distrito federal',
      'am': 'amazonas', 'pa': 'para', 'ba': 'bahia', 'pe': 'pernambuco', 'ce': 'ceara',
      'rn': 'rio grande do norte', 'al': 'alagoas', 'se': 'sergipe', 'ma': 'maranhao',
      'pi': 'piaui', 'to': 'tocantins', 'ro': 'rondonia', 'ac': 'acre', 'rr': 'roraima',
      'ap': 'amapa', 'ms': 'mato grosso do sul', 'mt': 'mato grosso', 'pb': 'paraiba'
    };

    const tState = targetState.toLowerCase().trim();
    const tCity = targetCity.toLowerCase().trim();
    const normTargetCity = normalizeText(tCity).replace(/\s+/g, '');
    const normRestaurantName = normalizeText(restaurantName);
    const nameWords = normRestaurantName.split(/\s+/).filter(w => w.length > 2);

    const filteredStates = otherStates.filter(s => s !== tState);
    const filteredCities = otherCities.filter(c => c !== tCity && c !== normTargetCity);

    const links = Array.from(document.querySelectorAll('a'));
    
    let googleMenuLink = null;
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      const text = a.textContent.trim().toLowerCase();
      
      if ((text === 'menu' || text === 'cardápio' || text === 'cardapio') && 
          (href.includes('google.com') || href.startsWith('/search') || href.includes('google.com.br'))) {
        let url = href;
        if (href.startsWith('/')) {
          url = 'https://www.google.com' + href;
        }
        if (!url.includes('#menu')) {
          url += '#menu';
        }
        googleMenuLink = url;
      }
      
      if (href.includes('google.com/maps') && (href.includes('/menu') || href.includes('menu='))) {
        googleMenuLink = href;
      }
    }

    const menuKeywords = [
      'goomer.app', 'pedir.to', 'ola.click', 'cardapio.menu', 'delivery',
      'menudigital', 'instamenu', 'abrahahot', 'tagme.com.br', 'linktr.ee',
      'wa.me', 'api.whatsapp', 'cardapiomenu', 'comutat'
    ];

    const candidates = [];

    for (const a of links) {
      let href = a.getAttribute('href') || '';
      
      let targetUrl = href;
      if (href.includes('url?q=')) {
        const parts = href.split('url?q=');
        if (parts[1]) {
          targetUrl = decodeURIComponent(parts[1].split('&')[0]);
        }
      }

      const lowerTargetUrl = targetUrl.toLowerCase();
      if (
        lowerTargetUrl.includes('google.com') || 
        lowerTargetUrl.includes('google.co') || 
        (targetUrl.startsWith('/') && !targetUrl.includes('url?q=')) || 
        targetUrl.startsWith('#') || 
        targetUrl.length < 5 || 
        lowerTargetUrl.includes('ifood.com.br')
      ) {
        continue;
      }
      
      href = targetUrl;
      const lowerHref = href.toLowerCase();

      const urlParts = lowerHref.replace('https://', '').replace('http://', '').replace('www.', '').split('/');
      const lastSegment = urlParts[urlParts.length - 1] || '';
      const handle = lastSegment.split('?')[0].split('#')[0];

      const container = a.closest('.g, .MjjYud, [data-ved], li, tr, td');
      const context = container ? (container.innerText || '') : '';
      const h3 = container ? container.querySelector('h3') : null;
      const title = h3 ? h3.innerText : (a.textContent || '');

      const normTitle = normalizeText(title);
      const normContext = normalizeText(context);

      let score = 100;
      let hasMismatch = false;

      for (const st of filteredStates) {
        if (handle.endsWith(st) || urlParts.includes(st)) {
          score -= 150;
          hasMismatch = true;
        }
      }
      for (const ct of filteredCities) {
        const cleanCt = ct.replace(/\s+/g, '');
        if (handle.includes(cleanCt) || lowerHref.includes(cleanCt)) {
          score -= 150;
          hasMismatch = true;
        }
      }

      for (const st of filteredStates) {
        const fullName = stateNames[st];
        if (fullName && (normTitle.includes(fullName) || normContext.includes(fullName))) {
          if (containsWord(normTitle, tState) || containsWord(normContext, tState) || containsWord(normTitle, normTargetCity) || containsWord(normContext, normTargetCity)) {
            score -= 40;
          } else {
            score -= 120;
            hasMismatch = true;
          }
        }
      }
      for (const ct of filteredCities) {
        if (containsWord(normTitle, ct) || containsWord(normContext, ct)) {
          if (containsWord(normTitle, tCity) || containsWord(normContext, tCity)) {
            score -= 40;
          } else {
            score -= 120;
            hasMismatch = true;
          }
        }
      }

      let keywordMatch = false;
      for (const keyword of menuKeywords) {
        if (lowerHref.includes(keyword) && !lowerHref.includes('instagram.com') && !lowerHref.includes('facebook.com')) {
          score += 60;
          keywordMatch = true;
          break;
        }
      }

      if ((lowerHref.includes('cardapio') || lowerHref.includes('menu')) && 
          !lowerHref.includes('instagram.com') && 
          !lowerHref.includes('facebook.com') && 
          !lowerHref.includes('youtube.com') && 
          !lowerHref.includes('tripadvisor.com')) {
        score += 30;
      }

      if (handle.endsWith(tState) || handle.endsWith('jp') || handle.includes(normTargetCity)) {
        score += 40;
      }
      if (containsWord(normTitle, tState) || containsWord(normContext, tState)) {
        score += 20;
      }
      if (containsWord(normTitle, tCity) || containsWord(normContext, tCity)) {
        score += 30;
      }

      let nameMatches = 0;
      for (const word of nameWords) {
        if (normTitle.includes(word) || handle.includes(word)) {
          nameMatches++;
        }
      }
      score += nameMatches * 15;

      candidates.push({ url: href, score, title, hasMismatch, keywordMatch });
    }

    const valid = candidates.filter(c => c.score >= 50);
    valid.sort((x, y) => y.score - x.score);
    return valid.length > 0 ? valid[0].url : googleMenuLink;
  }, restaurant.city || '', restaurant.state || '', cleanedName);
  
  return extracted;
}

async function resolveAggregatorLink(page, aggregatorUrl, restaurantCity = '', restaurantAddress = '', depth = 0) {
  if (depth >= 2) {
    return aggregatorUrl;
  }

  const urlLower = aggregatorUrl.toLowerCase();
  const aggregators = [
    'linktr.ee', 'linkbio.co', 'instabio.cc', 'beacons.ai', 'beacons.page', 
    'msha.ke', 'heylink.me', 'taplink.cc', 'bio.site', 'solo.to', 'lnk.bio'
  ];
  
  const isAggregator = aggregators.some(domain => urlLower.includes(domain));
  if (!isAggregator) {
    return aggregatorUrl;
  }
  
  console.log(`🔗 Detectado link agregador (nível ${depth}): "${aggregatorUrl}". Resolvendo destino...`);
  
  try {
    await page.goto(aggregatorUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await delay(2000);
    
    const menuKeywords = [
      'goomer.app', 'pedir.to', 'ola.click', 'cardapio.menu', 'delivery',
      'menudigital', 'instamenu', 'abrahahot', 'tagme.com.br', 'wa.me',
      'api.whatsapp', 'cardapiomenu', 'comutat', 'cardapio', 'menu',
      'pedir', 'pedidos', 'deliverydireto', 'saipos', 'instadelivery'
    ];
    
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.map(a => ({
        href: a.getAttribute('href') || '',
        text: a.textContent.trim().toLowerCase()
      }));
    });
    
    const candidates = [];
    for (const link of links) {
      const href = link.href.toLowerCase();
      const text = link.text;
      
      if (!href || href.startsWith('javascript:') || href.startsWith('#') || href.includes('instagram.com') || href.includes('facebook.com')) {
        continue;
      }
      
      let score = 0;
      for (const kw of menuKeywords) {
        if (href.includes(kw)) {
          score += 50;
        }
      }
      
      if (text.includes('cardapio') || text.includes('cardápio') || text.includes('menu')) {
        score += 40;
      }
      if (text.includes('delivery') || text.includes('pedir') || text.includes('pedido') || text.includes('peça aqui')) {
        score += 30;
      }
      if (text.includes('whatsapp') || text.includes('whats')) {
        score += 20;
      }
      
      // Checa cidade e abreviações
      let locationScore = 0;
      if (restaurantCity) {
        const normCity = restaurantCity.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const cityKeywords = [normCity];
        if (normCity.includes('joao pessoa')) {
          cityKeywords.push('jpa', 'jp', 'joao pessoa');
        } else if (normCity.includes('sao paulo')) {
          cityKeywords.push('sp', 'sao paulo');
        } else if (normCity.includes('rio de janeiro')) {
          cityKeywords.push('rj', 'rio de janeiro');
        } else if (normCity.includes('recife')) {
          cityKeywords.push('pe', 'recife');
        }
        
        for (const kw of cityKeywords) {
          if (text.includes(kw) || href.includes(kw)) {
            locationScore += 100;
          }
        }
      }
      
      // Checa palavras significativas do endereço (bairro, rua, shopping)
      if (restaurantAddress) {
        const normAddress = restaurantAddress.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const addressWords = normAddress.split(/[\s,.-]+/).filter(w => w.length > 3 && !['avenida', 'rua', 'bloco', 'apartamento', 'casa', 'numero'].includes(w));
        
        for (const word of addressWords) {
          if (text.includes(word) || href.includes(word)) {
            locationScore += 50;
          }
        }
      }
      
      score += locationScore;
      
      // Se tiver sub-agregador de filial com compatibilidade geográfica, damos score extra
      const isSubAggregator = aggregators.some(domain => href.includes(domain));
      if (isSubAggregator && locationScore > 0) {
        score += 60;
      }
      
      if (score > 0) {
        candidates.push({ href: link.href, score, text });
      }
    }
    
    if (candidates.length > 0) {
      candidates.sort((x, y) => y.score - x.score);
      const resolvedUrl = candidates[0].href;
      
      // Se o link escolhido for outro agregador (sub-agregador), resolve recursivamente
      const isSubAggregator = aggregators.some(domain => resolvedUrl.toLowerCase().includes(domain));
      if (isSubAggregator) {
        console.log(`🔄 Resolvendo sub-agregador da filial "${candidates[0].text}": "${resolvedUrl}"...`);
        return await resolveAggregatorLink(page, resolvedUrl, restaurantCity, restaurantAddress, depth + 1);
      }
      
      console.log(`✅ Link final resolvido: "${resolvedUrl}" (Score: ${candidates[0].score})`);
      return resolvedUrl;
    }
    
    console.log(`⚠️  Nenhum link de cardápio explícito encontrado no agregador. Usando link original.`);
    return aggregatorUrl;
  } catch (err) {
    console.error(`⚠️ Erro ao tentar resolver link do agregador:`, err.message);
    return aggregatorUrl;
  }
}

async function extractBioLinkFromInstagram(page, instagramUrl, restaurantCity = '', restaurantAddress = '') {
  let targetUrl = instagramUrl;
  
  // Normalize to www.instagram.com/[handle]/
  let handle = targetUrl.trim();
  if (handle.includes('instagram.com/')) {
    const parts = handle.split('instagram.com/');
    if (parts[1]) {
      handle = parts[1].split('?')[0].split('#')[0].replace(/\//g, '').trim();
    }
  }
  handle = handle.replace(/[^a-zA-Z0-9_\.]/g, '');
  targetUrl = `https://www.instagram.com/${handle}/`;
  
  console.log(`📸 Acessando Instagram oficial: "${targetUrl}"...`);
  
  try {
    // Carrega cookies salvos se existirem
    await loadInstagramCookies(page);
    
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3500); // Wait for JS rendering
    
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
            if (btn) {
              btn.click();
              return;
            }
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
    } catch (err) {
      // Ignora erro ao tentar fechar modal
    }

    // Extrai o link da bio
    const bioLink = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        if (href.includes('l.instagram.com/?u=') || href.includes('l.instagram.com/')) {
          try {
            const urlObj = new URL(href);
            const u = urlObj.searchParams.get('u');
            if (u) {
              return decodeURIComponent(u);
            }
          } catch (e) {
            // URL parse error
          }
        }
      }
      
      const excludedDomains = ['instagram.com', 'facebook.com', 'about.meta.com', 'developers.facebook.com', 'meta.ai', 'threads.net', 'threads.com'];
      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        if (href.startsWith('http') && !excludedDomains.some(d => href.includes(d))) {
          if (a.getAttribute('role') === 'link' || a.innerText.includes('.') || a.className.includes('link') || a.closest('header')) {
            return href;
          }
        }
      }
      return null;
    });

    if (bioLink) {
      const resolved = await resolveAggregatorLink(page, bioLink, restaurantCity, restaurantAddress);
      return resolved;
    }
    return null;
  } catch (err) {
    console.error(`⚠️ Erro ao navegar no Instagram para extrair bio link:`, err.message);
    return null;
  }
}

async function run() {
  console.log('📡 Buscando estabelecimentos no Supabase (apenas com status Pendente)...');
  const PAGE_SIZE = 1000;
  const allRestaurants = [];
  let paginationPage = 0;
  let hasMore = true;

  while (hasMore) {
    const from = paginationPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error: fetchError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('visit_status', 'Pendente')
      .or('is_deleted.eq.false,is_deleted.is.null')
      .order('name')
      .range(from, to);

    if (fetchError) {
      console.error('❌ Erro ao buscar do Supabase:', fetchError.message);
      process.exit(1);
    }

    if (data && data.length > 0) {
      allRestaurants.push(...data);
      paginationPage++;
    } else {
      hasMore = false;
    }

    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    }
  }

  console.log(`📂 Carregados ${allRestaurants.length} estabelecimentos do Supabase.`);

  // Mapeia para o formato interno do enriquecedor
  const mappedData = allRestaurants.map(dbItem => {
    const socialNetworks = dbItem.social_networks || [];
    const instagram = socialNetworks.find(sn => sn && sn.platform === 'instagram')?.url || '';
    const facebook = socialNetworks.find(sn => sn && sn.platform === 'facebook')?.url || '';
    return {
      id: dbItem.id,
      name: dbItem.name,
      city: dbItem.city || 'João Pessoa',
      state: dbItem.state || 'PB',
      address: dbItem.address || '',
      phone: dbItem.phone || '',
      instagram: instagram,
      facebook: facebook,
      menuSourceUrl: dbItem.other_url || dbItem.external_url || '',
      website: dbItem.other_url || dbItem.external_url || '',
      social_networks: socialNetworks
    };
  });

  // Fase Local: Extrai telefone de links de WhatsApp existentes
  let localUpdates = 0;
  for (const item of mappedData) {
    if (!item.phone || item.phone.toLowerCase().includes('sem telefone') || item.phone.trim() === '') {
      const waLink = [item.website, item.menuSourceUrl].find(url => url && (url.includes('wa.me/') || url.includes('whatsapp.com/send')));
      if (waLink) {
        const extracted = extractPhoneFromWhatsapp(waLink);
        if (extracted) {
          console.log(`[LOCAL] 📞 Telefone extraído do link do WhatsApp para "${item.name}": ${extracted}`);
          item.phone = extracted;
          localUpdates++;
          
          // Atualiza diretamente no Supabase
          const { error: phoneError } = await supabase
            .from('restaurants')
            .update({ phone: extracted.replace(/[^\d+]/g, '') })
            .eq('id', item.id);
          if (phoneError) {
            console.error(`⚠️ Erro ao salvar telefone no Supabase para "${item.name}":`, phoneError.message);
          }
        }
      }
    }
  }

  // Consideramos que o Instagram precisa ser atualizado se não existir, ou se for vazio, ou se for link do Facebook
  const pending = mappedData.filter(item => {
    const needsInsta = !item.instagram || item.instagram.includes('facebook.com') || item.instagram.includes('instagram.com/p/') || item.instagram.trim() === '';
    const needsMenu = !item.menuSourceUrl || item.menuSourceUrl.trim() === '';
    return needsInsta || needsMenu;
  });

  if (pending.length === 0) {
    console.log(`✨ Todos os ${mappedData.length} estabelecimentos já possuem Instagram e Cardápio válidos!`);
    return;
  }

  console.log(`🔄 Encontrados ${pending.length} estabelecimentos que precisam de enriquecimento de dados.\n`);

  console.log(`🚀 Inicializando o navegador Chrome...`);
  const userDataDir = path.join(__dirname, 'puppeteer_user_data');
  // Remove SingletonLock anterior do Chrome para garantir que abra visível
  const lockPath = path.join(userDataDir, 'SingletonLock');
  if (fs.existsSync(lockPath)) {
    try {
      fs.unlinkSync(lockPath);
      console.log(`🧹 [Enriquecedor Social] Removido lock de perfil anterior.`);
    } catch (lockErr) {
      console.warn(`⚠️ [Enriquecedor Social] Não foi possível remover SingletonLock: ${lockErr.message}`);
    }
  }
  const launchOptions = getChromeLaunchOptions();
  const browser = await puppeteer.launch(launchOptions);

  let enrichedInstaCount = 0;
  let enrichedMenuCount = 0;
  let currentPendingIndex = 0;

  async function worker() {
    while (true) {
      const idx = currentPendingIndex++;
      if (idx >= pending.length) break;

      const item = pending[idx];
      const page = await browser.newPage();
      try {
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'pt-BR,pt;q=0.9'
        });

        console.log(`\n-------------------------------------------------------------`);
        console.log(`[${idx + 1}/${pending.length}] Processando: "${item.name}"...`);

        const needsInsta = !item.instagram || item.instagram.includes('facebook.com') || item.instagram.includes('instagram.com/p/') || item.instagram.trim() === '';
        const needsMenu = !item.menuSourceUrl || item.menuSourceUrl.trim() === '';

        // 1. Enriquecimento de Instagram
        if (needsInsta) {
          try {
            // Busca no Google
            let foundInsta = await searchGoogleForSocials(page, item);
            if (foundInsta) {
              console.log(`✅ Instagram ENCONTRADO: ${foundInsta}`);
              
              const currentSocials = item.social_networks || [];
              const updatedSocials = currentSocials.filter(s => s.platform !== 'instagram');
              updatedSocials.push({ platform: 'instagram', url: foundInsta });
              
              const updatePayload = {
                social_networks: updatedSocials
              };
              if (!item.website || item.website.includes('facebook.com') || item.website.trim() === '') {
                updatePayload.other_url = foundInsta;
                updatePayload.external_url = foundInsta;
                item.website = foundInsta;
              }

              console.log(`📡 [Supabase] Atualizando Instagram de "${item.name}"...`);
              const { error: updateError } = await supabase
                .from('restaurants')
                .update(updatePayload)
                .eq('id', item.id);
                
              if (updateError) {
                console.error(`⚠️ Erro ao atualizar no Supabase:`, updateError.message);
              } else {
                console.log(`✅ [Supabase] Instagram de "${item.name}" atualizado com sucesso!`);
                item.instagram = foundInsta;
                item.social_networks = updatedSocials;
                enrichedInstaCount++;
              }
            } else {
              console.log(`❌ Instagram não encontrado no Google.`);
            }
          } catch (err) {
            console.error(`⚠️ Erro ao buscar Instagram para "${item.name}":`, err.message);
          }
          
          await delay(1000 + Math.random() * 1000);
        }

        // 2. Enriquecimento de Cardápio
        if (needsMenu) {
          try {
            let foundMenu = null;
            
            // Pega o Instagram atualizado (caso tenha sido encontrado acima, ou já existisse)
            const currentInstagram = item.instagram;
            const hasValidInstagram = currentInstagram && 
                                      !currentInstagram.includes('facebook.com') && 
                                      !currentInstagram.includes('instagram.com/p/') && 
                                      currentInstagram.trim() !== '';

            if (hasValidInstagram) {
              console.log(`📸 Tentando extrair cardápio do Instagram oficial de "${item.name}"...`);
              foundMenu = await extractBioLinkFromInstagram(page, currentInstagram, item.city || '', item.address || '');
              if (foundMenu) {
                console.log(`✅ Cardápio ENCONTRADO na Bio do Instagram: ${foundMenu}`);
              } else {
                console.log(`⚠️ Não foi possível extrair o link da bio do Instagram. Tentando fallback no Google...`);
              }
            }

            // Se não conseguiu pelo Instagram (ou não tinha Instagram válido), tenta buscar no Google
            if (!foundMenu) {
              foundMenu = await searchGoogleForMenu(page, item);
              if (foundMenu) {
                console.log(`✅ Cardápio ENCONTRADO no Google: ${foundMenu}`);
              } else {
                console.log(`❌ Cardápio não encontrado no Google.`);
              }
            }

            if (foundMenu) {
              console.log(`📡 [Supabase] Atualizando cardápio de "${item.name}"...`);
              const updatePayload = {
                other_url: foundMenu,
                external_url: foundMenu
              };
              
              if (foundMenu.includes('wa.me/') || foundMenu.includes('whatsapp.com/send')) {
                if (!item.phone || item.phone.toLowerCase().includes('sem telefone') || item.phone.trim() === '') {
                  const extractedPhone = extractPhoneFromWhatsapp(foundMenu);
                  if (extractedPhone) {
                    console.log(`📞 Telefone extraído do novo link do WhatsApp do cardápio: ${extractedPhone}`);
                    updatePayload.phone = extractedPhone.replace(/[^\d+]/g, '');
                    item.phone = extractedPhone;
                  }
                }
              }
              
              const { error: updateError } = await supabase
                .from('restaurants')
                .update(updatePayload)
                .eq('id', item.id);
                
              if (updateError) {
                console.error(`⚠️ Erro ao atualizar cardápio no Supabase:`, updateError.message);
              } else {
                console.log(`✅ [Supabase] Cardápio de "${item.name}" atualizado com sucesso!`);
                item.menuSourceUrl = foundMenu;
                enrichedMenuCount++;
              }
            }
          } catch (err) {
            console.error(`⚠️ Erro ao buscar Cardápio para "${item.name}":`, err.message);
          }
        }

        const waitTime = 2000 + Math.random() * 2000;
        console.log(`⏱️ Aguardando ${Math.round(waitTime)}ms para evitar detecção...`);
        await delay(waitTime);
      } catch (err) {
        console.error(`⚠️ Erro ao processar "${item.name}":`, err.message);
      } finally {
        await page.close();
      }
    }
  }

  // Inicia 4 workers em paralelo
  const CONCURRENCY = 4;
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  await browser.close();
  console.log(`\n=============================================================`);
  console.log(`🎉 Enriquecimento concluído com sucesso!`);
  console.log(`📸 Novos Instagrams encontrados: ${enrichedInstaCount}`);
  console.log(`📋 Novos Cardápios encontrados: ${enrichedMenuCount}`);
  console.log(`=============================================================`);
}

async function runSingle(restaurantId, field) {
  console.log(`\n[SINGLE-REBUSCA] 🚀 Iniciando rebusca para o restaurante ID "${restaurantId}", campo "${field}"...`);
  
  const { data: dbItem, error: fetchError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();
    
  if (fetchError || !dbItem) {
    console.error(`❌ Erro ao buscar restaurante no Supabase:`, fetchError?.message || 'Não encontrado.');
    console.log(`RESULT:{"success":false,"error":"Restaurante não encontrado"}`);
    process.exit(1);
  }
  
  const socialNetworks = dbItem.social_networks || [];
  const instagram = socialNetworks.find(sn => sn && sn.platform === 'instagram')?.url || '';
  const facebook = socialNetworks.find(sn => sn && sn.platform === 'facebook')?.url || '';
  
  let googleMapsUrl = '';
  const visitNotes = dbItem.visit_notes || '';
  const gmapsMatch = visitNotes.match(/Google Maps:\s*(https?:\/\/[^\s\n\r]+)/);
  if (gmapsMatch) {
    googleMapsUrl = gmapsMatch[1];
  }

  const item = {
    id: dbItem.id,
    name: dbItem.name,
    city: dbItem.city || 'João Pessoa',
    state: dbItem.state || 'PB',
    address: dbItem.address || '',
    phone: dbItem.phone || '',
    instagram: instagram,
    facebook: facebook,
    menuSourceUrl: dbItem.other_url || dbItem.external_url || '',
    website: dbItem.other_url || dbItem.external_url || '',
    social_networks: socialNetworks,
    googleMapsUrl
  };

  console.log(`🤖 Estabelecimento carregado: "${item.name}" (${item.city} - ${item.state})`);
  
  console.log(`🚀 Inicializando o navegador Chrome...`);
  const userDataDir = path.join(__dirname, 'puppeteer_user_data_single');
  // Remove SingletonLock anterior do Chrome para garantir que abra visível
  const lockPath = path.join(userDataDir, 'SingletonLock');
  if (fs.existsSync(lockPath)) {
    try {
      fs.unlinkSync(lockPath);
      console.log(`🧹 [Enriquecedor Social Single] Removido lock de perfil anterior.`);
    } catch (lockErr) {
      console.warn(`⚠️ [Enriquecedor Social Single] Não foi possível remover SingletonLock: ${lockErr.message}`);
    }
  }
  const launchOptions = getChromeLaunchOptions();
  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9'
  });

  let success = false;
  let foundUrl = null;

  try {
    if (field === 'instagram') {
      let foundInsta = await searchGoogleForSocials(page, item);
      if (foundInsta) {
        console.log(`✅ Instagram ENCONTRADO: ${foundInsta}`);
        
        const updatedSocials = socialNetworks.filter(s => s.platform !== 'instagram');
        updatedSocials.push({ platform: 'instagram', url: foundInsta });
        
        const updatePayload = {
          social_networks: updatedSocials
        };
        if (!item.website || item.website.includes('facebook.com') || item.website.trim() === '') {
          updatePayload.other_url = foundInsta;
          updatePayload.external_url = foundInsta;
        }

        console.log(`📡 [Supabase] Atualizando Instagram no Supabase...`);
        const { error: updateError } = await supabase
          .from('restaurants')
          .update(updatePayload)
          .eq('id', item.id);
          
        if (updateError) {
          console.error(`⚠️ Erro ao atualizar no Supabase:`, updateError.message);
        } else {
          console.log(`✅ [Supabase] Instagram atualizado com sucesso!`);
          success = true;
          foundUrl = foundInsta;
        }
      } else {
        console.log(`❌ Instagram não encontrado no Google.`);
      }
    } else if (field === 'menu') {
      const hasValidInstagram = item.instagram && 
                                !item.instagram.includes('facebook.com') && 
                                !item.instagram.includes('instagram.com/p/') && 
                                item.instagram.trim() !== '';

      if (hasValidInstagram) {
        console.log(`📸 Tentando extrair cardápio do Instagram oficial: "${item.instagram}"...`);
        foundUrl = await extractBioLinkFromInstagram(page, item.instagram, item.city || '', item.address || '');
        if (foundUrl) {
          console.log(`✅ Cardápio ENCONTRADO na Bio do Instagram: ${foundUrl}`);
        } else {
          console.log(`⚠️ Não foi possível extrair o link da bio do Instagram. Tentando fallback no Google...`);
        }
      }

      if (!foundUrl) {
        foundUrl = await searchGoogleForMenu(page, item);
        if (foundUrl) {
          console.log(`✅ Cardápio ENCONTRADO no Google: ${foundUrl}`);
        } else {
          console.log(`❌ Cardápio não encontrado no Google.`);
        }
      }

      if (foundUrl) {
        console.log(`📡 [Supabase] Atualizando cardápio no Supabase...`);
        const updatePayload = {
          other_url: foundUrl,
          external_url: foundUrl
        };
        
        if (foundUrl.includes('wa.me/') || foundUrl.includes('whatsapp.com/send')) {
          if (!item.phone || item.phone.toLowerCase().includes('sem telefone') || item.phone.trim() === '') {
            const extractedPhone = extractPhoneFromWhatsapp(foundUrl);
            if (extractedPhone) {
              console.log(`📞 Telefone extraído do link do WhatsApp: ${extractedPhone}`);
              updatePayload.phone = extractedPhone.replace(/[^\d+]/g, '');
            }
          }
        }
        
        const { error: updateError } = await supabase
          .from('restaurants')
          .update(updatePayload)
          .eq('id', item.id);
          
        if (updateError) {
          console.error(`⚠️ Erro ao atualizar no Supabase:`, updateError.message);
        } else {
          console.log(`✅ [Supabase] Cardápio atualizado com sucesso!`);
          success = true;
        }
      }
    } else if (field === 'hours' || field === 'openingHours') {
      const searchName = cleanRestaurantNameForSearch(item.name);
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchName + ' ' + (item.city || ''))}`;
      
      console.log(`🧭 Acessando busca do Google Maps: "${url}"...`);
      const navSuccess = await navigateWithRetry(page, url);
      if (!navSuccess) {
        throw new Error("Não foi possível carregar a página de busca do Google Maps.");
      }
      
      const dayMapping = {
        'segunda': 'monday', 'terça': 'tuesday', 'quarta': 'wednesday', 'quinta': 'thursday',
        'sexta': 'friday', 'sábado': 'saturday', 'sabado': 'saturday', 'domingo': 'sunday',
        'monday': 'monday', 'tuesday': 'tuesday', 'wednesday': 'wednesday', 'thursday': 'thursday',
        'friday': 'friday', 'saturday': 'saturday', 'sunday': 'sunday'
      };
      
      await delay(2000);

      // SCROLL no painel lateral para revelar a seção de horários (que fica abaixo da dobra)
      console.log('📜 Fazendo scroll no painel lateral para revelar horários...');
      for (let scrollStep = 0; scrollStep < 5; scrollStep++) {
        await page.evaluate(() => {
          const selectors = [
            'div[role="main"]',
            '.m6QErb.DxyBCb',
            '.m6QErb',
            '.DxyBCb',
            'div.m6QErb.WNBkOb',
            'div[tabindex="-1"]'
          ];
          for (const sel of selectors) {
            const panel = document.querySelector(sel);
            if (panel && panel.scrollHeight > panel.clientHeight) {
              panel.scrollTop += 400;
              return;
            }
          }
          window.scrollBy(0, 400);
        });
        await delay(600);
      }
      await delay(1000);

      const clicked = await page.evaluate(() => {
        // Strategy 1: data-item-id="oh" (método oficial do Google Maps)
        const ohEl = document.querySelector('[data-item-id="oh"]') || document.querySelector('[data-item-id^="oh"]');
        if (ohEl) {
          const btn = ohEl.closest('button') || ohEl;
          btn.click();
          return 'data-item-id=oh';
        }

        // Strategy 2: aria-label contendo horário/aberto/fechado
        const ariaEls = document.querySelectorAll('[aria-label]');
        for (const el of ariaEls) {
          const label = (el.getAttribute('aria-label') || '').toLowerCase();
          if (label.includes('fechar')) continue;
          if ((label.includes('horário') || label.includes('aberto') || label.includes('fechado') || label.includes('abre') || label.includes('fecha')) &&
              (el.tagName === 'BUTTON' || el.closest('button') || el.getAttribute('role') === 'button')) {
            const clickable = el.closest('button') || el;
            clickable.click();
            return 'aria-label: ' + label.substring(0, 60);
          }
        }

        // Strategy 3: Busca por classe CsEnBe ou texto direto
        const btn = document.querySelector('button.CsEnBe');
        if (btn) { btn.click(); return 'CsEnBe class'; }

        const candidates = Array.from(document.querySelectorAll('button, div[role="button"], span'));
        const ohBtn = candidates.find(b => {
          const text = b.textContent.trim().toLowerCase();
          return (text.includes('horários') || text.includes('fechado') || text.includes('aberto') || 
                  text.includes('fecha às') || text.includes('abre às')) && text.length < 120;
        });
        if (ohBtn) {
          const clickable = ohBtn.closest('button') || ohBtn;
          clickable.click();
          return 'text match';
        }

        return false;
      });

      if (clicked) {
        console.log(`👉 Botão de horários clicado via [${clicked}], aguardando 2s para expansão...`);
        await delay(2000);
      } else {
        console.log('⚠️ Botão de horários NÃO encontrado. Tentando extrair tabela parcial...');
      }
      
      const details = await extractOpeningHoursFromPage(page, dayMapping);
      
      if (details && details.openingHours) {
        console.log(`✅ Horários encontrados! Salvando no Supabase...`);
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ opening_hours: details.openingHours })
          .eq('id', item.id);
          
        if (updateError) {
          console.error(`⚠️ Erro ao atualizar no Supabase:`, updateError.message);
        } else {
          console.log(`✅ [Supabase] Horários atualizados com sucesso!`);
          success = true;
          foundUrl = "hours_updated";
        }
      } else {
        console.log(`❌ Horários de funcionamento não encontrados.`);
      }
    }
  } catch (err) {
    console.error(`❌ Erro durante a rebusca:`, err.message);
  } finally {
    await browser.close();
    console.log(`RESULT:{"success":${success},"url":${foundUrl ? JSON.stringify(foundUrl) : 'null'}}`);
  }
}

const args = process.argv.slice(2);
const isSingle = args.includes('--single');
if (isSingle) {
  const idIndex = args.indexOf('--id');
  const fieldIndex = args.indexOf('--field');
  const restaurantId = idIndex !== -1 ? args[idIndex + 1] : null;
  const field = fieldIndex !== -1 ? args[fieldIndex + 1] : null;
  
  if (!restaurantId || !field) {
    console.error('❌ Argumentos inválidos para modo single. Uso: --single --id <id> --field <instagram|menu>');
    process.exit(1);
  }
  
  runSingle(restaurantId, field).catch(err => {
    console.error('❌ Erro fatal no modo single:', err);
    process.exit(1);
  });
} else {
  run().catch(err => {
    console.error('\n❌ Erro fatal:', err);
    process.exit(1);
  });
}
