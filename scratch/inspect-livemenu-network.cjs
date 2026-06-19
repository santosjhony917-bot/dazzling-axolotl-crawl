const puppeteer = require('puppeteer');

async function run() {
  const url = "https://livemenu.app/menu/620a771b6e7bfc0012a16264";
  console.log(`🚀 Iniciando Puppeteer para monitorar requisições JSON da página: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  page.on('response', async (response) => {
    const responseUrl = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    if (contentType.includes('application/json')) {
      try {
        const json = await response.json();
        const jsonStr = JSON.stringify(json);
        console.log(`📡 [JSON] URL: ${responseUrl}`);
        console.log(`   Content-Type: ${contentType}`);
        console.log(`   Size: ${jsonStr.length} bytes`);
        // Print top-level keys
        if (typeof json === 'object') {
          console.log(`   Keys: ${Object.keys(json).join(', ')}`);
        }
      } catch (e) {
        console.log(`   Failed to parse JSON for: ${responseUrl}`);
      }
    }
  });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // Pega as abas
    const tabCount = await page.evaluate(() => document.querySelectorAll('li.menus__items').length);
    console.log(`Encontradas ${tabCount} abas principais. Clicando em cada uma para disparar chamadas...`);
    
    for (let i = 0; i < tabCount; i++) {
      console.log(`Clicando aba ${i}...`);
      await page.evaluate((idx) => {
        const el = document.querySelectorAll('li.menus__items')[idx];
        if (el) el.click();
      }, i);
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await browser.close();
  }
}

run();
