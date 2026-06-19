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
    
    // Tire screenshot 1: Busca inicial
    await page.screenshot({ path: 'scratch/gmaps_search_result.png' });
    console.log("Screenshot 1 salvo");

    // 1. Abre a galeria de fotos
    const photoOpened = await page.evaluate(() => {
      // Tenta achar o botão de fotos
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
    
    console.log("Foto clicada:", photoOpened);
    await delay(5000);
    await page.screenshot({ path: 'scratch/gmaps_expanded.png' });
    console.log("Screenshot 2 salvo");
    
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
    
    console.log("Aba Menu clicada:", menuTabClicked);
    await delay(5000);
    await page.screenshot({ path: 'scratch/gmaps_search_expanded.png' });
    console.log("Screenshot 3 salvo");
    
    // 3. Vamos listar os elementos da página e suas tags/classes
    const elementList = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map((img, i) => {
        const parent = img.parentElement;
        const grandParent = parent ? parent.parentElement : null;
        return {
          index: i,
          src: img.src.substring(0, 100),
          width: img.width,
          height: img.height,
          parentTag: parent ? parent.tagName : null,
          parentClass: parent ? parent.className : null,
          grandParentTag: grandParent ? grandParent.tagName : null,
          grandParentClass: grandParent ? grandParent.className : null,
          clickable: !!(img.closest('a') || img.closest('button') || img.closest('[jsaction*="click"]'))
        };
      });
    });
    
    console.log("Imagens encontradas:");
    console.log(JSON.stringify(elementList.slice(0, 25), null, 2));
    
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await browser.close();
  }
}

run();
