const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const query = "A Barca Cabo Branco João Pessoa";
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  
  console.log(`🌐 Navegando para: ${searchUrl}`);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Define User Agent para parecer um navegador desktop real para obter o painel lateral
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);
    
    await page.screenshot({ path: 'scratch/google_screenshot.png' });
    console.log('✅ Screenshot do Google Search salvo.');
    
    const urls = await page.evaluate(() => {
      const list = [];
      
      // 1. Procura em todos os links da página que contêm imagens do Google Maps
      document.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href.includes('googleusercontent.com/p/') || href.includes('lh5.googleusercontent.com')) {
          list.push(href);
        }
      });
      
      // 2. Procura em todas as imagens (img) na página
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (src.includes('googleusercontent.com/p/') || src.includes('lh5.googleusercontent.com')) {
          list.push(src);
        }
      });
      
      // 3. Procura em atributos de estilo (background-image)
      document.querySelectorAll('div, span, a').forEach(el => {
        const style = el.getAttribute('style') || '';
        if (style.includes('background-image')) {
          const match = style.match(/url\("?([^"]+)"?\)/);
          if (match) {
            const url = match[1];
            if (url.includes('googleusercontent.com') || url.includes('lh5.googleusercontent.com')) {
              list.push(url);
            }
          }
        }
        
        // Atributo data-url comum em grids de fotos
        const dataUrl = el.getAttribute('data-url') || el.getAttribute('data-img-url') || '';
        if (dataUrl.includes('googleusercontent.com') || dataUrl.includes('lh5.googleusercontent.com')) {
          list.push(dataUrl);
        }
      });
      
      return list;
    });
    
    console.log('URLs encontradas:', urls.length);
    console.log('Links brutos:', urls);
    
    // Normaliza para alta resolução
    const highRes = urls.map(url => {
      let clean = url.trim();
      // Remove parâmetros de corte/redimensionamento para forçar alta resolução (w1000-h800)
      if (clean.includes('googleusercontent.com/p/')) {
        clean = clean.split('=')[0] + '=w1000-h800-k-no';
      }
      return clean;
    });
    
    const unique = [...new Set(highRes)].filter(url => url.startsWith('http'));
    console.log('URLs Únicas de Alta Resolução:', unique.length);
    console.log(unique);
    
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await browser.close();
  }
}

run();
