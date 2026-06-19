const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('Launching browser to inspect Cabrones...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('application/json') || url.includes('anota.ai')) {
      console.log(`[Network Response] Url: ${url} | Content-Type: ${contentType}`);
    }
  });

  console.log('Navigating to https://hamburgueriacabrones.com.br/cabrones_hamburgueria...');
  await page.goto('https://hamburgueriacabrones.com.br/cabrones_hamburgueria', { waitUntil: 'networkidle2', timeout: 30000 });
  
  console.log('Page loaded. Checking properties...');
  const result = await page.evaluate(() => {
    return {
      title: document.title,
      href: window.location.href,
      hostname: window.location.hostname,
      companySlug: window.companySlug,
      companyId: window.companyId,
      companyUuid: window.companyUuid,
      hasAnotaScript: !!document.querySelector('script[src*="anota.ai"]'),
      hasAnotaLink: !!document.querySelector('link[href*="anota.ai"]'),
      hasAnotaDiv: !!document.querySelector('#anota-app') || !!document.querySelector('.anota-app') || !!document.querySelector('[id*="anota"]') || !!document.querySelector('[class*="anota"]'),
      scripts: Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean),
      iframes: Array.from(document.querySelectorAll('iframe')).map(f => f.src).filter(Boolean)
    };
  });
  
  console.log('Inspection Results:', JSON.stringify(result, null, 2));
  
  await browser.close();
}

run().catch(console.error);
