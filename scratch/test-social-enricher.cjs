const puppeteer = require('puppeteer');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const restaurant = {
    name: 'Marvel Burguer *PRIME* - Tambaú',
    city: 'João Pessoa',
    state: 'PB'
  };

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true, // We can run headless for this quick test
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9'
  });

  const query = `${restaurant.name} ${restaurant.city || ''} instagram`.replace(/\s+/g, ' ').trim();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  
  console.log(`Searching: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  await delay(2000);

  const pageUrl = page.url();
  console.log(`Current page URL: ${pageUrl}`);
  if (pageUrl.includes('google.com/sorry/')) {
    console.error('BLOCKED BY CAPTCHA!');
    await browser.close();
    return;
  }

  const result = await page.evaluate((targetCity, targetState, restaurantName) => {
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

          candidates.push({ url, score, handle, title, hasMismatch, details: { normTitle, normContext, nameWords } });
        }
      }
    }

    return { candidates, htmlLength: document.documentElement.outerHTML.length };
  }, restaurant.city, restaurant.state, restaurant.name);

  console.log(`Found candidates count: ${result.candidates.length}`);
  console.log('Candidates list:');
  result.candidates.forEach((c, idx) => {
    console.log(`[Candidate ${idx + 1}]`);
    console.log(`- URL: ${c.url}`);
    console.log(`- Score: ${c.score}`);
    console.log(`- Handle: ${c.handle}`);
    console.log(`- Title: ${c.title}`);
    console.log(`- Has Mismatch: ${c.hasMismatch}`);
  });

  await browser.close();
}

run();
