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

  const query = 'Gaúcho Burger Original João Pessoa';
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  console.log(`Navegando para: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  console.log('Aguardando 5 segundos...');
  await new Promise(r => setTimeout(r, 5000));

  // Tira print do resultado da busca
  const screenshotPath = path.join(__dirname, 'gmaps_search_result.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot salvo em: ${screenshotPath}`);

  // Verifica se o painel de horários existe
  const exists = await page.evaluate(() => {
    const btn = document.querySelector('button[data-item-id="oh"]') || document.querySelector('button.CsEnBe');
    return !!btn;
  });
  console.log('Hours button exists:', exists);

  if (exists) {
    // Clica para expandir
    await page.evaluate(() => {
      const btn = document.querySelector('button[data-item-id="oh"]') || document.querySelector('button.CsEnBe');
      if (btn) btn.click();
    });
    console.log('Clicked hours button, waiting 2s...');
    await new Promise(r => setTimeout(r, 2000));

    // Tira print após clique
    const expandedPath = path.join(__dirname, 'gmaps_search_expanded.png');
    await page.screenshot({ path: expandedPath });
    console.log(`Screenshot expandido salvo em: ${expandedPath}`);

    // Verifica tabelas
    const tables = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table')).map(tbl => ({
        text: tbl.textContent.substring(0, 200),
        rows: tbl.querySelectorAll('tr').length
      }));
    });
    console.log('Tables on page:', tables);
  }

  await browser.close();
})();
