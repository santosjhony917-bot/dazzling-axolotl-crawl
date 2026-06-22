const puppeteer = require('puppeteer');

async function testNativeScrape() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://www.google.com/search?q=A+Casa+Cafe+Bistro+Joao+Pessoa', { waitUntil: 'domcontentloaded' });
  
  const results = await page.evaluate(async () => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        
        const candidates = Array.from(document.querySelectorAll('div, span, button')).filter(el => {
          const text = el.textContent.toLowerCase();
          const validText = text.includes('hours:') || text.includes('horários:') || text.includes('aberto') || text.includes('fechado') || text.includes('opens') || text.includes('closed');
          return validText && el.offsetParent !== null && el.innerText && el.innerText.length < 100;
        });

        for (const el of candidates) {
          if (el.innerHTML.includes('svg') || el.closest('[role="button"]') || el.getAttribute('role') === 'button') {
            const btn = el.closest('[role="button"]') || el;
            
            try { btn.click(); } catch(e) {}
            try {
              btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            } catch(e) {}
            
            break;
          }
        }
        
        await sleep(2000); 
        
        const tables = Array.from(document.querySelectorAll('table'));
        let targetTable = null;
        
        for (const tbl of tables) {
          const txt = tbl.textContent.toLowerCase();
          if (txt.includes('segunda') || txt.includes('monday') || txt.includes('terça') || txt.includes('tuesday')) {
            targetTable = tbl;
            break;
          }
        }
        
        if (!targetTable) return { success: false, error: "Tabela de horários não encontrada no painel." };
        
        const schedule = {};
        const rows = Array.from(targetTable.querySelectorAll('tr'));
        
        const dayMap = {
          'segunda': 'monday', 'terça': 'tuesday', 'quarta': 'wednesday', 'quinta': 'thursday',
          'sexta': 'friday', 'sábado': 'saturday', 'sabado': 'saturday', 'domingo': 'sunday',
          'monday': 'monday', 'tuesday': 'tuesday', 'wednesday': 'wednesday', 'thursday': 'thursday',
          'friday': 'friday', 'saturday': 'saturday', 'sunday': 'sunday'
        };

        rows.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td, th'));
          if (cells.length >= 2) {
            const dayRaw = cells[0].textContent.toLowerCase().trim();
            const timeRaw = cells[1].textContent.toLowerCase().trim();
            
            let matchedDay = null;
            for (const [key, val] of Object.entries(dayMap)) {
              if (dayRaw.startsWith(key)) {
                matchedDay = val;
                break;
              }
            }
            
            if (matchedDay) {
              if (timeRaw.includes('fechado') || timeRaw.includes('closed')) {
                schedule[matchedDay] = { isOpen: false, slots: [] };
              } else if (timeRaw.includes('24') && (timeRaw.includes('horas') || timeRaw.includes('hours'))) {
                schedule[matchedDay] = { isOpen: true, slots: [{ start: '00:00', end: '23:59' }] };
              } else {
                const slotsStr = cells[1].textContent.trim();
                const times = slotsStr.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?/gi);
                
                if (times && times.length >= 2) {
                  const formatTime = (t) => {
                    let cleanT = t.trim().toUpperCase();
                    const isPM = cleanT.includes('PM');
                    const isAM = cleanT.includes('AM');
                    cleanT = cleanT.replace('AM', '').replace('PM', '').trim();
                    if (!cleanT.includes(':')) cleanT += ':00'; 
                    const parts = cleanT.split(':');
                    let hours = parseInt(parts[0], 10);
                    let minutes = parseInt(parts[1], 10);
                    if (isPM && hours < 12) hours += 12;
                    if (isAM && hours === 12) hours = 0;
                    const pad = (n) => String(n).padStart(2, '0');
                    return `${pad(hours)}:${pad(minutes)}`;
                  };
                  
                  schedule[matchedDay] = { 
                    isOpen: true, 
                    slots: [{ start: formatTime(times[0]), end: formatTime(times[1]) }] 
                  };
                } else {
                  schedule[matchedDay] = { isOpen: true, slots: [] };
                }
              }
            }
          }
        });
        
        return { success: true, schedule };
  });

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

testNativeScrape().catch(console.error);
