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
    
    console.log("Visualizador aberto. Iniciando loop de extração...");
    
    const results = [];
    
    for (let i = 0; i < 15; i++) {
      const data = await page.evaluate(() => {
        // 1. Achar a URL da imagem principal sendo exibida
        // No visualizador, a imagem principal é normalmente a que está visível.
        // Vamos procurar por imagens com src contendo googleusercontent.com e que sejam grandes (width > 300)
        let imgUrl = null;
        const viewerImages = Array.from(document.querySelectorAll('img[src*="googleusercontent.com"]'));
        const mainImg = viewerImages.find(img => img.offsetWidth > 300 || img.offsetHeight > 300);
        if (mainImg) {
          imgUrl = mainImg.src;
        } else if (viewerImages.length > 0) {
          // fallback
          imgUrl = viewerImages[0].src;
        }
        
        // 2. Procurar pelo texto de data
        // Vamos procurar especificamente por classes como lg5Sp ou outros spans com "há" ou "ago" ou "year/month/day/week"
        let dateText = null;
        
        // Tenta primeiro o seletor específico que encontramos: span.lg5Sp
        const lg5SpSpans = Array.from(document.querySelectorAll('span.lg5Sp'));
        if (lg5SpSpans.length > 0) {
          dateText = lg5SpSpans[0].textContent.trim();
        }
        
        if (!dateText) {
          // Fallback buscando em todos os spans/divs com heúristica
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
        
        return { imgUrl, dateText };
      });
      
      console.log(`Foto ${i+1}: URL = ${data.imgUrl ? data.imgUrl.substring(0, 80) : 'null'}, Data = ${data.dateText}`);
      results.push(data);
      
      // Passa para a próxima foto
      await page.keyboard.press('ArrowRight');
      await delay(2000);
    }
    
    fs.writeFileSync('scratch/extracted_menu_dates.json', JSON.stringify(results, null, 2));
    console.log("Resultados salvos em scratch/extracted_menu_dates.json");
    
  } catch (err) {
    console.error("Erro:", err.message);
  } finally {
    await browser.close();
  }
}

run();
