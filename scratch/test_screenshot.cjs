const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Capturando tela do app real...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=375,812']
  });
  const page = await browser.newPage();
  
  // Define viewport de celular (iPhone X)
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  try {
    // Tenta abrir a página de um restaurante mock
    const url = 'http://localhost:8080/restaurant/mock-premium-restaurant-id';
    console.log(`Navegando para: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Aguarda um tempo para animações
    await new Promise(r => setTimeout(r, 3000));

    const screenshotPath = path.join(__dirname, 'restaurant_screenshot.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot salvo com sucesso em: ${screenshotPath}`);
  } catch (err) {
    console.error('Erro ao capturar tela:', err.message);
  } finally {
    await browser.close();
  }
})();
