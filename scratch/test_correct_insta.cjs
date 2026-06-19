const puppeteer = require('puppeteer');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const targetUrl = 'https://www.instagram.com/a_biroska/';
  const userDataDir = path.join(__dirname, 'puppeteer_user_data_single');
  
  console.log(`🌐 Navegando para Instagram: ${targetUrl}`);
  const browser = await puppeteer.launch({
    headless: "new",
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=pt-BR']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(5000);
    
    const pageTitle = await page.title();
    console.log(`Page Title: ${pageTitle}`);
    
    const headerText = await page.evaluate(() => {
      const header = document.querySelector('header');
      return header ? header.textContent.trim() : null;
    });
    
    console.log(`Header Text:\n${headerText}`);
    
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent.trim(),
        href: a.getAttribute('href')
      })).filter(a => a.href && (a.href.startsWith('http') || a.href.includes('l.instagram.com')));
    });
    
    console.log("Links encontrados:");
    console.log(JSON.stringify(links, null, 2));
    
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await browser.close();
  }
}

run();
