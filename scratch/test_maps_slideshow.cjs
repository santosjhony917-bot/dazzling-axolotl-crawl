const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const query = "A Barca Cabo Branco João Pessoa";
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
    
    // 1. Abre a galeria de fotos
    const photoOpened = await page.evaluate(() => {
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
      return false;
    });
    
    if (!photoOpened) throw new Error("Não abriu a galeria");
    await delay(5000);
    
    // 2. Clica na aba 'Menu' / 'Cardápio'
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
    
    if (!menuTabClicked) throw new Error("Aba menu não clicada");
    await delay(5000);
    
    // 3. Clica na primeira foto do grid de cardápio
    const firstPhotoClicked = await page.evaluate(() => {
      // Procurar por links Wry4Ob
      const link = document.querySelector('a.Wry4Ob');
      if (link) {
        link.click();
        return "a.Wry4Ob";
      }
      const img = document.querySelector('img[src*="googleusercontent.com/p/"]');
      if (img) {
        img.click();
        return "img googleusercontent";
      }
      return null;
    });
    
    console.log("Resultado do clique na primeira foto:", firstPhotoClicked);
    await delay(5000);
    
    // Tire screenshot do slideshow
    await page.screenshot({ path: 'scratch/gmaps_slideshow.png' });
    console.log("Screenshot do slideshow salvo.");
    
    // 4. Analisa o DOM da tela de slideshow para encontrar textos de data
    const dump = await page.evaluate(() => {
      const texts = [];
      document.querySelectorAll('span, div, p').forEach(el => {
        const txt = el.textContent.trim();
        // Procurar por padrões de tempo
        if (txt.length > 0 && txt.length < 100) {
          const lower = txt.toLowerCase();
          if (
            lower.includes('ano') || lower.includes('mês') || lower.includes('mes') || lower.includes('dia') || 
            lower.includes('semana') || lower.includes('ago') || lower.includes('há') ||
            lower.includes('year') || lower.includes('month') || lower.includes('week') || lower.includes('day') ||
            /^\d+\s+(ano|mes|dia|semana|year|month|day|week)/.test(lower)
          ) {
            texts.push({
              tag: el.tagName.toLowerCase(),
              class: el.className,
              text: txt
            });
          }
        }
      });
      
      // Também vamos pegar todas as imagens na tela de slideshow
      const slideshowImages = Array.from(document.querySelectorAll('img')).map(img => img.src);
      
      return { texts, images: slideshowImages };
    });
    
    console.log("Textos de data em potencial:");
    console.log(JSON.stringify(dump.texts, null, 2));
    console.log("Imagens no slideshow:", dump.images.slice(0, 10));
    
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await browser.close();
  }
}

run();
