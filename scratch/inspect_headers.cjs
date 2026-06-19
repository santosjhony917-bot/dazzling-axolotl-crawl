const puppeteer = require('puppeteer');

async function run() {
  console.log('Launching browser to inspect Cabrones headers...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('cardapioweb.com')) {
      console.log(`\n[Request] ${url}`);
      console.log(`Method: ${request.method()}`);
      console.log(`Headers:`, JSON.stringify(request.headers(), null, 2));
      const postData = request.postData();
      if (postData) {
        console.log(`Post Data:`, postData);
      }
    }
  });

  await page.goto('https://hamburgueriacabrones.com.br/cabrones_hamburgueria', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
}

run().catch(console.error);
