const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://whatsform.com/HqP3k4', { waitUntil: 'networkidle2' });
  
  const text = await page.evaluate(() => document.body.textContent);
  console.log('Text content length:', text.length);
  console.log('Text content:\n', text);
  
  const html = await page.content();
  fs.writeFileSync('scratch/whatsform_test.html', html);
  
  await browser.close();
}

run();
