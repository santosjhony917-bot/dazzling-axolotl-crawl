const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Iniciando navegador...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--lang=pt-BR']
  });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9'
  });

  const url = 'https://www.google.com/maps/place/Ga%C3%BAcho+Burger+Original/data=!4m7!3m6!1s0x7acc30038096959:0x737f94d3512f9b8e!8m2!3d-7.1584895!4d-34.8303626!16s%2Fg%2F11wj8tm52q!19sChIJWWkJOADDrAcRjpsvUdOUf3M';
  console.log(`Navegando para: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  console.log('Aguardando 5 segundos...');
  await new Promise(r => setTimeout(r, 5000));

  // Tira print
  const screenshotPath = path.join(__dirname, 'gmaps_test.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot salvo em: ${screenshotPath}`);

  // Verifica elementos
  const textInfo = await page.evaluate(() => {
    // Busca textos
    const candidates = Array.from(document.querySelectorAll('div, button, span'));
    const matches = [];
    for (const el of candidates) {
      const text = el.textContent.trim().toLowerCase();
      if (text.includes('aberto') || text.includes('fechado') || text.includes('fecha às') || text.includes('horários') || text.includes('expediente') || text.includes('schedule')) {
        const hasClock = el.querySelector('img[src*="clock"]') || el.className?.includes('hours') || el.closest('[data-item-id="oh"]');
        matches.push({
          tag: el.tagName,
          text: text.substring(0, 100),
          className: el.className,
          hasClock: !!hasClock,
          id: el.getAttribute('id'),
          itemId: el.getAttribute('data-item-id')
        });
      }
    }
    return matches.slice(0, 30);
  });

  console.log('Elements matching hours search criteria:', textInfo);

  // Verifica tabelas
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map(tbl => ({
      text: tbl.textContent.substring(0, 100),
      rows: tbl.querySelectorAll('tr').length
    }));
  });
  console.log('Tables on page:', tables);

  await browser.close();
})();
