'use strict';

const FilterFoodUniversalAgent = (() => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const socialHosts = ['instagram.com', 'facebook.com', 'threads.com', 'threads.net', 'tiktok.com', 'x.com', 'twitter.com', 'youtube.com', 'meta.ai', 'meta.com', 'about.meta.com'];
  const dangerousText = /comprar|finalizar|pagar|pagamento|excluir|remover|deletar|publicar|enviar pedido|confirmar pedido/i;
  const unsafeNonMenuUrlPattern = /casino|poker|bonus|bono|bet\b|betting|aposta|apostas|slot|slots|gambling|holdem|reward\s*code|cupom|coupon|cashback|fidelidade|loyalty|promocao|promocoes|promo|promotions?|pagamento|payment|wallet|voucher|gift|viagra|forex|crypto|binary|adult|escort|seo-spam|meta\.ai/i;
  const isUnsafeMenuDestination = value => {
    try {
      const parsed = new URL(value || '');
      const haystack = `${parsed.hostname} ${parsed.pathname} ${parsed.search}`.toLowerCase();
      return unsafeNonMenuUrlPattern.test(haystack)
        || /\/(?:promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty|pagamento|payment|wallet|orders?|pedidos?|checkout|cart)(?:\/|$|\?)/i.test(`${parsed.pathname}${parsed.search}`)
        || /[?&](?:tab|origin)=[^&]*(?:cashback|promo|cupom|coupon|fidelidade|payment|pagamento)/i.test(parsed.search);
    } catch (_) {
      return false;
    }
  };

  async function snapshot(tabId) {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
        document.querySelectorAll('[data-ff-agent-id]').forEach(node => node.removeAttribute('data-ff-agent-id'));
        const selectors = 'button,a,[role="button"],[role="link"],input,select,summary,[tabindex]:not([tabindex="-1"])';
        const elements = [];
        for (const element of document.querySelectorAll(selectors)) {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (rect.width < 2 || rect.height < 2 || style.display === 'none' || style.visibility === 'hidden') continue;
          const id = `ff-${elements.length}`;
          element.setAttribute('data-ff-agent-id', id);
          elements.push({
            id,
            tag: element.tagName.toLowerCase(),
            role: element.getAttribute('role') || '',
            text: clean(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('placeholder')).slice(0, 140),
            href: element.href || '',
            aria: clean(element.getAttribute('aria-label')).slice(0, 100),
            disabled: !!element.disabled,
            viewport: rect.top >= 0 && rect.top < innerHeight
          });
          if (elements.length >= 90) break;
        }
        const bodyText = clean(document.body?.innerText || '').slice(0, 3500);
        return {
          url: location.href,
          title: document.title,
          bodyText,
          elements,
          scrollY,
          scrollHeight: document.documentElement.scrollHeight,
          viewportHeight: innerHeight,
          blockers: {
            login: !!document.querySelector('input[type="password"], input[name="username"]') || /faça login|entre para continuar|log in to continue/i.test(bodyText.slice(0, 3000)),
            captcha: /captcha|não sou um robô|i am not a robot/i.test(bodyText.slice(0, 3000))
          }
        };
      }
    });
    return result[0]?.result;
  }

  async function ask(origin, goal, context, state, history) {
    const response = await fetch(`${origin}/api/local-collector/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemContext: [
          'Você controla uma extensão para coletar dados públicos de restaurantes.',
          'Escolha apenas uma próxima ação segura e necessária.',
          'Ações permitidas: click, scroll, wait, back, done, human.',
          'Nunca confirme compras, pagamentos, exclusões, publicações, formulários ou pedidos.',
          'Prefira elementos por significado, não por posição.',
          'Use done somente quando o objetivo estiver comprovadamente atingido.',
          'Responda SOMENTE JSON: {"action":"click|scroll|wait|back|done|human","targetId":"ff-N ou vazio","direction":"down|up","reason":"curto","confidence":0_a_1}.'
        ].join(' '),
        message: JSON.stringify({ goal, context, page: state, recentActions: history.slice(-4) })
      })
    });
    if (!response.ok) throw new Error(`GPT navigator HTTP ${response.status}`);
    const payload = await response.json();
    const json = String(payload.reply || '').match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error('GPT navigator returned no JSON');
    return JSON.parse(json);
  }

  async function act(tabId, decision, state) {
    if (decision.action === 'wait') { await wait(1400); return { ok: true }; }
    if (decision.action === 'back') { await chrome.scripting.executeScript({ target: { tabId }, func: () => history.back() }); await wait(1800); return { ok: true }; }
    if (decision.action === 'scroll') {
      await chrome.scripting.executeScript({ target: { tabId }, func: direction => window.scrollBy({ top: (direction === 'up' ? -1 : 1) * Math.max(500, innerHeight * 0.8), behavior: 'smooth' }), args: [decision.direction || 'down'] });
      await wait(900); return { ok: true };
    }
    if (decision.action !== 'click') return { ok: false, error: 'Unsupported action' };
    const target = state.elements.find(element => element.id === decision.targetId);
    if (!target || target.disabled) return { ok: false, error: 'Target unavailable' };
    if (dangerousText.test(`${target.text} ${target.aria}`)) return { ok: false, requiresHuman: true, error: 'Potentially consequential click blocked' };
    if (isUnsafeMenuDestination(target.href)) return { ok: false, error: `Unsafe destination blocked: ${target.href}` };
    const beforeTabs = await chrome.tabs.query({ currentWindow: true });
    const beforeIds = new Set(beforeTabs.map(tab => tab.id));
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: id => {
        const element = document.querySelector(`[data-ff-agent-id="${id}"]`);
        if (!element) return false;
        element.scrollIntoView({ block: 'center', behavior: 'instant' });
        const anchor = element.closest?.('a[href]') || (element.matches?.('a[href]') ? element : null);
        const href = anchor?.href || '';
        if (/^https?:\/\//i.test(href)) {
          try {
            const parsed = new URL(href);
            const wrapped = parsed.hostname.endsWith('instagram.com') ? parsed.searchParams.get('u') : '';
            location.href = wrapped || href;
            return true;
          } catch (_) {}
        }
        element.click();
        return true;
      },
      args: [decision.targetId]
    });
    await wait(2200);
    const afterTabs = await chrome.tabs.query({ currentWindow: true });
    const newTabs = afterTabs.filter(tab => tab.id && !beforeIds.has(tab.id));
    const activeTab = afterTabs.find(tab => tab.active);
    const nextTab = newTabs[newTabs.length - 1] || (activeTab?.id && activeTab.id !== tabId ? activeTab : null);
    if (nextTab?.id) {
      try { await chrome.tabs.update(nextTab.id, { active: true }); } catch (_) {}
      for (const extra of newTabs) {
        if (extra.id && extra.id !== nextTab.id) try { await chrome.tabs.remove(extra.id); } catch (_) {}
      }
      return { ok: !!result[0]?.result, tabId: nextTab.id };
    }
    return { ok: !!result[0]?.result };
  }

  async function run({ url, goal, context = {}, origin, maxSteps = 8 }) {
    if (!/^https?:\/\//i.test(String(url || ''))) return { success: false, error: 'Invalid start URL' };
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(origin || ''))) return { success: false, error: 'AI origin not allowed' };
    const previous = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = await chrome.tabs.create({ url, active: true });
    let tabId = tab.id;
    const controlledWindowId = tab.windowId;
    const ownedTabs = new Set([tab.id]);
    const history = [];
    let keepOpen = false;
    let startHost = '';
    try { startHost = new URL(url).hostname.toLowerCase(); } catch (_) {}
    const ignoredDestinationHosts = new Set([
      startHost,
      'google.com',
      'www.google.com',
      'google.com.br',
      'www.google.com.br',
      ...(Array.isArray(context.ignoredDestinationHosts) ? context.ignoredDestinationHosts : [])
        .map(host => String(host || '').toLowerCase())
        .filter(Boolean)
    ]);
    const unwrapInstagramRedirect = candidateUrl => {
      try {
        const parsed = new URL(candidateUrl || '');
        const wrapped = parsed.hostname.endsWith('instagram.com') ? parsed.searchParams.get('u') : '';
        return wrapped && /^https?:\/\//i.test(wrapped) ? wrapped : candidateUrl;
      } catch (_) {
        return candidateUrl;
      }
    };
    const tabGuard = async createdTab => {
      if (!createdTab?.id || createdTab.windowId !== controlledWindowId) return;
      ownedTabs.add(createdTab.id);
      await wait(350);
      let createdUrl = createdTab.pendingUrl || createdTab.url || '';
      try {
        const fresh = await chrome.tabs.get(createdTab.id);
        createdUrl = fresh.pendingUrl || fresh.url || createdUrl;
      } catch (_) {}
      const targetUrl = unwrapInstagramRedirect(createdUrl);
      if (isUnsafeMenuDestination(targetUrl)) {
        if (createdTab.id !== tabId) {
          try { await chrome.tabs.remove(createdTab.id); ownedTabs.delete(createdTab.id); } catch (_) {}
        }
        return;
      }
      if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
        try { await chrome.tabs.update(tabId, { url: targetUrl, active: true }); } catch (_) {}
      }
      if (createdTab.id !== tabId) {
        try { await chrome.tabs.remove(createdTab.id); ownedTabs.delete(createdTab.id); } catch (_) {}
      }
    };
    chrome.tabs.onCreated.addListener(tabGuard);
    try {
      await wait(3500);
      for (let step = 0; step < Math.min(18, Math.max(1, maxSteps)); step++) {
        const state = await snapshot(tabId);
        if (!state) throw new Error('Could not inspect page');
        if (isUnsafeMenuDestination(state.url)) {
          return { success: false, requiresHuman: false, history, blocker: 'unsafe_spam_destination', error: `Unsafe destination blocked: ${state.url}` };
        }
        try {
          const current = new URL(state.url);
          const wrapped = current.hostname.endsWith('instagram.com') ? current.searchParams.get('u') : '';
          if (wrapped && /^https?:\/\//i.test(wrapped)) {
            await chrome.tabs.update(tabId, { url: wrapped, active: true });
            await wait(2500);
            continue;
          }
          const isSocial = socialHosts.some(domain => current.hostname === domain || current.hostname.endsWith(`.${domain}`));
          if (context.expectedExternalDestination && !isSocial && /^https?:\/\//i.test(state.url) && !ignoredDestinationHosts.has(current.hostname.toLowerCase())) {
            if (isUnsafeMenuDestination(state.url)) {
              return { success: false, requiresHuman: false, history, blocker: 'unsafe_spam_destination', error: `Unsafe destination blocked: ${state.url}` };
            }
            return { success: true, finalUrl: state.url, title: state.title, rawText: state.bodyText, history, confidence: 0.9 };
          }
        } catch (_) {}
        if (state.blockers?.login || state.blockers?.captcha) {
          keepOpen = true;
          return { success: false, requiresHuman: true, blocker: state.blockers.login ? 'login' : 'captcha', tabId, error: 'Human authentication required' };
        }
        const decision = await ask(origin, goal, context, state, history);
        history.push({ step, url: state.url, decision });
        if (decision.action === 'human') { keepOpen = true; return { success: false, requiresHuman: true, tabId, history, error: decision.reason || 'GPT requested human help' }; }
        if (decision.action === 'done') {
          const finalUrl = state.url;
          if (isUnsafeMenuDestination(finalUrl)) {
            history.push({ step, rejected: 'unsafe_spam_destination', finalUrl });
            await wait(400);
            continue;
          }
          const host = new URL(finalUrl).hostname.toLowerCase();
          const stillSocial = socialHosts.some(domain => host === domain || host.endsWith(`.${domain}`));
          if (stillSocial && context.expectedExternalDestination) {
            history.push({ step, rejected: 'done_on_social_page' });
            await wait(400);
            continue;
          }
          return { success: true, finalUrl, title: state.title, rawText: state.bodyText, history, confidence: Number(decision.confidence || 0) };
        }
        const actionResult = await act(tabId, decision, state);
        if (actionResult.tabId && actionResult.tabId !== tabId) {
          const previousTabId = tabId;
          tabId = actionResult.tabId;
          ownedTabs.add(tabId);
          try { await chrome.tabs.remove(previousTabId); ownedTabs.delete(previousTabId); } catch (_) {}
          await wait(1200);
        }
        if (actionResult.requiresHuman) { keepOpen = true; return { success: false, requiresHuman: true, tabId, history, error: actionResult.error }; }
        if (!actionResult.ok) history.push({ step, actionError: actionResult.error });
      }
      keepOpen = false;
      return { success: false, requiresHuman: false, history, error: 'Navigation step limit reached' };
    } catch (error) {
      keepOpen = false;
      return { success: false, requiresHuman: false, history, error: error.message };
    } finally {
      try { chrome.tabs.onCreated.removeListener(tabGuard); } catch (_) {}
      if (!keepOpen) {
        for (const ownedTabId of ownedTabs) try { await chrome.tabs.remove(ownedTabId); } catch (_) {}
        if (previous[0]?.id) try { await chrome.tabs.update(previous[0].id, { active: true }); } catch (_) {}
      } else {
        for (const ownedTabId of ownedTabs) {
          if (ownedTabId !== tabId) try { await chrome.tabs.remove(ownedTabId); } catch (_) {}
        }
      }
    }
  }

  return { run, snapshot };
})();

globalThis.FilterFoodUniversalAgent = FilterFoodUniversalAgent;
