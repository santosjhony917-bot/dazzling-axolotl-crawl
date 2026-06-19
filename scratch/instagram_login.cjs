const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("==================================================");
  console.log("🔐 SCRIPT DE LOGIN MANUAL DO INSTAGRAM (COOKIES)");
  console.log("==================================================");
  console.log("Iniciando o navegador na sua tela...");
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null, 
    args: ['--start-maximized', '--lang=pt-BR', '--disable-setuid-sandbox', '--no-sandbox'] 
  });
  
  const page = await browser.newPage();
  
  console.log("Navegando para o Instagram...");
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
  
  console.log("👉 POR FAVOR, FAÇA O LOGIN NA JANELA QUE ABRIU!");
  console.log("⚠️ ATENÇÃO: NÃO FECHE O NAVEGADOR! Após você logar com sucesso, ele se fechará sozinho e salvará a sessão.");
  
  let waitCount = 0;
  // Espera até que a URL mude e não contenha mais login, ou até 5 minutos (300 segundos)
  while ((page.url().includes('/accounts/login/') || page.url().includes('/login')) && waitCount < 300) {
    await new Promise(r => setTimeout(r, 1000));
    waitCount++;
  }
  
  if (page.url().includes('/accounts/login/') || page.url().includes('/login')) {
    console.log("❌ Tempo limite esgotado. Você não logou a tempo.");
    await browser.close();
    process.exit(1);
  }
  
  console.log("✅ Login detectado com sucesso!");
  console.log("Aguardando 5 segundos para a página estabilizar e carregar os cookies...");
  await new Promise(r => setTimeout(r, 5000));
  
  console.log("💾 Salvando cookies da sessão para os robôs usarem em segundo plano...");
  const cookies = await page.cookies();
  const cookiesPath = path.join(__dirname, 'instagram_cookies.json');
  fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
  
  console.log("🎉 SUCESSO! Cookies salvos em instagram_cookies.json.");
  console.log("Agora os robôs do painel (como a Fase 5) poderão acessar o Instagram silenciosamente em segundo plano sem travar!");
  
  await browser.close();
  process.exit(0);
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
