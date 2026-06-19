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
    
    // Clica no botão da foto para abrir a galeria
    await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button'));
      for (const btn of candidates) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = btn.textContent.toLowerCase();
        const jsaction = btn.getAttribute('jsaction') || '';
        if (label.includes('foto') || label.includes('photo') || jsaction.includes('photo') || text.includes('foto') || text.includes('photo')) {
          btn.click();
          break;
        }
      }
    });
    
    await delay(4000);
    
    const extractUrls = async () => {
      return await page.evaluate(() => {
        const list = [];
        
        // 1. Tags IMG
        document.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src') || '';
          if (src.includes('googleusercontent.com') || src.includes('streetviewpixels')) {
            if (!list.includes(src)) list.push(src);
          }
        });
        
        // 2. Tags DIV com background-image
        document.querySelectorAll('div').forEach(div => {
          const style = div.getAttribute('style') || '';
          if (style.includes('background-image')) {
            const match = style.match(/url\("?([^"]+)"?\)/);
            if (match) {
              const url = match[1];
              if (url.includes('googleusercontent.com') || url.includes('streetviewpixels')) {
                if (!list.includes(url)) list.push(url);
              }
            }
          }
        });
        
        return list;
      });
    };
    
    let allPhotos = new Set();
    
    // Tenta simular o clique no botão de avançar usando a tecla Seta para Direita do teclado
    for (let step = 1; step <= 8; step++) {
      // Coleta as fotos da tela atual
      const currentPhotos = await extractUrls();
      currentPhotos.forEach(url => {
        let clean = url.trim();
        if (clean.includes('googleusercontent.com')) {
          if (clean.includes('=')) {
            clean = clean.split('=')[0] + '=w1000-h800-k-no';
          } else {
            clean = clean + '=w1000-h800-k-no';
          }
        }
        if (clean.startsWith('http')) {
          allPhotos.add(clean);
        }
      });
      
      console.log(`Passo ${step}: Fotos acumuladas: ${allPhotos.size}`);
      
      // Envia a tecla de Seta para a Direita
      console.log(`Passo ${step}: Pressionando tecla ArrowRight...`);
      await page.keyboard.press('ArrowRight');
      await delay(2000);
    }
    
    const resultList = Array.from(allPhotos);
    console.log('Resultado final de fotos extraídas:', resultList.length);
    console.log(resultList);
    
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await browser.close();
  }
}

run();
