const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('Launching browser to inspect Anota.ai network...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    if (contentType.includes('application/json') && (url.includes('atpizza') || url.includes('anota.ai') || url.includes('menu') || url.includes('catalog'))) {
      try {
        const text = await response.text();
        const shortUrl = url.split('?')[0];
        console.log(`Found JSON response from: ${shortUrl} (${text.length} bytes)`);
        
        // Save to file for inspection
        const filename = `response_${Date.now()}_${path.basename(shortUrl)}.json`.replace(/[^a-z0-9_.]/gi, '_');
        fs.writeFileSync(path.join(__dirname, filename), text, 'utf-8');
        console.log(`Saved response to ${filename}`);
      } catch (e) {
        // ignore
      }
    }
  });

  console.log('Navigating to https://pedido.anota.ai/loja/atpizza...');
  await page.goto('https://pedido.anota.ai/loja/atpizza', { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Navigation idle. Waiting 10 seconds...');
  await new Promise(r => setTimeout(r, 10000));
  
  await browser.close();
  console.log('Browser closed.');
}

run().catch(console.error);
