const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  let chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (!fs.existsSync(chromePath)) {
      chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  }

  console.log("🚀 Iniciando o Chrome nativo do usuário: " + chromePath);
  
  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      executablePath: chromePath,
      args: ['--start-maximized', '--user-data-dir=C:\\temp_puppeteer_profile']
    });

    const page = await browser.newPage();
    
    console.log("🌐 Acessando o painel de administração...");
    await page.goto('http://localhost:8080/admin/dashboard?tab=google-maps', { waitUntil: 'domcontentloaded' });
    
    console.log("⏳ Aguardando a interface carregar completamente...");
    await new Promise(r => setTimeout(r, 5000));

    console.log("🔍 Procurando o input de busca...");
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const searchInput = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('buscar'));
      if (searchInput) {
        searchInput.value = 'baixinho lanches';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise(r => setTimeout(r, 3000));

    console.log("🤖 Procurando o botão 'Validar IA' para esse restaurante...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const validarBtn = buttons.find(b => b.textContent && b.textContent.includes('Validar IA'));
      if (validarBtn) validarBtn.click();
    });

    console.log("👀 O navegador ficará aberto por 60 segundos para você observar.");
    await new Promise(r => setTimeout(r, 60000));
    await browser.close();
  } catch (e) {
    console.error("Erro ao iniciar o Chrome visível:", e);
  }
})();
