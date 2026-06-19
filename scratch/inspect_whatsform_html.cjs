const puppeteer = require('puppeteer');

async function run() {
  const url = 'https://whatsform.com/BKYP5u';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('response', (response) => {
    console.log(`[Network Response] Url: ${response.url()} | Status: ${response.status()}`);
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  const html = await page.content();
  console.log('HTML Length:', html.length);
  console.log('HTML preview (first 2000 chars):');
  console.log(html.slice(0, 2000));
  
  await browser.close();
}

run().catch(console.error);
