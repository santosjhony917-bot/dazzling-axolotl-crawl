const puppeteer = require('puppeteer');

async function testGoogleSearchHours(query) {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  
  console.log(`Buscando no Google: ${query}`);
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const result = await page.evaluate(() => {
    // Tenta achar a div que contém os horários no painel do conhecimento
    const hoursElements = Array.from(document.querySelectorAll('div, span')).filter(el => {
      const text = el.textContent.toLowerCase();
      return (text.includes('horário') || text.includes('aberto') || text.includes('fechado') || text.includes('fecha às')) && 
             el.offsetParent !== null;
    });
    
    // Tenta clicar no elemento que expande a tabela
    for (const el of hoursElements) {
      if (el.innerHTML.includes('svg') || el.closest('[role="button"]') || el.getAttribute('role') === 'button') {
        const btn = el.closest('[role="button"]') || el;
        btn.click();
        break;
      }
    }
    
    return "Clique disparado. Aguardando tabela...";
  });
  
  console.log(result);
  await new Promise(r => setTimeout(r, 2000));
  
  const tableData = await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return "Nenhuma tabela de horários encontrada.";
    
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.map(tr => {
      const cells = Array.from(tr.querySelectorAll('td'));
      return cells.map(td => td.textContent.trim()).join(' - ');
    });
  });
  
  console.log("Horários extraídos:");
  console.log(tableData);
  
  await browser.close();
}

testGoogleSearchHours("A Casa Café Bistrô João Pessoa PB");
