/**
 * Re-Scraper Robot (Re-insistência em dados faltantes)
 * 
 * Após a Fase 2 de coleta, alguns restaurantes ficam com dados incompletos
 * (telefone, horários, Instagram, site, etc). Este robô:
 * 1. Lê o JSON gerado pelo google_maps_scraper.cjs
 * 2. Identifica restaurantes com campos faltantes
 * 3. Reabre cada link do Google Maps e tenta coletar APENAS os dados que faltam
 * 4. Atualiza o JSON com os novos dados encontrados
 * 
 * Para executar:
 * node scratch/re_scraper.cjs
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'scraped_restaurants_google.json');
const STATE_FILE = path.join(__dirname, 're_scraper_state.json');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Mapeamento de dias da semana (PT/EN -> inglês)
const dayMapping = {
  'segunda': 'monday',
  'terça': 'tuesday',
  'quarta': 'wednesday',
  'quinta': 'thursday',
  'sexta': 'friday',
  'sábado': 'saturday',
  'sabado': 'saturday',
  'domingo': 'sunday',
  'monday': 'monday',
  'tuesday': 'tuesday',
  'wednesday': 'wednesday',
  'thursday': 'thursday',
  'friday': 'friday',
  'saturday': 'saturday',
  'sunday': 'sunday'
};

function isMissing(value) {
  return !value || value === '' || value === 'Sem telefone' || value === 'sem telefone' || value === undefined || value === null;
}

function hasAllDaysClosed(openingHours) {
  if (!openingHours) return true;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.every(day => !openingHours[day] || !openingHours[day].isOpen);
}

function checkMissingFields(restaurant) {
  const missing = [];

  if (isMissing(restaurant.phone)) missing.push('phone');
  if (isMissing(restaurant.website)) missing.push('website');
  if (isMissing(restaurant.instagram)) missing.push('instagram');
  if (isMissing(restaurant.facebook)) missing.push('facebook');
  if (isMissing(restaurant.menuSourceUrl)) missing.push('menuSourceUrl');
  if (!restaurant.openingHours || hasAllDaysClosed(restaurant.openingHours)) missing.push('openingHours');

  return missing;
}

function cleanPhone(phone) {
  if (!phone) return '';
  return phone.replace(/[^\d\s()\-+]/g, '').trim();
}

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

async function extractMissingFields(page, restaurant, missingFields) {
  console.log(`   🔍 Extraindo campos faltantes: ${missingFields.join(', ')}...`);

  return await page.evaluate((missing, dayMap) => {
    const result = {};

    // Telefone
    if (missing.includes('phone')) {
      const phoneBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
      if (phoneBtn) {
        result.phone = phoneBtn.textContent.trim();
      } else {
        const allButtons = Array.from(document.querySelectorAll('button'));
        const pBtn = allButtons.find(b =>
          b.getAttribute('aria-label')?.includes('Telefone') ||
          b.textContent.match(/\(\d{2}\)\s\d{4,5}-\d{4}/)
        );
        if (pBtn) result.phone = pBtn.textContent.trim();
      }
    }

    // Website
    if (missing.includes('website')) {
      const websiteBtn = document.querySelector('a[data-item-id="authority"]');
      if (websiteBtn) {
        result.website = websiteBtn.getAttribute('href') || '';
      }
    }

    // Instagram/Facebook
    if (missing.includes('instagram') || missing.includes('facebook')) {
      const allLinks = Array.from(document.querySelectorAll('a'));
      allLinks.forEach(a => {
        const href = a.getAttribute('href') || '';
        if (missing.includes('instagram') && href.includes('instagram.com/') && !result.instagram) {
          result.instagram = href;
        }
        if (missing.includes('facebook') && href.includes('facebook.com/') && !result.facebook) {
          result.facebook = href;
        }
      });
    }

    // Menu URL
    if (missing.includes('menuSourceUrl')) {
      const menuBtn = document.querySelector('a[data-item-id="menu"]');
      if (menuBtn) {
        result.menuSourceUrl = menuBtn.getAttribute('href') || '';
      } else {
        const allLinks = Array.from(document.querySelectorAll('a'));
        const menuLink = allLinks.find(a => {
          const href = (a.getAttribute('href') || '').toLowerCase();
          const label = (a.getAttribute('aria-label') || '').toLowerCase();
          const text = (a.textContent || '').toLowerCase();
          return (href.includes('menu') || href.includes('cardapio') || label.includes('cardápio') || text.includes('cardápio') || label.includes('menu') || text.includes('menu')) && !href.includes('google.com');
        });
        if (menuLink) result.menuSourceUrl = menuLink.getAttribute('href') || '';
      }
    }

    // Opening Hours
    if (missing.includes('openingHours')) {
      // Tenta expandir a tabela de horários
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

      // Parse dos horários
      const tempHours = {};
      Object.values(dayMap).forEach(day => {
        tempHours[day] = { isOpen: false, slots: [] };
      });

      let foundAny = false;
      const hoursTable = (() => {
        const tables = Array.from(document.querySelectorAll('table'));
        for (const tbl of tables) {
          const text = tbl.textContent.toLowerCase();
          const hasDay = Object.keys(dayMap).some(day => text.includes(day));
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
            for (const key of Object.keys(dayMap)) {
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
            for (const [key, val] of Object.entries(dayMap)) {
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

      // Fallback scanner
      if (!foundAny) {
        const allElements = Array.from(document.querySelectorAll('div, span, p, tr, li'));
        for (const el of allElements) {
          const text = el.textContent.trim();
          if (!text || text.length > 150) continue;
          const lowerText = text.toLowerCase();
          for (const [key, val] of Object.entries(dayMap)) {
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

      if (foundAny) {
        result.openingHours = tempHours;
      }
    }

    // Verifica se o local está fechado permanentemente
    const closedEl = Array.from(document.querySelectorAll('span, div')).find(el => {
      const text = el.textContent.trim().toLowerCase();
      return text === 'permanentemente fechado' || text === 'temporariamente fechado' ||
             text === 'permanently closed' || text === 'temporarily closed';
    });
    if (closedEl) result.isClosed = true;

    return result;
  }, missingFields, dayMapping);
}

async function run() {
  console.log(`\n=============================================================`);
  console.log(`🤖 RE-SCRAPER: RE-INSISTÊNCIA EM DADOS FALTANTES`);
  console.log(`=============================================================\n`);

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ Erro: ${JSON_PATH} não encontrado!`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  if (!Array.isArray(data)) {
    console.error(`❌ Erro: Formato do JSON inválido.`);
    process.exit(1);
  }

  console.log(`📂 Carregados ${data.length} estabelecimentos do JSON.`);

  // Identifica restaurantes com dados faltantes
  const needsRevisit = data.map((item, idx) => ({
    index: idx,
    restaurant: item,
    missingFields: checkMissingFields(item)
  })).filter(item => item.missingFields.length > 0);

  if (needsRevisit.length === 0) {
    console.log(`✨ Todos os ${data.length} estabelecimentos já possuem dados completos!`);
    process.exit(0);
  }

  console.log(`\n🔍 Encontrados ${needsRevisit.length} estabelecimentos com dados faltantes:`);
  needsRevisit.forEach((item, idx) => {
    console.log(`   ${idx + 1}. "${item.restaurant.name}" - faltando: ${item.missingFields.join(', ')}`);
  });

  // Carrega estado salvo se existir
  let startIndex = 0;
  if (fs.existsSync(STATE_FILE)) {
    try {
      const savedState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      startIndex = savedState.lastProcessedIndex + 1;
      console.log(`\n🔄 Estado recuperado! Retomando do índice ${startIndex}...`);
    } catch (e) {
      console.log(`\n⚠️ Estado corrompido. Iniciando do início...`);
    }
  }

  console.log(`\n🚀 Inicializando navegador Chrome...`);
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--lang=pt-BR']
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9'
  });

  let updatedCount = 0;
  let skippedCount = 0;

  for (let idx = startIndex; idx < needsRevisit.length; idx++) {
    const { index: dataIndex, restaurant, missingFields } = needsRevisit[idx];

    console.log(`\n-------------------------------------------------------------`);
    console.log(`[${idx + 1}/${needsRevisit.length}] "${restaurant.name}"`);
    console.log(`   Faltando: ${missingFields.join(', ')}`);

    let url = restaurant.googleMapsUrl;
    if (!url || (!url.startsWith('http'))) {
      console.log(`   ⚠️ URL do Google Maps inválida ou ausente. Pulando...`);
      skippedCount++;
      continue;
    }

    // Garante que a URL tem o formato correto
    if (!url.startsWith('https://www.google.com/maps/')) {
      url = `https://www.google.com/maps/place/${encodeURIComponent(restaurant.name)}`;
    }

    const navSuccess = await navigateWithRetry(page, url);
    if (!navSuccess) {
      console.log(`   ⚠️ Não foi possível carregar a página. Pulando...`);
      skippedCount++;
      continue;
    }

    let details;
    try {
      details = await extractMissingFields(page, restaurant, missingFields);
    } catch (err) {
      console.log(`   ⚠️ Erro ao extrair dados: ${err.message}. Pulando...`);
      skippedCount++;
      continue;
    }

    if (details.isClosed) {
      console.log(`   ⛔ Estabelecimento está fechado permanentemente. Pulando...`);
      skippedCount++;
      continue;
    }

    // Atualiza apenas os campos que estavam faltando e foram encontrados
    let foundAny = false;
    if (missingFields.includes('phone') && details.phone) {
      const cleaned = cleanPhone(details.phone);
      if (cleaned) {
        restaurant.phone = cleaned;
        console.log(`   ✅ Telefone encontrado: ${cleaned}`);
        foundAny = true;
      }
    }
    if (missingFields.includes('website') && details.website) {
      restaurant.website = details.website;
      console.log(`   ✅ Website encontrado: ${details.website}`);
      foundAny = true;
    }
    if (missingFields.includes('instagram') && details.instagram) {
      restaurant.instagram = details.instagram;
      console.log(`   ✅ Instagram encontrado: ${details.instagram}`);
      foundAny = true;
    }
    if (missingFields.includes('facebook') && details.facebook) {
      restaurant.facebook = details.facebook;
      console.log(`   ✅ Facebook encontrado: ${details.facebook}`);
      foundAny = true;
    }
    if (missingFields.includes('menuSourceUrl') && details.menuSourceUrl) {
      restaurant.menuSourceUrl = details.menuSourceUrl;
      console.log(`   ✅ Cardápio encontrado: ${details.menuSourceUrl}`);
      foundAny = true;
    }
    if (missingFields.includes('openingHours') && details.openingHours) {
      restaurant.openingHours = details.openingHours;
      console.log(`   ✅ Horários encontrados!`);
      foundAny = true;
    }

    if (foundAny) {
      updatedCount++;
      // Salva o JSON e o estado
      fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');

      const savedState = { lastProcessedIndex: idx };
      fs.writeFileSync(STATE_FILE, JSON.stringify(savedState, null, 2), 'utf-8');

      console.log(`   💾 Dados salvos no JSON.`);
    } else {
      console.log(`   ❌ Nenhum campo novo foi encontrado.`);
      skippedCount++;
    }

    // Aguarda para evitar detecção
    const waitTime = 2000 + Math.random() * 3000;
    console.log(`   ⏱️ Aguardando ${Math.round(waitTime)}ms...`);
    await delay(waitTime);
  }

  await browser.close();

  // Remove arquivo de estado se tudo foi concluído
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }

  console.log(`\n=============================================================`);
  console.log(`🎉 RE-SCRAPER CONCLUÍDO!`);
  console.log(`📊 Total processados: ${needsRevisit.length}`);
  console.log(`✅ Atualizados com sucesso: ${updatedCount}`);
  console.log(`⏭️ Pulados (sem dados novos): ${skippedCount}`);
  console.log(`📂 JSON atualizado: ${JSON_PATH}`);
  console.log(`=============================================================\n`);
}

run().catch(err => {
  console.error('\n❌ Erro fatal:', err);
  process.exit(1);
});
