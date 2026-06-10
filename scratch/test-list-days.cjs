const puppeteer = require('puppeteer');

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
  
  await new Promise(r => setTimeout(r, 4000));

  // Clica no botão de horários
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-item-id="oh"]') || document.querySelector('button.CsEnBe');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 3000));

  // Procura por todos os dias da semana na página
  const daysFound = await page.evaluate(() => {
    const days = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'sabado', 'domingo', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const results = [];
    
    // Varre todos os elementos de texto da página
    const elements = Array.from(document.querySelectorAll('*'));
    for (const el of elements) {
      if (el.children.length === 0 && el.textContent) {
        const text = el.textContent.trim().toLowerCase();
        const matchedDay = days.find(d => text.includes(d));
        if (matchedDay) {
          results.push({
            tag: el.tagName,
            text: text,
            parentClass: el.parentElement ? el.parentElement.className : '',
            grandparentClass: (el.parentElement && el.parentElement.parentElement) ? el.parentElement.parentElement.className : ''
          });
        }
      }
    }
    return results;
  });

  console.log('Days of the week found in text elements:', daysFound);

  // Procura por todas as imagens e SVGs ou botões clicáveis no painel de horários
  const interactives = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, [role="button"], img, svg')).map(el => ({
      tag: el.tagName,
      text: el.textContent.trim(),
      ariaLabel: el.getAttribute('aria-label'),
      className: el.className,
      id: el.getAttribute('id')
    }));
  });
  console.log('Interactive elements on page:', interactives);

  await browser.close();
})();
