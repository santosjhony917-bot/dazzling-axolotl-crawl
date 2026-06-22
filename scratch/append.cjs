const fs = require('fs');

const code = `
async function handleMenuScrapeFromInstagram(instagramUrl, restaurantName, sender) {
  console.log('[Extension] Iniciando fluxo completo de cardápio via Instagram:', instagramUrl);
  
  const tab = await chrome.tabs.create({ url: instagramUrl, active: false });
  const tabId = tab.id;
  
  try {
    await new Promise(r => setTimeout(r, 4000));
    
    let bioLink = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const links = Array.from(document.querySelectorAll('a[target="_blank"], a[rel~="nofollow"]'));
        for(let a of links) {
          const href = a.href || '';
          if(href.includes('linktr.ee') || href.includes('bio.link') || href.includes('goomer') || href.includes('anota.ai') || href.includes('livemenu') || href.includes('saipos') || href.includes('wa.me') || href.includes('ola.menu')) {
            return href;
          }
        }
        return null;
      }
    });
    
    let externalUrl = bioLink && bioLink[0] && bioLink[0].result;
    
    if (!externalUrl) {
      await chrome.tabs.remove(tabId);
      return { success: false, error: 'Nenhum link de cardápio encontrado na Bio do Instagram.' };
    }
    
    console.log('[Extension] Link encontrado na bio:', externalUrl);
    
    if (externalUrl.includes('l.instagram.com/?u=')) {
      try {
        const urlParams = new URL(externalUrl).searchParams;
        externalUrl = decodeURIComponent(urlParams.get('u') || externalUrl);
      } catch(e){}
    }
    
    await chrome.tabs.update(tabId, { url: externalUrl });
    await new Promise(r => setTimeout(r, 5000));
    
    if (externalUrl.includes('linktr.ee') || externalUrl.includes('bio.link') || externalUrl.includes('linktree')) {
      console.log('[Extension] Linktree detectado. Procurando botão...');
      let nextLink = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          const anchors = Array.from(document.querySelectorAll('a'));
          const keywords = ['cardapio', 'cardápio', 'menu', 'pedido', 'pedir', 'ifood', 'delivery', 'comprar'];
          for (const a of anchors) {
            const text = (a.innerText || a.textContent || '').toLowerCase();
            const href = (a.href || '').toLowerCase();
            if (keywords.some(k => text.includes(k) || href.includes(k))) return a.href;
          }
          return null;
        }
      });
      let targetUrl = nextLink && nextLink[0] && nextLink[0].result;
      if (targetUrl) {
        console.log('[Extension] Botão de delivery encontrado no Linktree:', targetUrl);
        await chrome.tabs.update(tabId, { url: targetUrl });
        await new Promise(r => setTimeout(r, 6000));
      } else {
        await chrome.tabs.remove(tabId);
        return { success: false, error: 'Nenhum botão de cardápio encontrado no Linktree.' };
      }
    }
    
    console.log('[Extension] Na página do cardápio. Aplicando auto-clicker agressivo...');
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const selectors = [
          '.accordion', '.category-header', '[aria-expanded="false"]', '[data-toggle="collapse"]', 
          '.MuiAccordionSummary-root', '[class*="category"]', '[class*="Category"]', '[class*="accordion"]', 
          '[class*="group-header"]', '[class*="MenuHeader"]'
        ].join(', ');
        document.querySelectorAll(selectors).forEach(el => { try { if(el.getAttribute('aria-expanded') !== 'true') el.click(); } catch(e){} });
        const clickables = document.querySelectorAll('div, span, li, button');
        for (let el of clickables) {
          try {
            const style = window.getComputedStyle(el);
            if (style.cursor === 'pointer' && !el.closest('a') && !el.closest('button[type="submit"]')) el.click();
          } catch(e) {}
        }
        window.scrollTo(0, document.body.scrollHeight);
      }
    });
    
    await new Promise(r => setTimeout(r, 4000));
    
    try {
      const isAnotaAi = await detectAnotaAiInTab(tabId);
      if (isAnotaAi) {
        console.log('[Extension] Anota AI detectado! Tentando API nativa...');
        const slug = await getSlugFromTab(tabId);
        if (slug) {
          const apiRes = await fetch('https://api.anota.ai/v1/menu/merchant?slug=' + slug);
          if (apiRes.ok) {
            const json = await apiRes.json();
            const parsedMenu = parseAnotaAiMenu(json);
            if (parsedMenu) {
              await chrome.tabs.remove(tabId);
              return { success: true, parsedMenu };
            }
          }
        }
      }
    } catch(e) {}
    
    let domText = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => document.body.innerText
    });
    
    await chrome.tabs.remove(tabId);
    return { success: true, rawText: domText && domText[0] && domText[0].result };
    
  } catch (err) {
    console.error('Erro no handleMenuScrapeFromInstagram:', err);
    try { await chrome.tabs.remove(tabId); } catch(e){}
    return { success: false, error: err.message };
  }
}
`;

fs.appendFileSync('public/chrome-extension/background.js', '\n\n' + code);
console.log('Appended successfully.');
