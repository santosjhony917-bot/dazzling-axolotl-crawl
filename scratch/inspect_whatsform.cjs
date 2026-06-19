const puppeteer = require('puppeteer');

async function run() {
  const url = 'https://whatsform.com/BKYP5u';
  
  console.log('Launching browser to inspect WhatsForm...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });

  const title = await page.title();
  console.log('Title:', title);

  const text = await page.evaluate(() => document.body.textContent || '');
  console.log('Text Content Length:', text.length);
  console.log('First 1000 chars of text:');
  console.log(text.slice(0, 1000));

  // Let's also check for form fields/items
  const fields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea, button, label, .item, [class*="item"], [class*="product"], [class*="card"]')).map(el => {
      return {
        tag: el.tagName.toLowerCase(),
        class: el.className,
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100)
      };
    }).filter(x => x.text.length > 0).slice(0, 50);
  });

  console.log('Sample element properties:');
  console.log(JSON.stringify(fields, null, 2));

  await browser.close();
}

run().catch(console.error);
