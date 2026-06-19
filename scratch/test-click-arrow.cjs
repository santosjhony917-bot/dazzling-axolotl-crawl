const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.goto('https://www.google.com/maps/place/A+Casa+Caf%C3%A9+Bistr%C3%B4/@-7.107634,-34.8346732,16z/data=!3m1!4b1!4m6!3m5!1s0x7acdd007d539c7b:0x6e7f516f9fcbad0e!8m2!3d-7.107634!4d-34.8320983!16s%2Fg%2F11sbnsflh9', { waitUntil: 'networkidle2' });

  await new Promise(r => setTimeout(r, 3000));

  const res = await page.evaluate(() => {
    const hoursRow = Array.from(document.querySelectorAll('div, span, button')).find(
       el => el.textContent && el.textContent.includes('Fechado') && el.textContent.includes('14:00') && el.children.length < 5
    );
    if (!hoursRow) return "NOT FOUND";
    let current = hoursRow;
    let html = "";
    while(current && current.tagName !== 'BODY') {
       html += "\nPARENT " + current.tagName + ": " + current.outerHTML.substring(0, 150);
       current = current.parentElement;
    }
    return html;
  });

  console.log(res);

  await browser.close();
})();
