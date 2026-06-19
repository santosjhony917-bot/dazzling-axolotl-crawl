const puppeteer = require('puppeteer');

async function checkMaps() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps/place/A+Casa+Caf%C3%A9+Bistr%C3%B4/data=!4m7!3m6!1s0x7acdd007d539c7b:0x6e7f516f9fcbad0e!8m2!3d-7.107634!4d-34.8346732!16s%2Fg%2F11n56rphgt!19sChIJe5xTfQDdrAcRDq3Ln29Rf24', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  const address = await page.evaluate(() => {
    return document.body.innerText.substring(0, 3000);
  });
  console.log(address);
  await browser.close();
}
checkMaps();
