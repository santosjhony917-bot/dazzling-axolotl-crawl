const puppeteer = require('puppeteer');

async function analyze() {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--window-size=1280,800'] });
  const page = await browser.newPage();
  
  console.log("Navegando para o LiveMenu...");
  await page.goto("https://livemenu.app/menu/620a771b6e7bfc0012a16264", { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 5000));
  
  await page.screenshot({ path: 'scratch/livemenu_screenshot.png' });
  
  const ctx = await page.evaluate(() => {
    // Pegar o HTML do header ou navegação
    const navs = Array.from(document.querySelectorAll('nav, .menu, .tabs, ul, .swiper-wrapper')).map(el => el.innerHTML);
    return navs;
  });

  const fs = require('fs');
  fs.writeFileSync('scratch/livemenu_navs.json', JSON.stringify(ctx, null, 2));
  console.log("Análise salva em scratch/livemenu_navs.json e scratch/livemenu_screenshot.png");
  
  await browser.close();
}

analyze();
