const puppeteer = require('puppeteer');

(async () => {
  console.log('Abrindo Chrome...');
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  console.log('Aba deve estar visível! Fechando em 5 segundos...');
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
  console.log('Teste concluído.');
})();
