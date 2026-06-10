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

const JSON_PATH = path.join(__dirname, '../scraped_restaurants_google.json');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

async function searchGoogleForSocials(page, restaurant) {
  // Query format: "[Nome] [Cidade] instagram"
  const query = `${restaurant.name} ${restaurant.city || ''} instagram`.replace(/\s+/g, ' ').trim();
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
      'goiania', 'manaus', 'belem', 'campinas', 'santos', 'niteroi', 'florianopolis', 'vitoria', 
      'aracaju', 'maceio', 'natal', 'campina grande', 'campinagrande', 'caruaru', 'petrolina'
    ];

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
          // Get handle
          const pathSegments = url.replace('https://', '').replace('http://', '').replace('www.', '').split('/');
          const handle = (pathSegments[1] || '').trim().toLowerCase();
          if (handle.length === 0) continue;

          // Get context and title
          const container = a.closest('.g, .MjjYud, [data-ved], li, tr, td');
          const context = container ? (container.innerText || '') : '';
          const h3 = container ? container.querySelector('h3') : null;
          const title = h3 ? h3.innerText : (a.textContent || '');

          const normTitle = normalizeText(title);
          const normContext = normalizeText(context);

          let score = 100;

          // Mismatch checks
          let hasMismatch = false;

          // Check handle suffix/contains mismatch
          for (const st of filteredStates) {
            if (handle.endsWith(st)) {
              score -= 150; // strong penalty/reject
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

          // Check context/title word mismatch
          for (const st of filteredStates) {
            if (containsWord(normTitle, st) || containsWord(normContext, st)) {
              if (containsWord(normTitle, tState) || containsWord(normContext, tState) || containsWord(normTitle, normTargetCity) || containsWord(normContext, normTargetCity)) {
                score -= 40; // mild penalty if both mentioned
              } else {
                score -= 120; // strong penalty
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

          // Positives / Matches
          // Target state or city matching in handle
          if (handle.endsWith(tState) || handle.endsWith('jp') || handle.includes(normTargetCity)) {
            score += 50;
          }

          // Target city/state mentioned in title/context
          if (containsWord(normTitle, tState) || containsWord(normContext, tState)) {
            score += 30;
          }
          if (containsWord(normTitle, tCity) || containsWord(normContext, tCity)) {
            score += 40;
          }

          // Restaurant name matching keywords in title or handle
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

    // Filter and sort
    const valid = candidates.filter(c => c.score >= 50);
    valid.sort((x, y) => y.score - x.score);
    return valid.length > 0 ? valid[0].url : null;
  }, restaurant.city || '', restaurant.state || '', restaurant.name);
  
  return extracted;
}

async function searchGoogleForMenu(page, restaurant) {
  const query = `${restaurant.name} ${restaurant.city || ''} cardapio menu`.replace(/\s+/g, ' ').trim();
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
      'goiania', 'manaus', 'belem', 'campinas', 'santos', 'niteroi', 'florianopolis', 'vitoria', 
      'aracaju', 'maceio', 'natal', 'campina grande', 'campinagrande', 'caruaru', 'petrolina'
    ];

    const tState = targetState.toLowerCase().trim();
    const tCity = targetCity.toLowerCase().trim();
    const normTargetCity = normalizeText(tCity).replace(/\s+/g, '');
    const normRestaurantName = normalizeText(restaurantName);
    const nameWords = normRestaurantName.split(/\s+/).filter(w => w.length > 2);

    const filteredStates = otherStates.filter(s => s !== tState);
    const filteredCities = otherCities.filter(c => c !== tCity && c !== normTargetCity);

    const links = Array.from(document.querySelectorAll('a'));
    
    // Procura primeiro se existe link ou botão de "Menu" do próprio Google local
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

      // Extract handle or path suffix for city/state checking
      const urlParts = lowerHref.replace('https://', '').replace('http://', '').replace('www.', '').split('/');
      const lastSegment = urlParts[urlParts.length - 1] || '';
      const handle = lastSegment.split('?')[0].split('#')[0];

      // Get context and title
      const container = a.closest('.g, .MjjYud, [data-ved], li, tr, td');
      const context = container ? (container.innerText || '') : '';
      const h3 = container ? container.querySelector('h3') : null;
      const title = h3 ? h3.innerText : (a.textContent || '');

      const normTitle = normalizeText(title);
      const normContext = normalizeText(context);

      let score = 100;

      // Check handle/URL segments for other states/cities
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

      // Check context/title word mismatch
      for (const st of filteredStates) {
        if (containsWord(normTitle, st) || containsWord(normContext, st)) {
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

      // Positive match triggers
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

      // Target state/city matching in handle or context
      if (handle.endsWith(tState) || handle.endsWith('jp') || handle.includes(normTargetCity)) {
        score += 40;
      }
      if (containsWord(normTitle, tState) || containsWord(normContext, tState)) {
        score += 20;
      }
      if (containsWord(normTitle, tCity) || containsWord(normContext, tCity)) {
        score += 30;
      }

      // Restaurant name matching keywords
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
  }, restaurant.city || '', restaurant.state || '', restaurant.name);
  
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
  console.log('📡 Buscando estabelecimentos no Supabase...');
  const { data, error: fetchError } = await supabase
    .from('restaurants')
    .select('*');
    
  if (fetchError) {
    console.error('❌ Erro ao buscar do Supabase:', fetchError.message);
    process.exit(1);
  }

  console.log(`📂 Carregados ${data.length} estabelecimentos do Supabase.`);

  // Mapeia para o formato interno do enriquecedor
  const mappedData = data.map(dbItem => {
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
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir,
    args: ['--start-maximized', '--lang=pt-BR']
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9'
  });

  let enrichedInstaCount = 0;
  let enrichedMenuCount = 0;

  for (let idx = 0; idx < pending.length; idx++) {
    const item = pending[idx];
    console.log(`\n-------------------------------------------------------------`);
    console.log(`[${idx + 1}/${pending.length}] Processando: "${item.name}"...`);

    const needsInsta = !item.instagram || item.instagram.includes('facebook.com') || item.instagram.includes('instagram.com/p/') || item.instagram.trim() === '';
    const needsMenu = !item.menuSourceUrl || item.menuSourceUrl.trim() === '';

    // 1. Enriquecimento de Instagram
    if (needsInsta) {
      try {
        const foundInsta = await searchGoogleForSocials(page, item);
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
  }

  await browser.close();
  console.log(`\n=============================================================`);
  console.log(`🎉 Enriquecimento concluído com sucesso!`);
  console.log(`📸 Novos Instagrams encontrados: ${enrichedInstaCount}`);
  console.log(`📋 Novos Cardápios encontrados: ${enrichedMenuCount}`);
  console.log(`=============================================================`);
}

run();
