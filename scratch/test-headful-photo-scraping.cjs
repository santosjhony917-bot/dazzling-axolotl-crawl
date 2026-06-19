const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const query = "A Barca Cabo Branco João Pessoa";
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  
  console.log(`🌐 Navegando para: ${searchUrl}`);
  const userDataDir = path.join(__dirname, 'puppeteer_user_data_single');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir,
    args: ['--start-maximized', '--lang=pt-BR']
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
    
    await delay(5000);
    
    // Extrai as imagens do painel da galeria
    const photos = await page.evaluate(() => {
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
    
    console.log('Total de fotos encontradas no painel da galeria:', photos.length);
    const highRes = photos.map(url => {
      let clean = url.trim();
      if (clean.includes('googleusercontent.com')) {
        if (clean.includes('=')) {
          clean = clean.split('=')[0] + '=w1000-h800-k-no';
        } else {
          clean = clean + '=w1000-h800-k-no';
        }
      }
      return clean;
    }).filter(url => url.startsWith('http'));
    
    console.log('URLs Únicas de Alta Resolução:', highRes.length);
    console.log(highRes.slice(0, 10));
    
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await browser.close();
  }
}

run();
