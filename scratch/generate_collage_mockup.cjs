const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Iniciando captura das telas para o Collage Mockup Compacto (Opção 2)...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=375,812']
  });
  const page = await browser.newPage();
  
  // Set viewport to mobile size (iPhone X ratio)
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  try {
    const url = 'http://localhost:8080/restaurant/mock-premium-restaurant-id';
    console.log(`Navegando para: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Aguarda carregar e renderizar
    await new Promise(r => setTimeout(r, 3000));

    // 1. Tirar foto da primeira aba (Galeria de Fotos)
    console.log('Capturando Aba Galeria (Fotos)...');
    const screenshotGalleryPath = path.join(__dirname, 'temp_collage_gallery.png');
    await page.screenshot({ path: screenshotGalleryPath });

    // 2. Clicar na aba Cardápio e capturar
    console.log('Clicando na aba Cardápio...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const menuButton = buttons.find(b => b.textContent.includes('Cardápio'));
      if (menuButton) {
        menuButton.click();
      } else {
        console.error('Botão de Cardápio não encontrado via texto.');
      }
    });
    await new Promise(r => setTimeout(r, 2000));
    
    // Rolagem suave para mostrar alguns itens do cardápio
    await page.evaluate(() => {
      window.scrollBy({ top: 350, behavior: 'smooth' });
    });
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('Capturando Aba Cardápio...');
    const screenshotMenuPath = path.join(__dirname, 'temp_collage_menu.png');
    await page.screenshot({ path: screenshotMenuPath });

    // 3. Clicar na aba Informações e capturar
    console.log('Clicando na aba Informações...');
    // Volta o scroll ao topo para garantir clique e depois clica na aba Info
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const infoButton = buttons.find(b => b.textContent.includes('Informações'));
      if (infoButton) {
        infoButton.click();
      } else {
        console.error('Botão de Informações não encontrado via texto.');
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Rola um pouco para baixo para mostrar endereço/horários/redes
    await page.evaluate(() => {
      window.scrollBy({ top: 400, behavior: 'smooth' });
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Capturando Aba Informações...');
    const screenshotInfoPath = path.join(__dirname, 'temp_collage_info.png');
    await page.screenshot({ path: screenshotInfoPath });

    // Converter para base64
    const galleryBase64 = fs.readFileSync(screenshotGalleryPath).toString('base64');
    const menuBase64 = fs.readFileSync(screenshotMenuPath).toString('base64');
    const infoBase64 = fs.readFileSync(screenshotInfoPath).toString('base64');

    // 4. Gerar o mockup do collage e da mensagem de WhatsApp
    console.log('Compondo HTML do collage compacto e WhatsApp...');
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>WhatsApp Collage Mockup</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #efeae2;
          background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png');
          background-repeat: repeat;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }

        .chat-container {
          width: 420px;
          background: transparent;
          display: flex;
          flex-direction: column;
          padding: 10px;
          box-sizing: border-box;
        }

        .message-bubble {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 6px;
          box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.13);
          position: relative;
          font-size: 13.5px;
          color: #111b21;
          margin-bottom: 4px;
        }

        .message-bubble.sent {
          background-color: #d9fdd3;
          margin-left: auto;
          border-top-right-radius: 0;
        }

        /* O triângulo do balão do whatsapp */
        .message-bubble.sent::after {
          content: "";
          position: absolute;
          right: -8px;
          top: 0;
          width: 0;
          height: 0;
          border-left: 10px solid #d9fdd3;
          border-bottom: 10px solid transparent;
        }

        /* Banner de colagem premium - reduzido para 220px (proporção widescreen muito mais limpa) */
        .collage-banner {
          width: 100%;
          height: 210px;
          border-radius: 6px;
          background: linear-gradient(135deg, #090e17 0%, #151f32 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.8);
        }

        /* Elementos da colagem redesenhados e escalados */
        .phone-mockup {
          width: 82px;
          height: 160px;
          border-radius: 8px;
          border: 1.5px solid #334155;
          background-color: #000;
          position: absolute;
          box-shadow: 0 6px 16px rgba(0,0,0,0.6);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .phone-mockup img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .phone-left {
          left: 50%;
          transform: translateX(-110px) translateY(18px) rotate(-6deg) scale(0.95);
          z-index: 10;
          opacity: 0.85;
          border-color: #475569;
        }

        .phone-right {
          left: 50%;
          transform: translateX(30px) translateY(18px) rotate(6deg) scale(0.95);
          z-index: 10;
          opacity: 0.85;
          border-color: #475569;
        }

        .phone-center {
          left: 50%;
          transform: translateX(-41px) translateY(14px) scale(1.05);
          z-index: 20;
          box-shadow: 0 8px 24px rgba(0,0,0,0.8);
          border-color: #f97316; /* Cor laranja de destaque do FilterFood */
        }

        /* Tags de Destaques em Glassmorphism compactas no topo */
        .feature-tag {
          position: absolute;
          background-color: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          color: #ffffff;
          padding: 3px 6px;
          border-radius: 20px;
          font-size: 8.5px;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 30;
          display: flex;
          align-items: center;
          gap: 3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .tag-left {
          top: 10px;
          left: 10px;
        }

        .tag-right {
          top: 10px;
          right: 10px;
        }

        .tag-center {
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(249, 115, 22, 0.9);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .tag-icon {
          font-size: 9px;
        }

        .message-text {
          white-space: pre-wrap;
          line-height: 18px;
          margin-top: 8px;
          margin-bottom: 18px;
          padding: 0 4px;
          font-family: inherit;
        }

        .message-time {
          position: absolute;
          bottom: 4px;
          right: 8px;
          font-size: 11px;
          color: #667781;
        }

        .link-highlight {
          color: #027eb5;
          text-decoration: none;
        }

        .link-highlight:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="chat-container">
        <div class="message-bubble sent">
          
          <!-- Collage Banner -->
          <div class="collage-banner">
            
            <!-- Tags Informativas Compactas -->
            <div class="feature-tag tag-left">
              <span class="tag-icon">🍕</span> Cardápio
            </div>
            <div class="feature-tag tag-center">
              <span class="tag-icon">⚡</span> Site Premium Pronto
            </div>
            <div class="feature-tag tag-right">
              <span class="tag-icon">💬</span> WhatsApp
            </div>

            <!-- Phones -->
            <div class="phone-mockup phone-left">
              <img src="data:image/png;base64,${menuBase64}" alt="Cardápio" />
            </div>
            
            <div class="phone-mockup phone-right">
              <img src="data:image/png;base64,${infoBase64}" alt="Informações" />
            </div>

            <div class="phone-mockup phone-center">
              <img src="data:image/png;base64,${galleryBase64}" alt="Início" />
            </div>

          </div>
          
          <!-- Message Text -->
          <div class="message-text">Olá, *Burger & Cia*! 🍔

Criamos uma página de apresentação premium completa para o seu restaurante no FilterFood! Ela destaca suas fotos, seu cardápio interativo e conecta os clientes diretamente ao seu WhatsApp.

Veja na colagem acima o design profissional que já está pronto para o seu negócio! 💻✨

Como seu restaurante ainda não está reivindicado, criamos essa versão de demonstração. Para assumir o controle do perfil, atualizar as informações e começar a receber pedidos sem intermediários, acesse:

👉 <span class="link-highlight">filterfood.com.br/reivindicar/burger-cia</span>

*Seu perfil ficará ativo gratuitamente na modalidade Premium por 14 dias!* 🚀</div>
          
          <div class="message-time">18:05</div>
        </div>
      </div>
    </body>
    </html>
    `;

    const templatePath = path.join(__dirname, 'whatsapp_collage_template.html');
    fs.writeFileSync(templatePath, htmlContent);
    console.log('HTML temporário gravado em:', templatePath);

    // 5. Capturar o mockup de WhatsApp contendo o collage
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 480, height: 500 });
    await page2.goto('file://' + templatePath, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const chatElement = await page2.$('.chat-container');
    if (!chatElement) {
      throw new Error('Elemento .chat-container não encontrado no template.');
    }

    const finalDest = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\664ec392-e05d-4c70-8287-40991e501211\\whatsapp_collage_mockup.png';
    await chatElement.screenshot({ path: finalDest });
    console.log(`Mockup Collage compacto salvo com sucesso em: ${finalDest}`);

    // Limpar arquivos temporários
    fs.unlinkSync(screenshotGalleryPath);
    fs.unlinkSync(screenshotMenuPath);
    fs.unlinkSync(screenshotInfoPath);
    fs.unlinkSync(templatePath);
    console.log('Arquivos temporários excluídos.');

  } catch (err) {
    console.error('Erro ao processar mockup de colagem:', err.stack);
  } finally {
    await browser.close();
  }
})();
