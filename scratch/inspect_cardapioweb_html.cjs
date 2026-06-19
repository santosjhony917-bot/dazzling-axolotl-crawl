const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('https://hamburgueriacabrones.com.br/cabrones_hamburgueria', { timeout: 15000 });

  const html = await page.content();
  console.log('HTML length:', html.length);
  
  // Search for cardapio-web, cardapioweb, etc.
  const keywords = ['cardapioweb', 'cardapio-web', 'anota.ai', 'anota-app', 'integracao.cardapioweb.com'];
  keywords.forEach(kw => {
    console.log(`Keyword "${kw}" count:`, (html.split(kw).length - 1));
  });

  // Check window object keys
  const windowKeys = await page.evaluate(() => {
    return Object.keys(window).filter(k => k.toLowerCase().includes('company') || k.toLowerCase().includes('cardapio') || k.toLowerCase().includes('anota'));
  });
  console.log('Window keys of interest:', windowKeys);

  // Check storage keys
  const storageKeys = await page.evaluate(() => {
    return {
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage)
    };
  });
  console.log('Storage keys:', storageKeys);

  await browser.close();
}

run().catch(console.error);
