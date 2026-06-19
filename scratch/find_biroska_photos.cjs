const puppeteer = require('puppeteer');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const query = "A Biroska Lanches João Pessoa";
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  
  console.log(`🌐 Navegando para: ${searchUrl}`);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(5000);
    
    // Abre a galeria de fotos
    const photoOpened = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button'));
      for (const btn of candidates) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = btn.textContent.toLowerCase();
        if (label.includes('foto') || label.includes('photo') || text.includes('foto') || text.includes('photo')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    
    if (!photoOpened) {
      console.log("Não abriu a galeria.");
      return;
    }
    await delay(4000);
    
    // Clica na aba 'Menu' / 'Cardápio'
    const menuTabClicked = await page.evaluate(() => {
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
    
    console.log("Aba Menu clicada:", menuTabClicked);
    await delay(4000);
    
    // Extrai URLs das fotos da aba Menu
    const scrapedMenuUrls = await page.evaluate(() => {
      const list = [];
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        if (src.includes('googleusercontent.com')) {
          if (!list.includes(src)) list.push(src);
        }
      });
      return list;
    });
    
    console.log("Fotos de cardápio encontradas no Google Maps:", scrapedMenuUrls.length);
    console.log(scrapedMenuUrls.slice(0, 10));
    
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await browser.close();
  }
}

run();
