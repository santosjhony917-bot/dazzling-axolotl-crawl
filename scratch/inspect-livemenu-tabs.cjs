const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
  const url = "https://livemenu.app/menu/620a771b6e7bfc0012a16264";
  console.log(`🚀 Iniciando Puppeteer para inspecionar e extrair o cardápio completo de: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--window-size=1280,1000']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  
  try {
    console.log("🔗 Carregando a página...");
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Aguarda carregar o container principal do menu
    await page.waitForSelector('.menus__items', { timeout: 15000 });
    
    // Obtém a lista de abas principais (primeiro nível)
    const tabs = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('li.menus__items'));
      return elements.map((el, index) => ({
        index,
        title: el.getAttribute('title') || el.innerText || `Aba ${index}`,
        hasImage: !!el.querySelector('img')
      }));
    });
    
    console.log(`📂 Abas principais (Nível 1) encontradas: ${tabs.length}`);
    console.log(tabs.map(t => `   - [${t.index}] ${t.title}`).join('\n'));
    
    const fullMenu = {};
    
    for (const tab of tabs) {
      console.log(`\n👉 Selecionando Aba [${tab.index}]: "${tab.title}"...`);
      
      // Clica na aba correspondente
      await page.evaluate((idx) => {
        const el = document.querySelectorAll('li.menus__items')[idx];
        if (el) {
          el.scrollIntoView();
          el.click();
        }
      }, tab.index);
      
      // Aguarda o carregamento dos itens e transição
      await new Promise(r => setTimeout(r, 2000));
      
      // Rola a página até o fim para carregar itens lazy-loaded
      console.log("   🔄 Rolando página para carregar itens preguiçosos (lazy-load)...");
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 150;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      
      await new Promise(r => setTimeout(r, 1000));
      
      // Extrai os itens desta aba
      const tabData = await page.evaluate(() => {
        const categories = [];
        
        // Verifica se existem subcategorias na barra lateral/superior nav__item ou similar
        // Na maioria dos layouts do LiveMenu, os itens estão agrupados em seções de categoria na tela.
        // Vamos buscar os títulos das categorias renderizados no menu.
        // O LiveMenu pode usar divs de categorias ou listas.
        const sections = Array.from(document.querySelectorAll('.app-menu-item, .menu_item, li.app-menu-item'));
        
        // Em vez de focar apenas em classes específicas, vamos buscar pelo fluxo do documento.
        // No LiveMenu, cada seção de categoria geralmente é delimitada por um header ou um container de categoria.
        // Vamos agrupar os pratos baseando-nos nos headers de seção visíveis.
        
        // Vamos pegar todas as categorias listadas na navegação secundária
        const secondaryNavs = Array.from(document.querySelectorAll('.nav__item, .category-tab, .tab-item'))
          .map(el => el.textContent.trim())
          .filter(t => t.length > 0);
          
        console.log("Subcategorias detectadas na nav secundária:", secondaryNavs);
        
        // Extrai todos os itens de menu visíveis e seus cabeçalhos
        // Para cada item, podemos achar qual é o título da categoria que vem logo antes dele
        const allElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, li.app-menu-item, div.app-menu-item, .category-title, .section-header'));
        
        let currentCategoryName = 'Geral';
        const itemsByCategory = {};
        
        allElements.forEach(el => {
          const isHeader = el.tagName.startsWith('H') || el.classList.contains('category-title') || el.classList.contains('section-header');
          
          if (isHeader) {
            const text = el.textContent.trim();
            // Evita pegar o nome do restaurante ou do menu principal
            if (text && text.length > 2 && text.length < 50 && !text.includes('Nau Frutos do Mar') && !text.includes('Menu')) {
              currentCategoryName = text;
            }
          } else {
            // É um item de menu
            const titleEl = el.querySelector('.menu_item__title, h3, .title');
            const descEl = el.querySelector('.menu_item__descript, .description, p');
            const priceEl = el.querySelector('.menu_item__price, .price, span');
            const imgEl = el.querySelector('img');
            
            if (titleEl) {
              const name = titleEl.textContent.trim();
              if (name) {
                if (!itemsByCategory[currentCategoryName]) {
                  itemsByCategory[currentCategoryName] = [];
                }
                
                // Evita duplicados dentro da mesma aba/categoria
                if (!itemsByCategory[currentCategoryName].some(item => item.name === name)) {
                  itemsByCategory[currentCategoryName].push({
                    name: name,
                    description: descEl ? descEl.textContent.trim().replace(/\n+/g, ' ') : '',
                    price: priceEl ? priceEl.textContent.trim() : '',
                    image_url: imgEl ? imgEl.src : ''
                  });
                }
              }
            }
          }
        });
        
        return itemsByCategory;
      });
      
      fullMenu[tab.title] = tabData;
      
      // Conta quantos itens extraímos nesta aba
      let tabItemsCount = 0;
      Object.keys(tabData).forEach(cat => {
        tabItemsCount += tabData[cat].length;
      });
      console.log(`   ✨ Concluído! Extraídos ${tabItemsCount} itens em ${Object.keys(tabData).length} categorias.`);
    }
    
    // Salva o cardápio completo estruturado em JSON
    fs.writeFileSync('scratch/full_nau_menu_raw.json', JSON.stringify(fullMenu, null, 2), 'utf-8');
    
    console.log(`\n=============================================================`);
    console.log(`🎉 EXTRAÇÃO COMPLETA DE TODAS AS ABAS REALIZADA!`);
    console.log(`💾 JSON salvo em: scratch/full_nau_menu_raw.json`);
    
    // Mostra resumo formatado
    let totalItems = 0;
    Object.keys(fullMenu).forEach(tabTitle => {
      console.log(`\n[Aba] "${tabTitle}":`);
      Object.keys(fullMenu[tabTitle]).forEach(cat => {
        const count = fullMenu[tabTitle][cat].length;
        totalItems += count;
        console.log(`  - ${cat}: ${count} itens`);
      });
    });
    console.log(`\nTotal Geral de Itens Extraídos: ${totalItems}`);
    console.log(`=============================================================`);
    
  } catch (err) {
    console.error("❌ Erro durante a extração:", err);
  } finally {
    await browser.close();
  }
}

run();
