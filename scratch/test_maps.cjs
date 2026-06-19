const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function main() {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps/place/A+Casa+Caf%C3%A9+Bistr%C3%B4/data=!4m7!3m6!1s0x7acdd007d539c7b:0x6e7f516f9fcbad0e!8m2!3d-7.107634!4d-34.8346732!16s%2Fg%2F11n56rphgt!19sChIJe5xTfQDdrAcRDq3Ln29Rf24', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000)); // wait for rendering

  const text = await page.evaluate(() => {
    return new Promise(resolve => {
      let labels = '';
      try {
        const els = Array.from(document.querySelectorAll('[aria-label]'));
        els.forEach(b => {
          const ariaLabel = b.getAttribute('aria-label');
          if (ariaLabel) labels += "\n" + ariaLabel;
          
          if (ariaLabel && ariaLabel.toLowerCase().includes('horário')) {
            b.click();
          }
        });
      } catch(e) {}

      setTimeout(() => {
        let tablesText = '';
        try {
          const tables = document.querySelectorAll('table');
          tables.forEach(t => {
            tablesText += "\nTABLE: " + t.textContent;
          });
        } catch(e) {}
        
        resolve(document.body.innerText + "\n\nHIDDEN TABLES:\n" + tablesText + "\n\nALL LABELS:\n" + labels);
      }, 3000);
    });
  });

  console.log("=== DUMP ===");
  console.log(text.substring(0, 5000));
  await browser.close();
}

main();
