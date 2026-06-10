const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const urls = [
  {
    name: 'Instadelivery (Hamburgueria scooby)',
    url: 'https://instadelivery.com.br/scoobydooburger',
    type: 'instadelivery'
  },
  {
    name: 'Google Search Menu (The Outset Burger)',
    url: 'https://www.google.com/search?sca_esv=17317455c5eb4af0&q=The+Outset+Burger+Jo%C3%A3o+Pessoa+%22cardapio%22+menu&sa=X&ved=2ahUKEwi4z9qHwviUAxVmaHADHb7uBwIQ5t4CegQIIxAB#menu',
    type: 'google'
  },
  {
    name: 'Restaurant Guru (Johnny Rockets João Pessoa)',
    url: 'https://pt.restaurantguru.com/Johnny-Rockets-Joao-Pessoa-2/menu',
    type: 'restaurantguru'
  },
  {
    name: 'Delivery Direto (Burger In Pack)',
    url: 'https://deliverydireto.com.br/burgerinpack',
    type: 'deliverydireto'
  }
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,800',
      '--lang=pt-BR,pt'
    ]
  });

  const results = {};

  for (const item of urls) {
    console.log(`\n=========================================`);
    console.log(`Analyzing: ${item.name}`);
    console.log(`URL: ${item.url}`);
    console.log(`=========================================`);

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9'
    });
    
    // Set viewport based on platform type
    if (item.type === 'instadelivery' || item.type === 'deliverydireto') {
      await page.setViewport({ width: 450, height: 900, isMobile: true, hasTouch: true });
    } else {
      await page.setViewport({ width: 1280, height: 800 });
    }

    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 4000)); // Wait for render and lazy assets

      const screenshotName = `${item.type}_screenshot.png`;
      const screenshotPath = path.join(__dirname, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to: ${screenshotPath}`);

      const analysis = await page.evaluate(() => {
        const textContent = document.body.innerText || '';
        const bodyHtml = document.body.innerHTML || '';
        
        // 1. Image elements analysis
        const imageTags = Array.from(document.querySelectorAll('img'));
        const imagesWithSrc = imageTags.map(img => ({
          src: img.src || '',
          alt: img.alt || '',
          width: img.naturalWidth || img.width || 0,
          height: img.naturalHeight || img.height || 0
        }));

        // 2. Identify potential categories (headings and tabs)
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
          tag: h.tagName,
          text: h.textContent.trim(),
          class: h.className
        }));

        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a.btn, span.btn')).map(b => ({
          text: b.textContent.trim(),
          class: b.className,
          id: b.id,
          tag: b.tagName
        }));

        // 3. Search for pagination buttons ("Ver mais", "Carregar mais")
        const verMaisElements = [];
        const allElements = Array.from(document.querySelectorAll('*'));
        allElements.forEach(el => {
          const text = el.textContent.trim().toLowerCase();
          if (
            (text === 'ver mais' || text === 'carregar mais' || text === 'mostrar mais' || text.includes('load more')) &&
            el.children.length === 0 &&
            ['BUTTON', 'A', 'SPAN', 'DIV'].includes(el.tagName)
          ) {
            verMaisElements.push({
              tag: el.tagName,
              text: el.textContent.trim(),
              class: el.className,
              html: el.outerHTML
            });
          }
        });

        // 4. Look for price elements to identify item containers
        const priceElements = [];
        allElements.forEach(el => {
          if (el.children.length === 0 && el.textContent.match(/R\$\s*\d+/i)) {
            priceElements.push({
              text: el.textContent.trim(),
              tag: el.tagName,
              class: el.className,
              parentClass: el.parentElement ? el.parentElement.className : ''
            });
          }
        });

        return {
          title: document.title,
          url: window.location.href,
          textLength: textContent.length,
          imageCount: imageTags.length,
          imagesSample: imagesWithSrc.slice(0, 15),
          headingsSample: headings.slice(0, 20),
          buttonsSample: buttons.filter(b => b.text.length > 0).slice(0, 20),
          verMaisElements,
          priceElementsSample: priceElements.slice(0, 15),
          htmlSample: bodyHtml.substring(0, 1000)
        };
      });

      results[item.type] = {
        name: item.name,
        url: item.url,
        ...analysis,
        screenshot: screenshotPath
      };

    } catch (err) {
      console.error(`Error analyzing ${item.name}:`, err.message);
      results[item.type] = {
        name: item.name,
        url: item.url,
        error: err.message
      };
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const outputPath = path.join(__dirname, 'menu_analysis_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nAnalysis completed. Results saved to: ${outputPath}`);
})();
