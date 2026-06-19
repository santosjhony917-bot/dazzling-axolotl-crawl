const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const query = "A Barca Cabo Branco João Pessoa";
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  
  console.log(`🌐 Navegando para: ${searchUrl}`);
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(5000);
    
    // 1. Abre a galeria de fotos
    const photoOpened = await page.evaluate(() => {
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
    
    if (!photoOpened) {
      throw new Error("Não abriu a galeria.");
    }
    await delay(4000);
    
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
    
    if (!menuTabClicked) {
      throw new Error("Não encontrou a aba Menu.");
    }
    await delay(4000);
    
    // 3. Clica na primeira foto do grid de cardápio para abrir o visualizador em tela cheia (slideshow)
    console.log("Clicando na primeira foto de cardápio para abrir visualizador...");
    const gridItemClicked = await page.evaluate(() => {
      // Procura por links ou divs clicáveis na aba de fotos
      // A primeira imagem dentro da aba ativa normalmente está em uma div ou button
      const activeGrid = document.querySelector('div[role="grid"]') || document.querySelector('div.m6QErb');
      if (activeGrid) {
        const firstImg = activeGrid.querySelector('img');
        if (firstImg) {
          const clickable = firstImg.closest('a') || firstImg.closest('button') || firstImg.closest('div[jsaction*="click"]');
          if (clickable) {
            clickable.click();
            return true;
          }
          firstImg.click();
          return true;
        }
      }
      return false;
    });
    
    if (!gridItemClicked) {
      console.log("Aviso: Tentando clicar em qualquer img...");
      await page.click('img');
    }
    await delay(5000);
    
    // 4. Captura o HTML e texto da tela de detalhes para analisar os seletores da data
    console.log("Extraindo textos e classes da tela de exibição da foto...");
    const dump = await page.evaluate(() => {
      const texts = [];
      // Vamos capturar todos os spans e divs com texto pequeno ou relativo a tempo
      document.querySelectorAll('span, div, p').forEach(el => {
        const txt = el.textContent.trim();
        // Heurística: procura texto contendo 'ano', 'mês', 'meses', 'dia', 'dias', 'semana', 'ago', 'há'
        if (txt.length < 50 && (
          txt.includes('ano') || txt.includes('mes') || txt.includes('dia') || 
          txt.includes('semana') || txt.includes('ago') || txt.includes('há') ||
          txt.includes('year') || txt.includes('month') || txt.includes('week') || txt.includes('day')
        )) {
          texts.push({
            tag: el.tagName.toLowerCase(),
            class: el.className,
            text: txt
          });
        }
      });
      return { html: document.body.innerHTML.substring(0, 100000), texts };
    });
    
    console.log("Textos suspeitos de data encontrados:");
    console.log(dump.texts.slice(0, 30));
    
    fs.writeFileSync('scratch/dump_maps_photo_view.html', dump.html);
    fs.writeFileSync('scratch/dump_maps_photo_texts.json', JSON.stringify(dump.texts, null, 2));
    
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await browser.close();
  }
}

run();
