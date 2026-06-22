const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://www.instagram.com/alainesfiharia/', { waitUntil: 'networkidle2' });
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.href,
      text: a.innerText,
      target: a.target,
      rel: a.rel,
      className: a.className
    })).filter(a => a.href && a.href.includes('http'));
  });
  
  console.log(links);
  await browser.close();
})();
