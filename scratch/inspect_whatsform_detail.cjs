const puppeteer = require('puppeteer');

async function run() {
  const url = 'https://whatsform.com/BKYP5u';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Get the entire HTML to save to scratch/whatsform.html
  const html = await page.content();
  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(path.join(__dirname, 'whatsform.html'), html, 'utf-8');
  console.log('Saved whatsform.html');

  // Let's check for any script tags containing data
  const scriptContents = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script'))
      .map(s => s.innerHTML)
      .filter(t => t.includes('window.') || t.includes('var ') || t.includes('{') || t.includes('const '));
  });

  console.log(`Found ${scriptContents.length} scripts with content.`);
  scriptContents.forEach((sc, idx) => {
    console.log(`\n--- Script ${idx + 1} (length: ${sc.length}) ---`);
    console.log(sc.slice(0, 1000));
  });

  await browser.close();
}

run().catch(console.error);
