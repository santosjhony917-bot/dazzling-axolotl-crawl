const puppeteer = require('puppeteer');

async function testClick() {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--window-size=1280,800'] });
  const page = await browser.newPage();
  
  await page.goto("https://livemenu.app/menu/620a771b6e7bfc0012a16264", { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  
  // Click on "Menu à La Carte."
  const clicked = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('li, .nav__item, .menus__items'));
    const target = tabs.find(t => (t.title || t.textContent).includes('La Carte'));
    if (target) {
      target.click();
      return true;
    }
    return false;
  });
  
  console.log("Clicked Menu à La Carte:", clicked);
  
  await new Promise(r => setTimeout(r, 4000));
  
  // Extract content
  const ctx = await page.evaluate(() => {
      function extractContent(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'IFRAME'].includes(node.tagName)) return '';
          
          let text = '';
          try {
            const style = window.getComputedStyle(node);
            if (style && style.backgroundImage && style.backgroundImage !== 'none' && style.backgroundImage.includes('url(')) {
              const src = style.backgroundImage.match(/url\((["']?)(.*?)\1\)/)[2];
              if (src && !src.startsWith('data:image') && !src.includes('icon')) text += ` [IMAGEM: ${src}] `;
            }
          } catch(e) {}

          const titleOrLabel = node.getAttribute('title') || node.getAttribute('aria-label');
          if (titleOrLabel && titleOrLabel.length > 30) text += ` [${titleOrLabel}] `;

          for (let child of node.childNodes) {
            const childText = extractContent(child);
            if (childText) text += ' ' + childText;
          }
          if (['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'ARTICLE', 'SECTION'].includes(node.tagName)) text += '\n';
          return text;
        }
        return '';
      }
      return extractContent(document.body).replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
  });
  
  const fs = require('fs');
  fs.writeFileSync('scratch/livemenu_lacarte_dump.txt', ctx);
  console.log("Dump salvo em scratch/livemenu_lacarte_dump.txt");
  
  await browser.close();
}
testClick();
