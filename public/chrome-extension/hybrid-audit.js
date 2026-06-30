'use strict';

const HYBRID_PRICE_RE = /(?:R\$\s*)?\d{1,4}(?:[.,]\d{2})(?!\d)/i;
const waitHybrid = ms => new Promise(resolve => setTimeout(resolve, ms));
const isUnsafeHybridMenuDestination = value => {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
    if (['instagram.com', 'threads.net', 'threads.com', 'facebook.com', 'fb.com', 'tiktok.com', 'x.com', 'twitter.com', 'youtube.com'].some(domain => host === domain || host.endsWith('.' + domain))) return true;
    return /\/(?:share|sharer|intent|login|auth|account|cart|checkout|wp-json|feed\b|tag\/|author\/|category\/(?:bookkeeping|contabilidade|blog|noticias|news))|[?&](?:share|u|url)=https?%3a/i.test(pathAndQuery);
  } catch (_) {
    return true;
  }
};

async function auditMenuPage(url, options = {}) {
  if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('URL de cardápio inválida.');
  if (isUnsafeHybridMenuDestination(url)) throw new Error('URL bloqueada: destino não parece ser cardápio.');
  const previousTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const previousTabId = previousTabs[0]?.id;
  const tab = await chrome.tabs.create({ url, active: true });
  let keepTabOpen = false;
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Tempo excedido ao abrir o cardápio.')), 30000);
      const listener = (tabId, info) => {
        if (tabId === tab.id && info.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    await waitHybrid(1200);
    const currentBefore = await chrome.tabs.get(tab.id);
    if (isUnsafeHybridMenuDestination(currentBefore?.url || url)) {
      throw new Error(`Destino bloqueado após navegação: ${currentBefore?.url || url}`);
    }
    const injection = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
        const priceRe = /(?:R\$\s*)?\d{1,4}(?:[.,]\d{2})(?!\d)/i;
        const clickWords = ['aceitar', 'concordo', 'entendi', 'apenas visualizar', 'quero continuar aqui', 'ver cardápio', 'ver cardapio', 'continuar sem informar', 'ver mesmo assim', 'fechar'];
        const isUnsafeHref = href => {
          try {
            const parsed = new URL(href, location.href);
            const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
            const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
            if (['instagram.com', 'threads.net', 'threads.com', 'facebook.com', 'fb.com', 'tiktok.com', 'x.com', 'twitter.com', 'youtube.com'].some(domain => host === domain || host.endsWith('.' + domain))) return true;
            return /\/(?:share|sharer|intent|login|auth|account|cart|checkout|wp-json|feed\b|tag\/|author\/|category\/(?:bookkeeping|contabilidade|blog|noticias|news))|[?&](?:share|u|url)=https?%3a/i.test(pathAndQuery);
          } catch (_) {
            return true;
          }
        };
        for (const button of document.querySelectorAll('button, [role="button"], a')) {
          const text = normalize(button.textContent).toLowerCase();
          if (button.tagName === 'A' && isUnsafeHref(button.href || button.getAttribute('href') || '')) continue;
          if (clickWords.some(word => text === word || text.includes(word))) {
            try { button.click(); } catch (_) {}
          }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        const scrollTargets = [document.scrollingElement, ...document.querySelectorAll('[style*="overflow"], main, [role="main"]')].filter(Boolean);
        for (let pass = 0; pass < 5; pass++) {
          for (const target of scrollTargets) {
            try { target.scrollTop = Math.min(target.scrollHeight, target.scrollTop + Math.max(500, target.clientHeight)); } catch (_) {}
          }
          await new Promise(resolve => setTimeout(resolve, 350));
        }
        const selectors = ['article', 'li', '[data-testid*="product"]', '[data-testid*="item"]', '[class*="product"]', '[class*="Product"]', '[class*="menu-item"]', '[class*="MenuItem"]', '[class*="item-card"]', '[class*="ItemCard"]'];
        const items = [];
        const seen = new Set();
        for (const element of document.querySelectorAll(selectors.join(','))) {
          const itemText = normalize(element.innerText || element.textContent);
          if (itemText.length < 4 || itemText.length > 800) continue;
          const priceMatch = itemText.match(priceRe);
          const headings = element.querySelectorAll('h1,h2,h3,h4,strong,b,[class*="title"],[class*="name"]');
          let name = [...headings].map(node => normalize(node.textContent)).find(value => value && !priceRe.test(value));
          if (!name && priceMatch) name = normalize(itemText.slice(0, priceMatch.index));
          if (!name) continue;
          name = name.replace(/[|•·\-–—]+$/g, '').trim();
          if (name.length < 2 || name.length > 180 || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());
          items.push({ name, price: priceMatch?.[0] || null, price_type: priceMatch ? 'fixed' : 'unknown', description: itemText.replace(name, '').replace(priceMatch?.[0] || '', '').trim() || null });
        }
        const bodyText = normalize(document.body?.innerText || '');
        const blockerRules = [
          ['captcha', /captcha|não sou um robô|i am not a robot/i],
          ['cloudflare', /checking your browser|verificando seu navegador|just a moment/i],
          ['login', /faça login|entre para continuar|sign in to continue/i],
          ['cep', /informe|digite|insira.{0,15}(cep|endereço)/i],
          ['closed_store', /loja.{0,20}fechada|estabelecimento.{0,20}fechado/i],
          ['consent', /aceitar cookies|consentimento|política de cookies/i]
        ];
        const blockers = blockerRules.filter(([, pattern]) => pattern.test(bodyText)).map(([type]) => type);
        const pricedItems = items.filter(item => item.price).length;
        const priceCoverage = items.length ? pricedItems / items.length : 0;
        window.scrollTo(0, 0);
        return { rawText: (document.body?.innerText || '').slice(0, 120000), title: document.title, finalUrl: location.href, items: items.slice(0, 1000), blockers, metrics: { itemCandidates: items.length, pricedItems, priceCoverage, textLength: document.body?.innerText?.length || 0, scrollHeight: document.documentElement.scrollHeight } };
      }
    });
    const snapshot = injection[0]?.result || {};
    if (isUnsafeHybridMenuDestination(snapshot.finalUrl || url)) {
      return { success: false, error: `Destino bloqueado após auditoria: ${snapshot.finalUrl || url}`, finalUrl: snapshot.finalUrl || url };
    }
    const screenshots = [];
    const itemCount = snapshot.metrics?.itemCandidates || 0;
    const priceCoverage = snapshot.metrics?.priceCoverage || 0;
    const unresolvedBlockers = (snapshot.blockers || []).filter(blocker => ['captcha', 'cloudflare', 'login'].includes(blocker));
    const needsVisualEvidence = Boolean(options.forceScreenshots)
      || itemCount < 5
      || priceCoverage < 0.65
      || (snapshot.blockers || []).length > 0
      || !HYBRID_PRICE_RE.test(snapshot.rawText || '');
    if (needsVisualEvidence && unresolvedBlockers.length === 0) {
      await chrome.tabs.update(tab.id, { active: true });
      await waitHybrid(500);
      const maxScreenshots = Math.max(1, Math.min(5, Number(options.maxScreenshots || 3)));
      const positions = maxScreenshots <= 2 ? [0, 1] : [0, 0.33, 0.66, 1].slice(0, maxScreenshots);
      for (const position of positions) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: ratio => window.scrollTo(0, Math.max(0, (document.documentElement.scrollHeight - innerHeight) * ratio)), args: [position] });
        // Chrome limita captureVisibleTab a poucas chamadas por segundo.
        await waitHybrid(1200);
        const image = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 72 });
        if (image && !screenshots.includes(image)) screenshots.push(image);
        if (!options.forceScreenshots && itemCount >= 5 && screenshots.length >= 2) break;
      }
    }
    const routeLevel = screenshots.length ? 2 : 1;
    keepTabOpen = unresolvedBlockers.length > 0;
    return { success: true, ...snapshot, screenshots, routeLevel, visualAgentAllowed: unresolvedBlockers.length === 0, strategy: screenshots.length ? 'dom_plus_segmented_local_ocr' : unresolvedBlockers.length ? 'blocked_requires_human' : 'dom_only' };
  } finally {
    if (!keepTabOpen) { try { await chrome.tabs.remove(tab.id); } catch (_) {} }
    if (previousTabId && !keepTabOpen) {
      try { await chrome.tabs.update(previousTabId, { active: true }); } catch (_) {}
    }
  }
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.action !== 'auditMenuHybrid') return false;
  auditMenuPage(message.url, message || {}).then(sendResponse).catch(error => sendResponse({ success: false, error: error.message }));
  return true;
});
