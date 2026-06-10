/**
 * Google Maps Scraper Robot (Local Browser Automation - Category + Neighborhood Grid Scan)
 * 
 * Este robô pesquisa por Categoria + Bairro nos principais bairros de João Pessoa, PB.
 * Possui persistência de estado (reserva/resume) e proteção contra travamentos/timeouts.
 * 
 * Para executar:
 * node scratch/google_maps_scraper.cjs
 */

const fs = require('fs');
const path = require('path');

// 1. Garante que o Puppeteer está instalado
try {
  require('puppeteer');
} catch (e) {
  console.log('[ROBÔ] Puppeteer não encontrado. Instalando automaticamente (isso pode levar de 1 a 2 minutos)...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install puppeteer --no-save', { stdio: 'inherit' });
    console.log('[ROBÔ] Puppeteer instalado com sucesso!');
  } catch (installError) {
    console.error('[ERRO] Falha ao instalar Puppeteer de forma automática. Por favor, execute: npm install puppeteer');
    process.exit(1);
  }
}

const puppeteer = require('puppeteer');
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

async function saveToSupabase(scrapedItem) {
  try {
    const uuidId = uuidFrom(scrapedItem.id);
    
    let latitude = null;
    let longitude = null;
    if (scrapedItem.googleMapsUrl) {
      const matchLat = scrapedItem.googleMapsUrl.match(/!3d(-?\d+\.\d+)/);
      const matchLng = scrapedItem.googleMapsUrl.match(/!4d(-?\d+\.\d+)/);
      if (matchLat && matchLng) {
        latitude = parseFloat(matchLat[1]);
        longitude = parseFloat(matchLng[1]);
      }
    }

    const social_networks = [];
    if (scrapedItem.instagram) {
      social_networks.push({ platform: 'instagram', url: scrapedItem.instagram });
    }
    if (scrapedItem.facebook) {
      social_networks.push({ platform: 'facebook', url: scrapedItem.facebook });
    }

    const restaurantData = {
      id: uuidId,
      name: scrapedItem.name,
      plan: 'free',
      phone: (scrapedItem.phone || '').replace(/[^\d+]/g, ''),
      address: scrapedItem.address || '',
      neighborhood: scrapedItem.neighborhood || '',
      city: scrapedItem.city || 'João Pessoa',
      state: scrapedItem.state || 'PB',
      category: scrapedItem.category || 'Restaurante',
      cover_image_url: scrapedItem.coverImage || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
      image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100',
      visit_status: 'Pendente',
      visit_notes: scrapedItem.googleMapsUrl ? `Google Maps: ${scrapedItem.googleMapsUrl}` : '',
      claim_code: 'CLAIM-' + uuidId.substring(0, 5).toUpperCase(),
      opening_hours: scrapedItem.openingHours || null,
      social_networks: social_networks,
      other_url: scrapedItem.menuSourceUrl || null,
      external_url: scrapedItem.menuSourceUrl || null,
      latitude,
      longitude
    };

    console.log(`📡 [Supabase] Salvando "${scrapedItem.name}"...`);
    const { error } = await supabase
      .from('restaurants')
      .upsert(restaurantData, { onConflict: 'id' });

    if (error) {
      console.error(`⚠️  [Supabase] Erro ao salvar "${scrapedItem.name}":`, error.message);
    } else {
      console.log(`✅ [Supabase] "${scrapedItem.name}" salvo no banco remoto!`);
    }
  } catch (err) {
    console.error(`⚠️  [Supabase] Erro inesperado ao salvar:`, err.message);
  }
}



// Configurações da Varredura
const CITY = 'João Pessoa';
const STATE = 'PB';

// Lista completa de todos os bairros urbanos de João Pessoa para cobertura geográfica total
const NEIGHBORHOODS = [
  'Tambaú',
  'Manaíra',
  'Cabo Branco',
  'Bessa',
  'Altiplano',
  'Centro',
  'Torre',
  'Miramar',
  'Bancários',
  'Mangabeira',
  'Bairro dos Estados',
  'Jaguaribe',
  'Geisel',
  'Valentina de Figueiredo',
  'Castelo Branco',
  'Aeroclube',
  'Água Fria',
  'Alto do Céu',
  'Alto do Mateus',
  'Anatólia',
  'Bairro das Indústrias',
  'Bairro dos Ipês',
  'Barra de Gramame',
  'Brisamar',
  'Cidade dos Colibris',
  'Costa do Sol',
  'Costa e Silva',
  'Cristo Redentor',
  'Cruz das Armas',
  'Cuiá',
  'Ernâni Sátiro',
  'Expedicionários',
  'Funcionários',
  'Gramame',
  'Grotão',
  'Ilha do Bispo',
  'Jardim Cidade Universitária',
  'Jardim Oceania',
  'Jardim São Paulo',
  'Jardim Veneza',
  'João Agripino',
  'João Paulo II',
  'José Américo',
  'Mandacaru',
  'Oitizeiro',
  'Padre Zé',
  'Paratibe',
  'Penha',
  'Portal do Sol',
  'Róger',
  'São José',
  'Tambauzinho',
  'Varadouro',
  'Varjão'
];

// Categorias para mapear todos os nichos de alimentação
const CATEGORIES = [
  'Restaurante',
  'Pizzaria',
  'Hamburgueria',
  'Lanchonete',
  'Cafeteria'
];

const MAX_RESULTS_PER_SEARCH = 120; // Limite por combinação (bairro + categoria)
const MAX_TOTAL_DETAILS = 30; // Limite total de detalhes completos para extrair (telefones)
const LIMIT_LISTING_ITEMS = 30; // Limite de itens na Fase 1 antes de pular para a Fase 2 (null para sem limite)
const CLICK_TO_GET_PHONE = true; 
const OUTPUT_FILE = path.join(__dirname, '..', 'scraped_restaurants_google.json');
const STATE_FILE = path.join(__dirname, 'google_maps_scraper_state.json');

// Banco de imagens Unsplash para categorias
const unsplashImages = {
  "Regional": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
  "Frutos do Mar": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800",
  "Churrascaria": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
  "Italiana": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800",
  "Pizzaria": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
  "Japonesa": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800",
  "Hamburgueria": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
  "Cafeteria": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
  "Restaurante": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"
};

// Objeto de horários padrão (caso falhe na coleta)
const defaultHours = {
  monday: { isOpen: false, slots: [] },
  tuesday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
  wednesday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
  thursday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
  friday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
  saturday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
  sunday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] }
};

function formatRestaurantNameWithLocation(originalName, addressVal, cityVal = 'João Pessoa', neighborhoodVal = '') {
  if (!originalName) return originalName;

  // Clean strings from private use area characters like  and 
  let cleanName = originalName.replace(/[\uE000-\uF8FF]/g, '').trim();
  let cleanAddress = (addressVal || '').replace(/[\uE000-\uF8FF]/g, '').trim();
  let cleanCity = (cityVal || 'João Pessoa').replace(/[\uE000-\uF8FF]/g, '').trim();
  let cleanNeighborhood = (neighborhoodVal || '').replace(/[\uE000-\uF8FF]/g, '').trim();

  // If neighborhood is empty, try to extract it from address
  if (!cleanNeighborhood && cleanAddress) {
    const parts = cleanAddress.split(',');
    if (parts.length > 1) {
      const streetParts = parts[0].split('-');
      if (streetParts.length > 1) {
        cleanNeighborhood = streetParts[streetParts.length - 1].trim();
      } else {
        const secondPart = parts[1].split('-')[0].trim();
        if (secondPart && !secondPart.toLowerCase().includes(cleanCity.toLowerCase())) {
          cleanNeighborhood = secondPart;
        }
      }
    }
  }

  // Normalize strings for comparison (remove accents, lowercase, remove non-alphanumeric)
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const normName = normalize(cleanName);
  const normCity = normalize(cleanCity);
  const normNeighborhood = normalize(cleanNeighborhood);

  // If neighborhood or city is already part of the name, return cleanName
  if (normNeighborhood && normName.includes(normNeighborhood)) {
    return cleanName;
  }
  if (normCity && normName.includes(normCity)) {
    return cleanName;
  }

  // Check if any word from the neighborhood name or city is in the name
  const isWordInName = (locStr) => {
    if (!locStr) return false;
    const words = locStr.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[\s,.-]+/)
      .filter(w => w.length > 3 && !['avenida', 'rua', 'bloco', 'apartamento', 'casa', 'numero', 'joao', 'pessoa', 'shopping', 'praia'].includes(w));
    for (const w of words) {
      if (normName.includes(w)) return true;
    }
    return false;
  };

  if (isWordInName(cleanNeighborhood) || isWordInName(cleanCity)) {
    return cleanName;
  }

  // Choose the location qualifier to append
  const location = cleanNeighborhood || cleanCity;
  if (location) {
    return `${cleanName} - ${location}`;
  }

  return cleanName;
}

// Salva o estado atual do progresso
function saveState(state) {
  const data = {
    searchIdx: state.searchIdx,
    seenPlaceUrls: Array.from(state.seenPlaceUrls),
    allCollectedPlaces: state.allCollectedPlaces,
    scrapedData: state.scrapedData,
    detailsIndex: state.detailsIndex,
    phase: state.phase,
    completedQueries: state.completedQueries || []
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Salva o progresso completo (estado + resultados parciais)
function saveProgress(state) {
  try {
    saveState(state);
    // fs.writeFileSync(OUTPUT_FILE, JSON.stringify(state.scrapedData, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ERRO] Falha ao salvar progresso:', err.message);
  }
}

// Carrega o estado salvo se existir
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      return {
        searchIdx: data.searchIdx || 0,
        seenPlaceUrls: new Set(data.seenPlaceUrls || []),
        allCollectedPlaces: data.allCollectedPlaces || [],
        scrapedData: data.scrapedData || [],
        detailsIndex: data.detailsIndex || 0,
        phase: data.phase || 'listing',
        completedQueries: data.completedQueries || []
      };
    } catch (e) {
      console.error('[WARN] Erro ao ler arquivo de estado. Iniciando nova busca.', e);
    }
  }
  return null;
}

// Função auxiliar para navegar com timeout e retry automático se travar
async function navigateWithRetry(page, url, maxRetries = 2) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      attempt++;
      // Espera domcontentloaded (HTML carregado) ao invés de networkidle2 (que trava fácil se houver imagens lentas)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // Aguarda mais 1.5s após carregar o DOM para estabilização
      await new Promise(r => setTimeout(r, 1500));
      return true;
    } catch (err) {
      console.log(`   [ROBÔ] Tentativa ${attempt} falhou ao carregar a página: ${err.message}. Recarregando...`);
      if (attempt >= maxRetries) {
        return false;
      }
    }
  }
  return false;
}

(async () => {
  // Carrega ou inicializa o estado
  let state = loadState();
  if (!state) {
    let existingData = [];
    let seenUrls = new Set();
    if (fs.existsSync(OUTPUT_FILE)) {
      try {
        const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf-8');
        if (fileContent.trim()) {
          existingData = JSON.parse(fileContent);
          if (Array.isArray(existingData)) {
            console.log(`\n=============================================================`);
            console.log(`📂 CARREGANDO DADOS JÁ COLETADOS ANTERIORMENTE!`);
            console.log(`📍 Encontrados ${existingData.length} estabelecimentos já detalhados.`);
            console.log(`=============================================================\n`);
            existingData.forEach(item => {
              if (item.googleMapsUrl) {
                const cleanUrl = item.googleMapsUrl.split('?')[0];
                seenUrls.add(cleanUrl);
              }
            });
          } else {
            existingData = [];
          }
        }
      } catch (err) {
        console.error('[WARN] Erro ao ler dados existentes em scraped_restaurants_google.json:', err.message);
      }
    }

    state = {
      searchIdx: 0,
      seenPlaceUrls: seenUrls,
      allCollectedPlaces: [],
      scrapedData: existingData,
      detailsIndex: 0,
      phase: 'listing',
      completedQueries: []
    };
  } else {
    console.log(`\n=============================================================`);
    console.log(`🔄 RECUPERAÇÃO DE ESTADO DETECTADA!`);
    console.log(`📍 Fase atual: "${state.phase === 'listing' ? 'COLETA DE LINKS' : 'COLETA DE DETALHES'}"`);
    console.log(`📍 Progresso: busca ${state.searchIdx} ou detalhe ${state.detailsIndex}`);
    console.log(`=============================================================\n`);
  }

  // Intercepta Ctrl+C e salva o estado
  process.on('SIGINT', () => {
    console.log('\n🛑 [ROBÔ] Interrupção manual (Ctrl+C) detectada! Salvando progresso...');
    if (state) {
      saveProgress(state);
    }
    process.exit(0);
  });

  console.log(`\n=============================================================`);
  console.log(`🤖 INICIANDO ROBÔ DE VARREDURA POR CATEGORIA E BAIRRO`);
  console.log(`🏙️ Cidade: "${CITY} - ${STATE}"`);
  console.log(`📂 Destino: "${OUTPUT_FILE}"`);
  console.log(`=============================================================\n`);

  // Inicializa o navegador Chrome visível
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--lang=pt-BR']
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.text().startsWith('[ROBO-DEBUG]')) {
      console.log(`[Aba 1] ${msg.text()}`);
    }
  });
  
  // Define idioma em português nas requisições HTTP
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9'
  });

  const feedSelector = 'div[role="feed"], div.m6QErb.DxyBCb, div.m6QErb[aria-label*="Resultados"]';
  const itemLinkSelector = 'a[href*="/maps/place/"]';

  try {
    // FASE 1: VARREDURA RÁPIDA DE LISTAGENS
    if (state.phase === 'listing') {
      // Cria a lista plana de todas as buscas possíveis
      const searchQueries = [];
      for (const neighborhood of NEIGHBORHOODS) {
        for (const category of CATEGORIES) {
          searchQueries.push({ neighborhood, category });
        }
      }
      const totalSearches = searchQueries.length;

      // Inicializa completedQueries caso não exista no estado recuperado
      if (!state.completedQueries) {
        state.completedQueries = [];
        // Retro-compatibilidade com busca anterior baseada em índice
        for (let idx = 0; idx < state.searchIdx; idx++) {
          if (searchQueries[idx]) {
            state.completedQueries.push(`${searchQueries[idx].category}|${searchQueries[idx].neighborhood}`);
          }
        }
      }

      const remainingSearches = searchQueries.filter(item => {
        const key = `${item.category}|${item.neighborhood}`;
        return !state.completedQueries.includes(key);
      });

      console.log(`📈 Faltam realizar ${remainingSearches.length} buscas do total de ${totalSearches}.`);
      console.log(`🚀 Iniciando buscas paralelas com 3 abas simultâneas...\n`);

      // Abre abas no navegador (já temos a página "page" padrão, criamos mais 2)
      const CONCURRENCY = 3;
      const pages = [page];
      for (let c = 1; c < CONCURRENCY; c++) {
        const newPage = await browser.newPage();
        await newPage.setExtraHTTPHeaders({
          'Accept-Language': 'pt-BR,pt;q=0.9'
        });
        pages.push(newPage);
      }

      let activeSearchIdx = 0;
      const totalToSearch = remainingSearches.length;

      // Lock simples para escrita segura no estado compartilhado
      let isSavingListing = false;
      const pendingListingSaves = [];

      async function saveListingResult(placesFound, category, neighborhood, searchKey) {
        // Fila de escrita para evitar race conditions no estado compartilhado
        if (isSavingListing) {
          await new Promise(resolve => pendingListingSaves.push(resolve));
        }
        isSavingListing = true;

        try {
          let newCount = 0;
          for (const p of placesFound) {
            const cleanUrl = p.href.split('?')[0];
            if (!state.seenPlaceUrls.has(cleanUrl)) {
              state.seenPlaceUrls.add(cleanUrl);
              state.allCollectedPlaces.push({
                name: p.name,
                href: p.href,
                neighborhood: neighborhood,
                searchCategory: category
              });
              newCount++;
            }
          }
          
          state.completedQueries.push(searchKey);
          state.searchIdx = state.completedQueries.length;
          saveProgress(state);
          return newCount;
        } finally {
          isSavingListing = false;
          if (pendingListingSaves.length > 0) {
            const nextResolve = pendingListingSaves.shift();
            nextResolve();
          }
        }
      }

      async function runListingWorker(workerPage, workerId) {
        while (true) {
          if (LIMIT_LISTING_ITEMS && state.allCollectedPlaces.length >= LIMIT_LISTING_ITEMS) {
            console.log(`   [Aba ${workerId}] Limite de ${LIMIT_LISTING_ITEMS} itens atingido na Fase 1. Pulando para a Fase 2!`);
            break;
          }
          let i;
          // Event Loop do JS é single-threaded, então activeSearchIdx++ é atômico!
          i = activeSearchIdx++;
          if (i >= totalToSearch) break;

          const searchItem = remainingSearches[i];
          const { neighborhood, category } = searchItem;
          const searchKey = `${category}|${neighborhood}`;
          const query = `${category} em ${neighborhood}, ${CITY}, ${STATE}`;
          
          console.log(`[Aba ${workerId}] [${i + 1}/${totalToSearch}] 🔍 Pesquisando: "${query}"`);
          const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/`;

          const navSuccess = await navigateWithRetry(workerPage, url);
          if (!navSuccess) {
            console.log(`   [Aba ${workerId}] Falha persistente ao acessar o Google Maps. Pulando.`);
            await saveListingResult([], category, neighborhood, searchKey);
            continue;
          }

          // ESPERA DINÂMICA
          try {
            await workerPage.waitForSelector(itemLinkSelector, { timeout: 6000 });
          } catch (timeoutErr) {
            console.log(`   [Aba ${workerId}] Nenhum resultado carregado para esta busca. Pulando.`);
            await saveListingResult([], category, neighborhood, searchKey);
            continue;
          }

          // ROLAGEM DINÂMICA
          let lastCount = 0;
          let noChangeCount = 0;
          let scrollAttempts = 0;
          
          while (scrollAttempts < 35) {
            scrollAttempts++;
            
            const scrollResult = await workerPage.evaluate((feedSel, itemSel) => {
              const divs = Array.from(document.querySelectorAll('div.m6QErb, div[role="feed"]'));
              let feed = divs.find(el => el.scrollHeight > el.clientHeight && el.querySelector(itemSel));
              
              if (!feed) {
                feed = document.querySelector(feedSel);
              }
              const items = document.querySelectorAll(itemSel);
              if (feed && items.length > 0) {
                const lastItem = items[items.length - 1];
                lastItem.scrollIntoView({ behavior: 'instant', block: 'end' });
                feed.scrollTop = feed.scrollHeight;
                return {
                  scrolled: true,
                  foundFeed: true,
                  count: items.length
                };
              }
              return {
                scrolled: false,
                foundFeed: !!feed,
                count: items.length
              };
            }, feedSelector, itemLinkSelector);

            if (!scrollResult.foundFeed || !scrollResult.scrolled) {
              break;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

            const currentCount = await workerPage.evaluate((sel) => {
              return document.querySelectorAll(sel).length;
            }, itemLinkSelector);

            if (currentCount >= MAX_RESULTS_PER_SEARCH) {
              break;
            }

            if (currentCount === lastCount) {
              noChangeCount++;
              if (noChangeCount >= 6) {
                break;
              }
            } else {
              noChangeCount = 0;
            }
            lastCount = currentCount;

            const reachedEnd = await workerPage.evaluate((selector, itemSel) => {
              const divs = Array.from(document.querySelectorAll('div.m6QErb, div[role="feed"]'));
              let feed = divs.find(el => el.scrollHeight > el.clientHeight && el.querySelector(itemSel));
              
              if (!feed) {
                feed = document.querySelector(selector);
              }
              if (!feed) return false;
              
              const textElements = Array.from(feed.querySelectorAll('span, div, p'));
              const endMessages = textElements.filter(el => {
                const text = el.textContent.trim().toLowerCase();
                if (text.length > 80) return false;
                return text.includes('fim da lista') || 
                       text.includes('você chegou ao fim') || 
                       text.includes('não há mais resultados') ||
                       text.includes("you've reached the end of the list");
              });
              return endMessages.length > 0;
            }, feedSelector, itemLinkSelector);

            if (reachedEnd) {
              break;
            }
          }

          // Extrai links
          const placesFound = await workerPage.evaluate((sel) => {
            const anchors = document.querySelectorAll(sel);
            const links = [];
            anchors.forEach(a => {
              const href = a.getAttribute('href');
              const name = a.getAttribute('aria-label') || '';
              if (href && name) {
                links.push({ name, href });
              }
            });
            return links;
          }, itemLinkSelector);

          // Salva e mescla
          const newCount = await saveListingResult(placesFound, category, neighborhood, searchKey);
          console.log(`   [Aba ${workerId}] Encontrados ${placesFound.length} locais (${newCount} novos únicos). Acumulado: ${state.allCollectedPlaces.length}`);
        }
      }

      // Executa os workers paralelos de busca
      await Promise.all(pages.map((p, idx) => runListingWorker(p, idx + 1)));

      // Transiciona a fase para detalhes
      state.phase = 'details';
      saveProgress(state);
    }

    // FASE 2: EXTRAÇÃO DE DETALHES (TELEFONE, SITE, HORÁRIOS)
    if (state.phase === 'details') {
      console.log(`\n=============================================================`);
      console.log(`🎯 FASE DE LISTAGEM COMPLETA!`);
      console.log(`🏠 Total de estabelecimentos únicos encontrados: ${state.allCollectedPlaces.length}`);
      console.log(`🛠️ Iniciando/Retomando Fase 2: Extração de Detalhes em Paralelo...`);
      console.log(`=============================================================\n`);

      // Filtra os estabelecimentos que já foram detalhados (estão em scrapedData)
      const detailedUrls = new Set(state.scrapedData.map(r => r.googleMapsUrl.split('?')[0]));
      const remainingList = state.allCollectedPlaces.filter(p => !detailedUrls.has(p.href.split('?')[0]));
      
      const targetList = remainingList.slice(0, Math.max(0, MAX_TOTAL_DETAILS - state.scrapedData.length));
      
      console.log(`📈 Faltam coletar detalhes de ${targetList.length} estabelecimentos.`);
      console.log(`🚀 Iniciando coleta paralela com 3 abas simultâneas...\n`);

      // Abre mais abas no navegador (já temos a página "page" padrão, criamos mais 2)
      const CONCURRENCY = 3;
      const pages = [page];
      for (let c = 1; c < CONCURRENCY; c++) {
        const newPage = await browser.newPage();
        await newPage.setExtraHTTPHeaders({
          'Accept-Language': 'pt-BR,pt;q=0.9'
        });
        const workerId = c + 1;
        newPage.on('console', msg => {
          if (msg.text().startsWith('[ROBO-DEBUG]')) {
            console.log(`[Aba ${workerId}] ${msg.text()}`);
          }
        });
        pages.push(newPage);
      }

      let activeIndex = 0;
      let completedCount = 0;
      const totalToScrape = targetList.length;

      // Lock simples para escrita segura no array e salvamento
      let isSaving = false;
      const pendingSaves = [];
      
      async function saveScrapedItem(scrapedItem) {
        state.scrapedData.push(scrapedItem);
        completedCount++;
        
        // Fila de escrita para evitar concorrência no arquivo de disco
        if (isSaving) {
          await new Promise(resolve => pendingSaves.push(resolve));
        }
        isSaving = true;
        
        try {
          saveProgress(state);
          // Persiste diretamente no Supabase em tempo real
          await saveToSupabase(scrapedItem);
        } catch (saveErr) {
          console.error('[ERRO] Falha ao salvar progresso concorrente:', saveErr.message);
        } finally {
          isSaving = false;
          if (pendingSaves.length > 0) {
            const nextResolve = pendingSaves.shift();
            nextResolve();
          }
        }
      }

      async function runWorker(workerPage, workerId) {
        while (true) {
          let i;
          try {
            // Event Loop do JS é single-threaded, então activeIndex++ é atômico!
            i = activeIndex++;
            if (i >= totalToScrape) break;

            const place = targetList[i];
            console.log(`[Aba ${workerId}] [${i + 1}/${totalToScrape}] Coletando detalhes de: "${place.name}" (${place.neighborhood})`);

            let phone = '';
            let website = '';
            let address = '';
            let category = place.searchCategory || 'Restaurante';
            let rating = null;
            let reviewsCount = 0;
            let openingHours = null;
            let instagram = '';
            let facebook = '';
            let menuSourceUrl = '';
            let isClosed = false;

            if (CLICK_TO_GET_PHONE) {
              const navSuccess = await navigateWithRetry(workerPage, place.href);
              if (navSuccess) {
                try {
                   // Tenta expandir a tabela de horários
                   try {
                     // 1. Rola o painel lateral para trazer os detalhes para o viewport
                     await workerPage.evaluate(() => {
                       const panel = document.querySelector('div[role="main"]') || document.querySelector('.m6ZQ1b') || document.querySelector('.DxyBCb');
                       if (panel) panel.scrollTop = 500;
                     });
                     await new Promise(r => setTimeout(r, 800));

                     const isAlreadyExpanded = await workerPage.evaluate(() => {
                       const tbl = document.querySelector('table.e25n6b') || document.querySelector('table[class*="hours"]');
                       if (!tbl) return false;
                       return tbl.querySelectorAll('tr').length > 2;
                     });

                     if (!isAlreadyExpanded) {
                       const hoursBtn = await workerPage.evaluateHandle(() => {
                         // Busca o botão de expansão de horários de forma flexível (aria-label ou chevron)
                         return Array.from(document.querySelectorAll('*')).find(el => {
                           const label = el.getAttribute('aria-label') || '';
                           return label.toLowerCase().includes('horário de funcionamento da semana') ||
                                  label.toLowerCase().includes('mostrar horário') ||
                                  (el.textContent.trim() === '' && el.className.includes('OazX1c'));
                         }) || null;
                       });

                       if (hoursBtn && hoursBtn.asElement()) {
                         const element = hoursBtn.asElement();
                         const box = await element.boundingBox();
                         if (box) {
                           await workerPage.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                           await new Promise(r => setTimeout(r, 1200));
                         }
                       }
                     }
                   } catch (hoursClickErr) {}

                  // Executa a extração no DOM
                  const details = await workerPage.evaluate(() => {
                    // 0. Verifica se o local está permanentemente ou temporariamente fechado
                    let isClosed = false;
                    const closedEl = Array.from(document.querySelectorAll('span, div')).find(el => {
                      const text = el.textContent.trim().toLowerCase();
                      return text === 'permanentemente fechado' ||
                             text === 'temporariamente fechado' ||
                             text === 'permanently closed' ||
                             text === 'temporarily closed' ||
                             text.includes('permanentemente fechado') ||
                             text.includes('temporariamente fechado');
                    });
                    if (closedEl) {
                      isClosed = true;
                    }

                    let extractedPhone = '';
                    let extractedWebsite = '';
                    let extractedAddress = '';
                    let extractedCategory = '';
                    let extractedRating = 4.0;
                    let extractedReviews = 10;
                    let parsedHours = null;
                    let extractedInstagram = '';
                    let extractedFacebook = '';
                    let extractedMenu = '';

                    const allLinks = Array.from(document.querySelectorAll('a'));

                    // 1. Nota (com fallbacks robustos)
                    let ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]') || 
                                   document.querySelector('span.Aq14fc') ||
                                   document.querySelector('div.fontBodyMedium span[aria-hidden="true"]');
                    
                    if (ratingEl) {
                      const text = ratingEl.textContent.trim().replace(',', '.');
                      const num = parseFloat(text);
                      if (!isNaN(num) && num >= 1 && num <= 5) {
                        extractedRating = num;
                      }
                    } else {
                      const starSpan = Array.from(document.querySelectorAll('span[aria-label*="estrela"], span[aria-label*="star"]'))
                        .find(el => {
                          const label = el.getAttribute('aria-label') || '';
                          return label.includes('estrela') || label.includes('star');
                        });
                      if (starSpan) {
                        const label = starSpan.getAttribute('aria-label') || '';
                        const match = label.match(/([0-9],[0-9])|([0-9]\.[0-9])/);
                        if (match) {
                          extractedRating = parseFloat(match[0].replace(',', '.'));
                        }
                      }
                    }

                    // 2. Avaliações (limpando pontos de milhar, ex: "1.250 avaliações")
                    let reviewsEl = document.querySelector('div.F7nice span[aria-label*="avalia"]') ||
                                    document.querySelector('span[aria-label*="avalia"]') ||
                                    document.querySelector('span[aria-label*="review"]') ||
                                    document.querySelector('button[aria-label*="avalia"]') ||
                                    document.querySelector('button[aria-label*="review"]');
                    
                    if (reviewsEl) {
                      const rText = reviewsEl.getAttribute('aria-label') || reviewsEl.textContent || '';
                      const cleanedText = rText.replace(/\./g, '');
                      const match = cleanedText.match(/(\d+)/);
                      if (match) {
                        extractedReviews = parseInt(match[0], 10);
                      }
                    }

                    // 3. Categoria
                    const categoryEl = document.querySelector('button[class*="D72N9b"]') ||
                                       document.querySelector('button[jsaction*="category"]') ||
                                       document.querySelector('span.fontBodyMedium button');
                    if (categoryEl) {
                      extractedCategory = categoryEl.textContent.trim();
                    }

                    // 4. Endereço
                    const addressBtn = document.querySelector('button[data-item-id="address"]');
                    if (addressBtn) {
                      extractedAddress = addressBtn.textContent.trim();
                    }

                    // 5. Telefone
                    const phoneBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
                    if (phoneBtn) {
                      extractedPhone = phoneBtn.textContent.trim();
                    } else {
                      const allButtons = Array.from(document.querySelectorAll('button'));
                      const pBtn = allButtons.find(b => b.getAttribute('aria-label')?.includes('Telefone') || b.textContent.match(/\(\d{2}\)\s\d{4,5}-\d{4}/));
                      if (pBtn) extractedPhone = pBtn.textContent.trim();
                    }

                    // 6. Website
                    const websiteBtn = document.querySelector('a[data-item-id="authority"]');
                    if (websiteBtn) {
                      extractedWebsite = websiteBtn.getAttribute('href') || '';
                    }

                    // 7. Cardápio / Menu (data-item-id="menu" ou links contendo termos relacionados)
                    const menuBtn = document.querySelector('a[data-item-id="menu"]');
                    if (menuBtn) {
                      extractedMenu = menuBtn.getAttribute('href') || '';
                    } else {
                      const menuLink = allLinks.find(a => {
                        const href = (a.getAttribute('href') || '').toLowerCase();
                        const label = (a.getAttribute('aria-label') || '').toLowerCase();
                        const text = (a.textContent || '').toLowerCase();
                        return (href.includes('menu') || href.includes('cardapio') || label.includes('cardápio') || text.includes('cardápio') || label.includes('menu') || text.includes('menu')) && !href.includes('google.com');
                      });
                      if (menuLink) extractedMenu = menuLink.getAttribute('href') || '';
                    }

                    // 8. Instagram e Facebook (links reais no painel do Google Maps)
                    allLinks.forEach(a => {
                      const href = a.getAttribute('href') || '';
                      if (href.includes('instagram.com/')) {
                        extractedInstagram = href;
                      } else if (href.includes('facebook.com/')) {
                        extractedFacebook = href;
                      }
                    });

                    console.log('[ROBO-DEBUG] Procurando tabela de horários...');
                    const dayMapping = {
                      // Portuguese
                      'segunda': 'monday',
                      'terça': 'tuesday',
                      'quarta': 'wednesday',
                      'quinta': 'thursday',
                      'sexta': 'friday',
                      'sábado': 'saturday',
                      'sabado': 'saturday',
                      'domingo': 'sunday',
                      // English
                      'monday': 'monday',
                      'tuesday': 'tuesday',
                      'wednesday': 'wednesday',
                      'thursday': 'thursday',
                      'friday': 'friday',
                      'saturday': 'saturday',
                      'sunday': 'sunday'
                    };

                    const findHoursTable = () => {
                      const tables = Array.from(document.querySelectorAll('table'));
                      for (const tbl of tables) {
                        const text = tbl.textContent.toLowerCase();
                        const hasDay = Object.keys(dayMapping).some(day => text.includes(day));
                        if (hasDay) return tbl;
                      }
                      return null;
                    };
                    const hoursTable = findHoursTable();
                    console.log('[ROBO-DEBUG] hoursTable encontrado? ' + !!hoursTable);

                    const tempHours = {};
                    Object.values(dayMapping).forEach(day => {
                      tempHours[day] = { isOpen: false, slots: [] };
                    });

                    let foundAny = false;

                    if (hoursTable) {
                      const rows = Array.from(hoursTable.querySelectorAll('tr'));
                      console.log('[ROBO-DEBUG] Linhas tr encontradas: ' + rows.length);
                      rows.forEach((tr, rIdx) => {
                        const cells = Array.from(tr.querySelectorAll('td'));
                        let dayCell = null;
                        let timeCell = null;
                        
                        cells.forEach(td => {
                          const text = td.textContent.trim().toLowerCase();
                          let isDay = false;
                          for (const key of Object.keys(dayMapping)) {
                            if (text.startsWith(key)) {
                              isDay = true;
                              break;
                            }
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
                          console.log(`[ROBO-DEBUG] Linha ${rIdx}: Dia = "${dayRaw}", Horário = "${timeRaw}"`);

                          let targetDay = null;
                          for (const [key, val] of Object.entries(dayMapping)) {
                            if (dayRaw.startsWith(key)) {
                              targetDay = val;
                              break;
                            }
                          }

                          if (targetDay) {
                            foundAny = true;
                            if (timeRaw.toLowerCase().includes('fechado') || timeRaw.toLowerCase().includes('closed')) {
                              tempHours[targetDay] = { isOpen: false, slots: [] };
                            } else if (timeRaw.toLowerCase().includes('24 horas') || 
                                       timeRaw.toLowerCase().includes('24h') || 
                                       timeRaw.toLowerCase().includes('open 24 hours') ||
                                       timeRaw.toLowerCase().includes('24 hours')) {
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

                              tempHours[targetDay] = {
                                isOpen: slots.length > 0,
                                slots: slots
                              };
                            }
                          }
                        }
                      });
                    }

                    // Fallback se não achou tabela estruturada
                    if (!foundAny) {
                      console.log('[ROBO-DEBUG] Tabela não parseou horários. Iniciando Fallback Scanner...');
                      const allElements = Array.from(document.querySelectorAll('div, span, p, tr, li'));
                      console.log('[ROBO-DEBUG] Total de elementos no fallback: ' + allElements.length);
                      for (const el of allElements) {
                        const text = el.textContent.trim();
                        if (!text || text.length > 150) continue;

                        const lowerText = text.toLowerCase();
                        for (const [key, val] of Object.entries(dayMapping)) {
                          // Se começa com o dia da semana, ex: "segunda-feira: 12:00 - 22:00" ou "Monday 12:00-22:00"
                          if (lowerText.startsWith(key) && (lowerText.includes(':') || lowerText.includes('–') || lowerText.includes('-') || lowerText.includes('fechado') || lowerText.includes('closed'))) {
                            let timePart = text.substring(key.length).replace(/^[:\s\-–—]+/, '').trim();
                            if (timePart && timePart.length > 2) {
                              console.log(`[ROBO-DEBUG] Fallback Match: "${key}" -> "${timePart}"`);
                              foundAny = true;
                              if (timePart.toLowerCase().includes('fechado') || timePart.toLowerCase().includes('closed')) {
                                tempHours[val] = { isOpen: false, slots: [] };
                              } else if (timePart.toLowerCase().includes('24 horas') || 
                                         timePart.toLowerCase().includes('24h') || 
                                         timePart.toLowerCase().includes('open 24 hours') ||
                                         timePart.toLowerCase().includes('24 hours')) {
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

                                tempHours[val] = {
                                  isOpen: slots.length > 0,
                                  slots: slots
                                };
                              }
                            }
                          }
                        }
                      }
                    }

                    if (foundAny) {
                      parsedHours = tempHours;
                    }

                    return {
                      isClosed,
                      phone: extractedPhone,
                      website: extractedWebsite,
                      address: extractedAddress,
                      category: extractedCategory,
                      rating: extractedRating,
                      reviewsCount: extractedReviews,
                      hours: parsedHours,
                      instagram: extractedInstagram,
                      facebook: extractedFacebook,
                      menuUrl: extractedMenu
                    };
                  });

                  if (details.isClosed) {
                    console.log(`   [Aba ${workerId}] ⚠️ "${place.name}" está FECHADO permanentemente ou temporariamente. Salvando com flag.`);
                    isClosed = true;
                  }

                  phone = details.phone;
                  website = details.website;
                  address = details.address || address;
                  category = details.category || category;
                  rating = details.rating || rating;
                  reviewsCount = details.reviewsCount || reviewsCount;
                  if (details.hours) {
                    openingHours = details.hours;
                  }
                  instagram = details.instagram || instagram;
                  facebook = details.facebook || facebook;
                  menuSourceUrl = details.menuUrl || '';
                } catch (err) {
                  console.log(`   [Aba ${workerId}] [WARN] Falha ao extrair detalhes de "${place.name}". Pulando detalhes extras.`);
                }
              } else {
                console.log(`   [Aba ${workerId}] [WARN] Falha ao carregar a página de "${place.name}". Usando dados básicos.`);
              }
            }

            // Mantém todos os estabelecimentos independente do número de avaliações
            if (reviewsCount < 20) {
              console.log(`   [Aba ${workerId}] Mantendo "${place.name}" mesmo com poucas avaliações (${reviewsCount} < 20).`);
            }

            // Higienização e Capa
            category = category.replace('·', '').trim() || place.searchCategory || 'Restaurante';
            if (!address) address = `${place.neighborhood}, João Pessoa - PB`;

            let cover = unsplashImages[category] || unsplashImages["Restaurante"];
            for (const [key, imgUrl] of Object.entries(unsplashImages)) {
              if (category.toLowerCase().includes(key.toLowerCase())) {
                cover = imgUrl;
                break;
              }
            }

            if (website.includes('google.com/url')) {
              try {
                const urlObj = new URL(website);
                website = urlObj.searchParams.get('q') || website;
              } catch (urlErr) {}
            }

            // Sanitize private use area symbols (, , etc) from variables
            const cleanName = place.name.replace(/[\uE000-\uF8FF]/g, '').trim();
            const cleanPhone = (phone || '').replace(/[\uE000-\uF8FF]/g, '').trim();
            const cleanAddress = (address || '').replace(/[\uE000-\uF8FF]/g, '').trim();

            const finalName = formatRestaurantNameWithLocation(cleanName, cleanAddress, 'João Pessoa', place.neighborhood);

            const scrapedItem = {
              id: `scraped-google-local-${Date.now()}-${i}`,
              name: finalName,
              category: category,
              rating: rating,
              reviewsCount: reviewsCount,
              address: cleanAddress,
              phone: cleanPhone || undefined,
              city: 'João Pessoa',
              state: 'PB',
              instagram: instagram || undefined,
              facebook: facebook || undefined,
              coverImage: cover,
              galleryImages: [cover],
              openingHours: openingHours || undefined,
              website: website || undefined,
              googleMapsUrl: place.href.split('?')[0],
              menuSourceUrl: menuSourceUrl || undefined,
              isClosed: isClosed
            };

            state.detailsIndex = Math.min(activeIndex, totalToScrape);
            await saveScrapedItem(scrapedItem);
          } catch (itemErr) {
            console.error(`   [Aba ${workerId}] [ERRO FATAL NO ITEM] Falha ao processar:`, itemErr.message);
            // Se o erro indicar que a página foi destruída ou fechada, recria a aba
            if (itemErr.message.includes('closed') || itemErr.message.includes('detached') || itemErr.message.includes('navigation') || itemErr.message.includes('Protocol error')) {
              try {
                console.log(`   [Aba ${workerId}] Recriando aba do navegador devido a erro de conexão...`);
                await workerPage.close().catch(() => {});
                workerPage = await browser.newPage();
                await workerPage.setExtraHTTPHeaders({
                  'Accept-Language': 'pt-BR,pt;q=0.9'
                });
              } catch (recreateErr) {
                console.error(`   [Aba ${workerId}] Falha crítica ao recriar a aba:`, recreateErr.message);
              }
            }
          }

          // Pequeno intervalo anti-captcha
          await new Promise(r => setTimeout(r, 600));
        }
      }

      // Executa os workers em paralelo
      await Promise.all(pages.map((p, idx) => runWorker(p, idx + 1)));

      // Finalizado com sucesso! Escreve o arquivo definitivo e remove o arquivo de estado
      // fs.writeFileSync(OUTPUT_FILE, JSON.stringify(state.scrapedData, null, 2), 'utf-8');
      
      if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
      }

      console.log(`\n=============================================================`);
      console.log(`🎉 VARREDURA GEOGRÁFICA COMPLETA CONCLUÍDA!`);
      console.log(`💾 Foram salvos ${state.scrapedData.length} restaurantes únicos.`);
      console.log(`📡 Todos os dados salvos exclusivamente no banco remoto Supabase!`);
      console.log(`=============================================================\n`);
    }

  } catch (error) {
    console.error('[ERRO FATAL] Ocorreu um erro no robô:', error);
    if (state) {
      console.log('[ROBÔ] Salvando estado atual do progresso devido a erro fatal...');
      saveProgress(state);
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    console.log('[INFO] Navegador fechado.');
  }
})();
