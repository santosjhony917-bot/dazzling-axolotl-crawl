const puppeteer = require('puppeteer');
const fs = require('fs');

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
    
    // Abre galeria
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
    
    if (!photoOpened) throw new Error("Galeria não abriu");
    await delay(4000);
    
    // Clica aba Menu
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
    await delay(4000);
    
    // Clica primeira foto do grid
    const clicked = await page.evaluate(() => {
      const link = document.querySelector('a.Wry4Ob');
      if (link) { link.click(); return true; }
      return false;
    });
    
    if (!clicked) throw new Error("Não clicou na primeira foto do grid");
    await delay(5000);
    
    // Lista botões do slideshow
    const buttonsInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map((btn, i) => ({
        index: i,
        tagName: btn.tagName,
        className: btn.className,
        id: btn.id,
        ariaLabel: btn.getAttribute('aria-label'),
        textContent: btn.textContent.trim().substring(0, 50),
        html: btn.outerHTML.substring(0, 200)
      }));
    });
    
    console.log("Botões encontrados no visualizador:");
    console.log(JSON.stringify(buttonsInfo, null, 2));
    
  } catch (err) {
    console.error("Erro:", err.message);
  } finally {
    await browser.close();
  }
}

run();
