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
  
  console.log('Aguardando 3 segundos...');
  await new Promise(r => setTimeout(r, 3000));

  // Tenta clicar no botão de horários
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('button[data-item-id="oh"]');
    if (btn) {
      btn.click();
      return 'clicked data-item-id="oh"';
    }
    const candidates = Array.from(document.querySelectorAll('button'));
    const ohBtn = candidates.find(b => b.getAttribute('data-item-id') === 'oh' || b.className.includes('CsEnBe') || b.textContent.includes('horários') || b.textContent.includes('fechado') || b.textContent.includes('aberto'));
    if (ohBtn) {
      ohBtn.click();
      return 'clicked fallback button';
    }
    return 'not found';
  });

  console.log('Click action result:', clicked);

  console.log('Aguardando 2 segundos para expansão...');
  await new Promise(r => setTimeout(r, 2000));

  // Tira print
  const screenshotPath = path.join(__dirname, 'gmaps_expanded.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot expandido salvo em: ${screenshotPath}`);

  // Verifica tabelas após clique
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map(tbl => {
      const rowsText = Array.from(tbl.querySelectorAll('tr')).map(tr => tr.textContent.trim());
      return {
        rowsCount: rowsText.length,
        rowsText
      };
    });
  });
  console.log('Tables on page after click:', JSON.stringify(tables, null, 2));

  await browser.close();
})();
