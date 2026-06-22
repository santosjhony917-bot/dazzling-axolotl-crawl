
const isTabLockError = e => e && e.message && (
  e.message.toLowerCase().includes('cannot be edited') ||
  e.message.toLowerCase().includes('locked') ||
  e.message.toLowerCase().includes('dragging')
);

async function createTabWithRetry(options, maxRetries = 10) {
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('options must be an object');
  }
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await chrome.tabs.create(options);
    } catch (e) {
      if (isTabLockError(e)) {
        console.warn('Chrome is locked. Retrying tab creation...', i);
        const delay = 200 * Math.pow(1.5, i);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  throw new Error('Timeout: Chrome tabs locked for too long.');
}

async function removeTabWithRetry(tabId, maxRetries = 10) {
  if (typeof tabId !== 'number') {
    throw new TypeError('tabId must be a number');
  }
  try {
    await new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          reject(new Error('Tab does not exist'));
        } else {
          resolve();
        }
      });
    });
  } catch (e) {
    return;
  }
  for (let i = 0; i < maxRetries; i++) {
    try {
      await chrome.tabs.remove(tabId);
      return;
    } catch (e) {
      if (isTabLockError(e)) {
        console.warn('Chrome is locked. Retrying tab remove...', i);
        const delay = 200 * Math.pow(1.5, i);
        await new Promise(r => setTimeout(r, delay));
      } else {
        return;
      }
    }
  }
}

async function updateTabWithRetry(tabId, options, maxRetries = 10) {
  if (typeof tabId !== 'number') {
    throw new TypeError('tabId must be a number');
  }
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('options must be an object');
  }
  try {
    await new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          reject(new Error('Tab does not exist'));
        } else {
          resolve();
        }
      });
    });
  } catch (e) {
    throw new Error(`Tab ${tabId} does not exist: ${e.message}`);
  }
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await chrome.tabs.update(tabId, options);
    } catch (e) {
      if (isTabLockError(e)) {
        console.warn('Chrome is locked. Retrying tab update...', i);
        const delay = 200 * Math.pow(1.5, i);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  throw new Error('Timeout: Chrome tabs locked for too long.');
}

async function waitForTabToComplete(tabId, timeoutMs = 30000) {
  if (typeof tabId !== 'number') {
    throw new TypeError('tabId must be a number');
  }
  try {
    const tab = await new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (t) => {
        if (chrome.runtime.lastError || !t) {
          reject(new Error('Tab does not exist'));
        } else {
          resolve(t);
        }
      });
    });
    if (tab.status === 'complete') {
      return;
    }
  } catch (e) {
    throw new Error(`Tab ${tabId} does not exist: ${e.message}`);
  }
  return new Promise((resolve, reject) => {
    let timer = null;
    const cleanUp = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(removedListener);
      if (timer) clearTimeout(timer);
    };
    const listener = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        cleanUp();
        resolve();
      }
    };
    const removedListener = (removedTabId) => {
      if (removedTabId === tabId) {
        cleanUp();
        reject(new Error(`Tab ${tabId} was closed while waiting to load.`));
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.onRemoved.addListener(removedListener);
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        cleanUp();
        reject(new Error(`Timeout waiting for tab ${tabId} to complete loading.`));
      }, timeoutMs);
    }
  });
}


// Service worker for the Chrome Extension

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log("Recebida mensagem externa:", message, sender);
  
  if (message.action === "ping") {
    sendResponse({ success: true, version: "1.0.0" });
    return true;
  }
  
  if (message.action === "downloadImage") {
    const { url } = message;
    fetch(url)
      .then(async res => {
        if (res.ok) {
          const blob = await res.blob();
          const contentType = blob.type || 'image/jpeg';
          const base64 = await blobToBase64(blob);
          sendResponse({ success: true, logoDataUrl: `data:${contentType};base64,${base64}` });
        } else {
          sendResponse({ success: false, error: "HTTP error: " + res.status });
        }
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Mantém o canal aberto para resposta assíncrona
  }
  
  if (message.action === "scrapeInstagram") {
    const { instagramUrl } = message;
    
    handleInstagramScrape(instagramUrl)
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      
    return true; // Mantém o canal de mensagem aberto para resposta assíncrona
  }
  
  if (message.action === "scrapeInstagramPost") {
    const { url } = message;
    
    handleInstagramPostScrape(url)
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      
    return true; // Mantém o canal de mensagem aberto para resposta assíncrona
  }
  
  // scrapeMenuFromInstagram is now handled via persistent connections onConnectExternal

  if (message.action === "scrapeMenu") {
    const { url } = message;
    
    handleMenuScrape(url, sender)
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      
    return true; // Mantém o canal de mensagem aberto para resposta assíncrona
  }
  
  if (message.action === "scrapeGoogleHours") {
    const { query, mapUrl } = message;
    handleGoogleHoursScrape(query, mapUrl)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.action === "searchGoogleForMenu") {
    const { query } = message;
    handleSearchGoogleForMenu(query)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.action === "scrapeWebContext") {
    const { url } = message;
    handleWebContextScrape(url)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.action === "getAgentSnapshot") {
    handleAgentSnapshot(message.url)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.action === "clickAgentElement") {
    handleClickAgentElement(message.targetId)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "closeAgentTab") {
    handleAgentClose()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "searchGoogleForInstagram") {
    const { query, blocklist } = message;
    handleSearchGoogleForInstagram(query, blocklist || [])
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "searchGoogleNative") {
    const { query } = message;
    handleSearchGoogleNative(query)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

chrome.runtime.onConnectExternal.addListener((port) => {
  console.log("[Extension] Conexão externa via port estabelecida:", port.name);
  
  port.onMessage.addListener(async (message) => {
    console.log("[Extension] Mensagem recebida via port:", message);
    
    if (message && message.action === "scrapeMenuFromInstagram") {
      const { instagramUrl, restaurantName, city, neighborhood } = message;
      try {
        const result = await handleMenuScrapeFromInstagram(instagramUrl, restaurantName, city, neighborhood, port.sender);
        port.postMessage(result);
      } catch (err) {
        console.error("Erro ao processar scrapeMenuFromInstagram via port:", err);
        port.postMessage({ success: false, error: err.message });
      }
    }
  });
});

async function handleSearchGoogleNative(query) {
  console.log("Iniciando busca nativa no Google para:", query);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const tab = await createTabWithRetry({ url: searchUrl, active: false });
  const tabId = tab.id;
  
  try {
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba foi fechada prematuramente."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 30) {
              reject(new Error("Tempo limite na busca do Google."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // Extrai Título, Link e Snippet (resumo) dos resultados
        const items = Array.from(document.querySelectorAll('.g'));
        const scraped = [];
        for (const item of items) {
          const titleEl = item.querySelector('h3');
          const linkEl = item.querySelector('a');
          const snippetEl = item.querySelector('.VwiC3b, .IsZvec'); // Classes comuns de snippet no Google
          
          if (titleEl && linkEl) {
            scraped.push({
              title: titleEl.innerText || titleEl.textContent,
              link: linkEl.href,
              snippet: snippetEl ? (snippetEl.innerText || snippetEl.textContent) : ''
            });
          }
        }
        return scraped;
      }
    });

    const foundResults = results && results[0] && results[0].result;
    if (foundResults && foundResults.length > 0) {
      return { success: true, results: foundResults };
    } else {
      return { success: false, error: "Nenhum resultado encontrado no Google." };
    }
  } catch (err) {
    console.error("Erro na busca nativa do Google:", err);
    return { success: false, error: err.message };
  } finally {
    try {
      await removeTabWithRetry(tabId);
    } catch(e) {}
  }
}

async function handleSearchGoogleForInstagram(query, blocklist) {
  console.log("Iniciando busca por Instagram para:", query);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent('site:instagram.com ' + query)}`;
  const tab = await createTabWithRetry({ url: searchUrl, active: false });
  const tabId = tab.id;
  
  try {
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba foi fechada prematuramente."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 30) {
              reject(new Error("Tempo limite na busca do Google."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (blist) => {
        // Extrai os links do Google
        const anchors = Array.from(document.querySelectorAll('#search a'));
        const links = [];
        for (const a of anchors) {
          if (a.href && a.href.includes('instagram.com')) links.push(a.href);
        }
        
        // Regex para extrair só perfil
        const validProfiles = [];
        for (const link of links) {
          const m = link.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?/);
          if (m && m[1] && m[1] !== 'p' && m[1] !== 'reel' && m[1] !== 'explore' && !m[1].includes('?')) {
            const cleanUrl = `https://www.instagram.com/${m[1]}/`;
            if (!blist.includes(cleanUrl)) {
              validProfiles.push(cleanUrl);
            }
          }
        }
        // Retorna até 3 candidatos únicos
        const unique = [...new Set(validProfiles)];
        return unique.length > 0 ? unique.slice(0, 3) : null;
      },
      args: [blocklist]
    });

    const foundUrls = results && results[0] && results[0].result;
    if (foundUrls && foundUrls.length > 0) {
      return { success: true, candidates: foundUrls, url: foundUrls[0] };
    } else {
      return { success: false, error: "Nenhum link encontrado." };
    }
  } catch (err) {
    console.error("Erro na busca de Instagram:", err);
    return { success: false, error: err.message };
  } finally {
    try {
      await removeTabWithRetry(tabId);
    } catch(e) {}
  }
}


async function handleInstagramScrape(instagramUrl) {
  console.log("Iniciando raspagem para:", instagramUrl);
  // 1. Cria a aba (ativa para evitar o bloqueio de throttling do Chrome)
  const tab = await createTabWithRetry({ url: instagramUrl, active: false });
  const tabId = tab.id;
  
  try {
    // 2. Aguarda o carregamento completo da aba
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba do Instagram foi fechada."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 60) { // 30 segundos de timeout
              reject(new Error("Tempo limite esgotado esperando o perfil do Instagram carregar."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    // Executa a lógica de raspagem na página em um loop com tentativas (máx 6 segundos)
    // para lidar de forma robusta com computadores lentos ou carregamentos demorados do JS
    let scrapeData = null;
    let attempts = 0;
    const maxAttempts = 12;
    
    while (attempts < maxAttempts) {
      // Pequeno intervalo entre tentativas
      await new Promise(r => setTimeout(r, 500));
      attempts++;
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: scrapePageLogic
        });
        
        if (results && results[0] && results[0].result) {
          const res = results[0].result;
          
          // Se for login obrigatório, interrompe imediatamente
          if (res.isLoginRequired) {
            scrapeData = res;
            break;
          }
          
          // Se encontrou a URL da foto de perfil, consideramos sucesso e interrompemos
          if (res.profilePicUrl) {
            scrapeData = res;
            break;
          }
          
          // Caso contrário, guarda o último resultado para fallback
          scrapeData = res;
        }
      } catch (err) {
        console.warn(`Tentativa ${attempts} de execução de script falhou:`, err.message);
      }
    }
    
    if (!scrapeData) {
      throw new Error("Não foi possível ler os dados da aba do Instagram após várias tentativas.");
    }
    
    if (scrapeData.isLoginRequired) {
      // Abre a aba em foco para o usuário fazer login
      await updateTabWithRetry(tabId, { active: true });
      return {
        success: false,
        isLoginRequired: true,
        error: "Login do Instagram necessário. A aba foi aberta para você fazer login manualmente."
      };
    }
    
    if (!scrapeData.success) {
      throw new Error(scrapeData.error || "Erro desconhecido ao raspar o Instagram.");
    }
    
    // 4. Faz download da imagem e converte para base64
    let base64 = null;
    let contentType = 'image/jpeg';
    if (scrapeData.profilePicUrl) {
      try {
        console.log("Fazendo download da imagem:", scrapeData.profilePicUrl);
        const fetchRes = await fetch(scrapeData.profilePicUrl);
        if (fetchRes.ok) {
          const blob = await fetchRes.blob();
          contentType = blob.type || 'image/jpeg';
          base64 = await blobToBase64(blob);
          console.log("Download e conversão base64 bem-sucedidos!");
        } else {
          console.warn("Falha no download da imagem. Status HTTP:", fetchRes.status);
        }
      } catch (err) {
        console.error("Falha ao baixar imagem no service worker:", err);
      }
    }

    let base64Highlights = [];
    if (scrapeData.highlightImages && scrapeData.highlightImages.length > 0) {
      for (const imgUrl of scrapeData.highlightImages) {
        try {
          const fetchRes = await fetch(imgUrl);
          if (fetchRes.ok) {
            const blob = await fetchRes.blob();
            const b64 = await blobToBase64(blob);
            base64Highlights.push(`data:${blob.type || 'image/jpeg'};base64,${b64}`);
          }
        } catch (e) {
          console.error("Erro ao baixar imagem de destaque:", e);
        }
      }
    }

    let base64Feed = [];
    if (scrapeData.feedImages && scrapeData.feedImages.length > 0) {
      for (const imgUrl of scrapeData.feedImages) {
        try {
          const fetchRes = await fetch(imgUrl);
          if (fetchRes.ok) {
            const blob = await fetchRes.blob();
            const b64 = await blobToBase64(blob);
            base64Feed.push(`data:${blob.type || 'image/jpeg'};base64,${b64}`);
          }
        } catch (e) {
          console.error("Erro ao baixar imagem do feed:", e);
        }
      }
    }
    
    // 5. Fecha a aba temporária (pois a raspagem deu certo)
    await removeTabWithRetry(tabId);
    
    return {
      success: true,
      followers: scrapeData.followers,
      bio: scrapeData.bio,
      logoDataUrl: base64 ? `data:${contentType};base64,${base64}` : null,
      rawLogoUrl: scrapeData.profilePicUrl,
      highlightImages: base64Highlights,
      feedImages: base64Feed,
      rawFeedImages: scrapeData.feedImages || []
    };
    
  } catch (err) {
    console.error("Erro no fluxo do scraper:", err);
    // Tenta limpar a aba em caso de erro
    try {
      chrome.tabs.get(tabId, (currentTab) => {
        if (!chrome.runtime.lastError && currentTab) {
          removeTabWithRetry(tabId);
        }
      });
    } catch (_) {}
    
    return {
      success: false,
      error: err.message
    };
  }
}

// Converte Blob para Base64 em ambiente de Service Worker (onde não existe FileReader)
async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Esta função roda diretamente no contexto da página do Instagram
async function scrapePageLogic() {
  const isLogin = window.location.href.includes('accounts/login') || !!document.querySelector('input[name="username"]');
  if (isLogin) {
    return { success: false, isLoginRequired: true, error: "Login do Instagram necessário." };
  }
  
  // 1. Localiza a URL da imagem de perfil de forma robusta e inteligente
  let profilePicUrl = null;
  const allImgs = Array.from(document.querySelectorAll('img'));
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const username = pathParts[0] ? pathParts[0].toLowerCase() : '';

  // Passo A: Tenta localizar a imagem pelo alt contendo o username da conta (evitando destaques)
  if (username) {
    for (const img of allImgs) {
      const alt = (img.alt || '').toLowerCase();
      const src = img.src || '';
      
      const isProfileAlt = alt.includes('perfil') || alt.includes('profile') || alt.includes('avatar');
      const hasUsername = alt.includes(username);
      const isInsideHighlight = !!img.closest('a[href*="/stories/highlights/"]');
      
      if (isProfileAlt && hasUsername && !isInsideHighlight && src.startsWith('http')) {
        profilePicUrl = src;
        break;
      }
    }
  }

  // Passo B: Fallback seletor clássico restringindo a elementos do header
  if (!profilePicUrl) {
    const imgSelectors = [
      'header img[src*="cdninstagram"]',
      'header img[src*="fbcdn"]',
      'header img',
      'img[alt*="Foto de perfil"]:not(a[href*="/stories/"] img)',
      'img[alt*="Foto do perfil"]:not(a[href*="/stories/"] img)',
      'img[alt*="profile picture"]:not(a[href*="/stories/"] img)',
      'img[alt*="Foto del perfil"]:not(a[href*="/stories/"] img)',
      'img[src*="cdninstagram"]:not(a[href*="/stories/"] img)',
      'img[src*="fbcdn"]:not(a[href*="/stories/"] img)'
    ];
    
    for (const sel of imgSelectors) {
      const el = document.querySelector(sel);
      if (el && el.src && el.src.startsWith('http')) {
        profilePicUrl = el.src;
        break;
      }
    }
  }
  
  // Passo C: Fallback programático geral excluindo links de stories/highlights
  if (!profilePicUrl) {
    for (const img of allImgs) {
      const alt = (img.alt || '').toLowerCase();
      const src = img.src || '';
      const isInsideHighlight = !!img.closest('a[href*="/stories/"]');
      
      if ((alt.includes('perfil') || alt.includes('profile') || alt.includes('avatar')) && !isInsideHighlight) {
        if (src.startsWith('http')) {
          profilePicUrl = src;
          break;
        }
      }
    }
  }
  
  // 2. Extrai seguidores
  let followersCount = null;
  
  // Função auxiliar para interpretar os valores (ex: 10k -> 10000, 1,2mil -> 1200)
  function parseFollowersValue(numberStr, multiplierStr) {
    let clean = numberStr.trim();
    if (multiplierStr) {
      clean = clean.replace(',', '.');
      let val = parseFloat(clean);
      if (isNaN(val)) return null;
      
      const mult = multiplierStr.toLowerCase().trim();
      if (mult === 'k' || mult === 'mil') {
        val = val * 1000;
      } else if (mult === 'm' || mult === 'mi' || mult === 'milões' || mult === 'mili') {
        val = val * 1000000;
      }
      return Math.round(val);
    } else {
      if (clean.includes('.') && clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (clean.includes('.')) {
        const parts = clean.split('.');
        if (parts[parts.length - 1].length === 3) {
          clean = clean.replace(/\./g, '');
        } else {
          clean = clean.replace(/\./g, '.');
        }
      } else if (clean.includes(',')) {
        const parts = clean.split(',');
        if (parts[parts.length - 1].length === 3) {
          clean = clean.replace(/,/g, '');
        } else {
          clean = clean.replace(/,/g, '.');
        }
      }
      let val = parseFloat(clean);
      return isNaN(val) ? null : Math.round(val);
    }
  }
  
  // A. Tenta ler pela tag meta description
  const meta = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
  const metaContent = meta ? meta.getAttribute('content') : null;
  
  if (metaContent) {
    const regexPt = /([\d\.,]+)\s*(mil|mi|milões|m|k)?\s*seguidores/i;
    const regexEn = /([\d\.,]+)\s*(mil|mi|m|k)?\s*followers/i;
    const match = metaContent.match(regexPt) || metaContent.match(regexEn);
    if (match) {
      followersCount = parseFollowersValue(match[1], match[3] || match[2]);
    }
  }
  
  // B. Fallback: Tenta ler direto pelo texto do DOM
  if (followersCount === null) {
    const domSelectors = [
      'a[href*="/followers/"] span',
      'a[href*="/followers/"]',
      'a[href*="/followers"] span',
      'a[href*="/followers"]',
      'header li:nth-child(2) span',
      'header li:nth-child(2)'
    ];
    
    for (const sel of domSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent || el.innerText;
        if (text && (text.toLowerCase().includes('seguidor') || text.toLowerCase().includes('follower') || /\d/.test(text))) {
          const cleanText = text.replace(/seguidores|seguidor|followers|follower/gi, '').trim();
          const match = cleanText.match(/([\d\.,]+)\s*(mil|mi|m|k)?/i);
          if (match) {
            followersCount = parseFollowersValue(match[1], match[2]);
            if (followersCount !== null) break;
          }
        }
      }
    }
  }
  // C. Extrai a BIO da tag meta
  let bioText = metaContent || '';

  // 3. Raspagem de Destaques (Highlights) do Instagram
  const highlightImages = [];
  try {
    let menuHighlight = null;
    const highlightLinks = Array.from(document.querySelectorAll('a[href*="/stories/highlights/"]'));
    menuHighlight = highlightLinks.find(link => {
      const text = link.textContent.trim().toLowerCase();
      return text.includes('cardapio') || text.includes('cardápio') || text.includes('menu') || text.includes('preço') || text.includes('preco') || text.includes('valores') || text.includes('prato');
    });

    if (!menuHighlight) {
      const keywords = ['cardapio', 'cardápio', 'menu', 'preço', 'preco', 'valores', 'prato'];
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        if (el.children.length === 0) {
          const text = el.textContent.trim().toLowerCase();
          if (keywords.some(kw => text.includes(kw))) {
            const link = el.closest('a[href*="/stories/highlights/"]');
            if (link) {
              menuHighlight = link;
              break;
            }
          }
        }
      }
    }

    if (menuHighlight) {
      menuHighlight.click();
      
      const getActiveStoryImg = () => {
        const section = document.querySelector('section');
        if (section) {
          const imgs = Array.from(section.querySelectorAll('img'));
          for (const img of imgs) {
            const rect = img.getBoundingClientRect();
            const isAvatar = img.closest('header') || rect.width < 100 || rect.height < 100;
            if (!isAvatar && img.src && img.src.startsWith('http')) {
              return img.src;
            }
          }
          const img = section.querySelector('img[decoding="sync"]') || section.querySelector('img');
          if (img && img.src && img.src.startsWith('http')) return img.src;
        }
        return null;
      };

      for (let slide = 0; slide < 8; slide++) {
        // Aguarda carregar o slide
        await new Promise(r => setTimeout(r, 2000));
        
        if (!document.querySelector('section')) {
          break;
        }
        
        const imgUrl = getActiveStoryImg();
        if (imgUrl && !highlightImages.includes(imgUrl)) {
          highlightImages.push(imgUrl);
        }
        
        // Clica para ir ao próximo slide
        const nextBtn = document.querySelector('button[aria-label="Avançar"], button[aria-label="Next"], .coreSpriteRightChevron');
        if (nextBtn) {
          nextBtn.click();
        } else {
          const sec = document.querySelector('section');
          if (sec) {
            const rect = sec.getBoundingClientRect();
            const clickX = rect.left + rect.width * 0.75;
            const clickY = rect.top + rect.height * 0.5;
            const evt = new MouseEvent('click', { clientX: clickX, clientY: clickY, bubbles: true });
            sec.dispatchEvent(evt);
          } else {
            break;
          }
        }
      }
    }
  } catch (highlightErr) {
    console.error("Erro ao raspar destaques:", highlightErr);
  }

  // 4. Raspagem de até 12 imagens do feed do Instagram
  const feedImages = [];
  try {
    const isInvalidImage = (img) => {
      if (!img.src || !img.src.startsWith('http')) return true;
      if (profilePicUrl && img.src === profilePicUrl) return true;
      
      // Filter out small icons < 150px
      const rect = img.getBoundingClientRect ? img.getBoundingClientRect() : null;
      const width = img.naturalWidth || img.width || (rect ? rect.width : 0);
      const height = img.naturalHeight || img.height || (rect ? rect.height : 0);
      
      if ((width > 0 && width < 150) || (height > 0 && height < 150)) {
        return true;
      }
      return false;
    };

    const feedImgs = Array.from(document.querySelectorAll('a[href*="/p/"] img, a[href*="/reel/"] img'));
    for (const img of feedImgs) {
      if (!isInvalidImage(img) && !feedImages.includes(img.src)) {
        feedImages.push(img.src);
        if (feedImages.length >= 12) break;
      }
    }

    if (feedImages.length < 12) {
      const articleImgs = Array.from(document.querySelectorAll('article img'));
      for (const img of articleImgs) {
        if (!isInvalidImage(img) && !feedImages.includes(img.src)) {
          feedImages.push(img.src);
          if (feedImages.length >= 12) break;
        }
      }
    }
  } catch (feedErr) {
    console.error("Erro ao raspar feed:", feedErr);
  }
  
  return {
    success: true,
    profilePicUrl: profilePicUrl,
    followers: followersCount,
    bio: bioText,
    highlightImages: highlightImages,
    feedImages: feedImages
  };
}

async function handleInstagramPostScrape(url) {
  console.log("Iniciando raspagem de post para:", url);
  // 1. Cria a aba (ativa para evitar throttling do Chrome)
  const tab = await createTabWithRetry({ url: url, active: false });
  const tabId = tab.id;
  
  try {
    // 2. Aguarda o carregamento completo da aba
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba do Instagram foi fechada."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 60) { // 30 segundos de timeout
              reject(new Error("Tempo limite esgotado esperando o post do Instagram carregar."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    // Executa a lógica de raspagem na página em um loop com tentativas (máx 6 segundos)
    // para lidar de forma robusta com computadores lentos ou carregamentos demorados do JS
    let scrapeData = null;
    let attempts = 0;
    const maxAttempts = 12;
    
    while (attempts < maxAttempts) {
      // Pequeno intervalo entre tentativas
      await new Promise(r => setTimeout(r, 500));
      attempts++;
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: scrapePostPageLogic
        });
        
        if (results && results[0] && results[0].result) {
          const res = results[0].result;
          
          // Se for login obrigatório, interrompe imediatamente
          if (res.isLoginRequired) {
            scrapeData = res;
            break;
          }
          
          // Se encontrou a URL da imagem do post, consideramos sucesso e interrompemos
          if (res.imageUrl) {
            scrapeData = res;
            break;
          }
          
          // Caso contrário, guarda o último resultado para fallback
          scrapeData = res;
        }
      } catch (err) {
        console.warn(`Tentativa ${attempts} de execução de script de post falhou:`, err.message);
      }
    }
    
    if (!scrapeData) {
      throw new Error("Não foi possível ler os dados da aba do post do Instagram após várias tentativas.");
    }
    
    if (scrapeData.isLoginRequired) {
      // Abre a aba em foco para o usuário fazer login
      await updateTabWithRetry(tabId, { active: true });
      return {
        success: false,
        isLoginRequired: true,
        error: "Login do Instagram necessário. A aba foi aberta para você fazer login manualmente."
      };
    }
    
    if (!scrapeData.success) {
      throw new Error(scrapeData.error || "Erro desconhecido ao raspar o post do Instagram.");
    }
    
    // 4. Faz download da imagem e converte para base64
    let base64 = null;
    let contentType = 'image/jpeg';
    if (scrapeData.imageUrl) {
      try {
        console.log("Fazendo download da imagem do post:", scrapeData.imageUrl);
        const fetchRes = await fetch(scrapeData.imageUrl);
        if (fetchRes.ok) {
          const blob = await fetchRes.blob();
          contentType = blob.type || 'image/jpeg';
          base64 = await blobToBase64(blob);
          console.log("Download e conversão base64 do post bem-sucedidos!");
        } else {
          console.warn("Falha no download da imagem do post. Status HTTP:", fetchRes.status);
        }
      } catch (err) {
        console.error("Falha ao baixar imagem do post no service worker:", err);
      }
    }
    
    // 5. Fecha a aba temporária (pois a raspagem deu certo)
    await removeTabWithRetry(tabId);
    
    if (!base64) {
      throw new Error("Não foi possível fazer download da imagem extraída do post.");
    }
    
    return {
      success: true,
      logoDataUrl: `data:${contentType};base64,${base64}`
    };
    
  } catch (err) {
    console.error("Erro no fluxo do scraper de post:", err);
    // Tenta limpar a aba em caso de erro
    try {
      chrome.tabs.get(tabId, (currentTab) => {
        if (!chrome.runtime.lastError && currentTab) {
          removeTabWithRetry(tabId);
        }
      });
    } catch (_) {}
    
    return {
      success: false,
      error: err.message
    };
  }
}

function scrapePostPageLogic() {
  const isLogin = window.location.href.includes('accounts/login') || !!document.querySelector('input[name="username"]');
  if (isLogin) {
    return { success: false, isLoginRequired: true, error: "Login do Instagram necessário." };
  }
  
  // 1. Tenta pelas tags meta (OpenGraph)
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                  document.querySelector('meta[property="twitter:image"]')?.getAttribute('content');
  if (ogImage && ogImage.startsWith('http')) {
    return { success: true, imageUrl: ogImage };
  }
  
  // 2. Fallback para as tags img no DOM
  // Busca imagens que pareçam ser do post
  const imgs = Array.from(document.querySelectorAll('img'));
  const candidates = [];
  
  for (const img of imgs) {
    const src = img.src;
    if (!src || !src.startsWith('http')) continue;
    
    // Ignora fotos de perfil ou ícones comuns do Instagram
    const alt = (img.alt || '').toLowerCase();
    if (alt.includes('foto do perfil') || alt.includes('profile picture') || alt.includes('avatar')) {
      continue;
    }
    
    // Deve ser hospedado nos CDNs do Instagram/Facebook
    if (!src.includes('cdninstagram.com') && !src.includes('fbcdn.net')) {
      continue;
    }
    
    // Verifica dimensões
    const rect = img.getBoundingClientRect();
    const width = rect.width || img.naturalWidth || 0;
    const height = rect.height || img.naturalHeight || 0;
    
    // Se a imagem for muito pequena (ex: ícone de curtir ou foto de comentário), ignora
    if (width > 0 && width < 150) continue;
    
    // Prioriza imagens dentro de tags <article>
    const isInsideArticle = !!img.closest('article');
    
    candidates.push({
      src,
      isInsideArticle,
      area: width * height,
      width,
      height
    });
  }
  
  if (candidates.length > 0) {
    // Ordena de forma a priorizar imagens dentro de article e depois por área (tamanho)
    candidates.sort((a, b) => {
      if (a.isInsideArticle && !b.isInsideArticle) return -1;
      if (!a.isInsideArticle && b.isInsideArticle) return 1;
      return b.area - a.area;
    });
    
    return { success: true, imageUrl: candidates[0].src };
  }
  
  return { success: false, error: "Nenhuma imagem do post encontrada no DOM." };
}

async function handleMenuScrape(url, sender) {
  console.log("Iniciando raspagem de cardápio para:", url);
  
  const originalTabId = sender && sender.tab ? sender.tab.id : null;
  
  // 1. Cria a aba para carregar o cardápio
  const tab = await createTabWithRetry({ url: url, active: false });
  const tabId = tab.id;
  

  
  try {
    // 2. Aguarda o carregamento completo da aba usando listeners (muito mais estável)
    await new Promise((resolve, reject) => {
      // Verifica o status inicial
      chrome.tabs.get(tabId, (currentTab) => {
        if (chrome.runtime.lastError || !currentTab) {
          reject(new Error("A aba do cardápio foi fechada ou não pôde ser lida."));
          return;
        }
        if (currentTab.status === 'complete') {
          resolve();
          return;
        }
        
        // Configura o listener de atualização
        const listener = (changeTabId, changeInfo) => {
          if (changeTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        
        // Timeout de segurança de 15 segundos para prosseguir mesmo se travar o carregamento de imagens/assets lentos
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(); // Resolve para tentar raspar o que já carregou
        }, 15000);
      });
    });

    // Aguarda a renderização dos pratos na página (Vite/React/Vue mount)
    console.log("[Extension] Aguardando renderização do cardápio...");
    await waitForMenuToLoad(tabId);

    // Verificação de Anota AI para extração estruturada direta pela API
    const isAnotaAi = await detectAnotaAiInTab(tabId);
    if (isAnotaAi) {
      console.log("[Extension] Anota AI detectado! Tentando extrair diretamente da API...");
      const slug = await getSlugFromTab(tabId);
      if (slug) {
        try {
          const apiRes = await fetch(`https://api.anota.ai/v1/menu/merchant?slug=${slug}`);
          if (apiRes.ok) {
            const json = await apiRes.json();
            const parsedMenu = parseAnotaAiMenu(json);
            if (parsedMenu && parsedMenu.length > 0) {
              console.log("[Extension] Sucesso ao extrair cardápio da API Anota AI!");
              await removeTabWithRetry(tabId);
              return {
                success: true,
                isAnotaAi: true,
                parsedMenu: parsedMenu
              };
            }
          } else {
            console.warn("[Extension] Falha ao chamar API do Anota AI, status:", apiRes.status);
          }
        } catch (apiErr) {
          console.error("[Extension] Erro ao consumir API do Anota AI:", apiErr);
        }
      }
    }

    // Verificação de Cardápio Web para extração estruturada direta pela API
    const isCardapioWeb = await detectCardapioWebInTab(tabId);
    if (isCardapioWeb) {
      console.log("[Extension] Cardápio Web detectado! Tentando extrair diretamente da API...");
      const details = await getCardapioWebDetailsFromTab(tabId);
      if (details && details.companySlug && details.companyId) {
        try {
          const sessionid = "session_" + Math.random().toString(36).substring(2, 11);
          const apiRes = await fetch(
            `https://integracao.cardapioweb.com/api/menu/company/categories?only_available_for=delivery&origin=catalogo`,
            {
              headers: {
                'company': details.companySlug,
                'company-id': String(details.companyId),
                'sessionid': sessionid
              }
            }
          );
          if (apiRes.ok) {
            const json = await apiRes.json();
            const parsedMenu = parseCardapioWebMenu(json);
            if (parsedMenu && parsedMenu.length > 0) {
              console.log("[Extension] Sucesso ao extrair cardápio da API Cardápio Web!");
              await removeTabWithRetry(tabId);
              return {
                success: true,
                isCardapioWeb: true,
                parsedMenu: parsedMenu
              };
            }
          } else {
            console.warn("[Extension] Falha ao chamar API do Cardápio Web, status:", apiRes.status);
          }
        } catch (apiErr) {
          console.error("[Extension] Erro ao consumir API do Cardápio Web:", apiErr);
        }
      }
    }

    // 3. Executa a lógica de scroll e expansão na página do cardápio
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: expandAndLoadAllContentInPage
      });
    } catch (err) {
      console.warn("Falha ao expandir conteúdo do cardápio:", err.message);
    }

    // Espera mais 1.5s após a expansão para garantir rendering final e imagens
    await new Promise(r => setTimeout(r, 1500));

    // 4. Extrai o HTML limpo/XML para a IA
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: getCleanedHtmlForAIInPage
    });

    if (!results || !results[0] || !results[0].result) {
      throw new Error("Não foi possível extrair o conteúdo do cardápio.");
    }

    const xmlContent = results[0].result;

    // 5. Fecha a aba temporária
    await removeTabWithRetry(tabId);

    return {
      success: true,
      xmlContent: xmlContent
    };

  } catch (err) {
    console.error("Erro no fluxo do scraper de cardápio:", err);
    // Tenta limpar a aba em caso de erro
    try {
      chrome.tabs.get(tabId, (currentTab) => {
        if (!chrome.runtime.lastError && currentTab) {
          removeTabWithRetry(tabId);
        }
      });
    } catch (_) {}
    
    return {
      success: false,
      error: err.message
    };
  }
}

async function expandAndLoadAllContentInPage() {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  // 1. Rola a página progressivamente
  await new Promise((resolve) => {
    let totalHeight = 0;
    const distance = 400;
    const timer = setInterval(() => {
      const scrollHeight = document.body.scrollHeight;
      window.scrollBy(0, distance);
      totalHeight += distance;
      
      if (totalHeight >= scrollHeight || totalHeight > 10000) {
        clearInterval(timer);
        resolve();
      }
    }, 200);
  });
  await delay(800);
  
  // 2. Clica em botões de "Carregar mais"
  let clickedMore = true;
  let clickLimit = 5;
  while (clickedMore && clickLimit > 0) {
    clickedMore = (() => {
      const buttons = Array.from(document.querySelectorAll('button, a, span, div[role="button"]'));
      const loadMoreBtn = buttons.find(b => {
        const text = b.textContent.trim().toLowerCase();
        return (
          (text.includes('carregar') && text.includes('mais')) ||
          (text.includes('ver') && text.includes('mais')) ||
          (text.includes('mostrar') && text.includes('mais')) ||
          (text.includes('load') && text.includes('more')) ||
          (text.includes('show') && text.includes('more')) ||
          text === 'ver mais' ||
          text === 'carregar mais' ||
          text === 'mostrar mais'
        );
      });
      
      if (loadMoreBtn && typeof loadMoreBtn.click === 'function') {
        loadMoreBtn.click();
        return true;
      }
      return false;
    })();
    
    if (clickedMore) {
      await delay(1500);
      clickLimit--;
      window.scrollTo(0, document.body.scrollHeight);
    }
  }

  // 3. Expande acordeões/abas colapsadas
  const accordionCount = (() => {
    document.querySelectorAll('[data-scraper-accordion]').forEach(el => {
      el.removeAttribute('data-scraper-accordion');
    });

    const headers = Array.from(document.querySelectorAll([
      '[class*="header"]', '[class*="heading"]', '[class*="toggle"]', '[class*="trigger"]',
      '.panel-title', '[id*="heading"]', '[id*="toggle"]', '[aria-expanded]',
      'h3', 'h4', 'h2', '.category-card'
    ].join(', ')));
    
    let count = 0;
    headers.forEach(header => {
      if (header.closest('footer') || header.closest('header') || header.closest('nav')) return;

      const ariaExpanded = header.getAttribute('aria-expanded');
      let isCollapsed = false;
      
      if (ariaExpanded === 'false') {
        isCollapsed = true;
      } else if (ariaExpanded === 'true') {
        return;
      } else {
        const parent = header.parentElement;
        if (!parent) return;
        
        const siblings = Array.from(parent.children);
        const headerIdx = siblings.indexOf(header);
        const nextSibling = headerIdx !== -1 ? siblings[headerIdx + 1] : null;
        
        if (nextSibling) {
          const style = window.getComputedStyle(nextSibling);
          const isHidden = style.display === 'none' || style.visibility === 'hidden' || parseInt(style.height || '0') === 0;
          const classNameStr = String(nextSibling.className || '');
          const hasCollapseClass = classNameStr.includes('collapse') || classNameStr.includes('content') || classNameStr.includes('body');
            
          if (isHidden || (hasCollapseClass && nextSibling.clientHeight === 0)) {
            isCollapsed = true;
          }
        }
        
      
      if (isCollapsed) {
        const target = header.querySelector('button, a, span') || header;
        if (typeof target.click === 'function') {
          target.setAttribute('data-scraper-accordion', String(count));
          count++;
        }
      }
    });
    
    return count;
  })();
  
  if (accordionCount > 0) {
    for (let i = 0; i < accordionCount; i++) {
      try {
        const el = document.querySelector(`[data-scraper-accordion="${i}"]`);
        if (el) {
          el.click();
        }
        await delay(500);
      } catch (clickErr) {
        console.warn("Erro ao clicar no acordeão:", clickErr);
      }
    }
    
    // Rola novamente
    window.scrollTo(0, 0);
    await delay(300);
    window.scrollTo(0, document.body.scrollHeight / 2);
    await delay(300);
    window.scrollTo(0, document.body.scrollHeight);
    await delay(500);
  }

  // 4. Clika em itens individuais (produtos) para abrir modais de opções (ex: Saipos) e extrair os adicionais
  try {
    const clickables = Array.from(document.querySelectorAll('article, .product-card, [class*="product-item"], [class*="ItemCard"], li')).filter(el => {
      // Ignora elementos que são claramente links externos ou de navegação
      if (el.tagName === 'A' && el.href && !el.href.includes('#') && !el.href.startsWith('javascript')) return false;
      const a = el.querySelector('a');
      if (a && a.href && !a.href.includes('#') && !a.href.startsWith('javascript')) return false;
      
      // Somente elementos com tamanho razoável (ignora mini-botões)
      if (el.clientHeight < 40) return false;
      
      // Evita o cabeçalho/menu principal
      if (el.closest('header') || el.closest('nav') || el.closest('footer')) return false;
      
      return true;
    });

    let clickedCount = 0;
    for (let i = 0; i < clickables.length; i++) {
      if (clickedCount >= 60) break; // Limite para não travar a extensão
      
      const el = clickables[i];
      const btn = el.querySelector('button') || el;
      
      try { 
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        btn.click(); 
      } catch(e) {}
      
      const delayPromise = new Promise(resolve => setTimeout(resolve, 500));
      await delayPromise; // aguarda modal ou expansão abrir
      
      // Procura por modal visível
      const modals = Array.from(document.querySelectorAll('[role="dialog"], .modal, .dialog, [class*="modal"], [class*="Dialog"], [class*="Drawer"]')).filter(m => m.offsetParent !== null);
      
      if (modals.length > 0) {
        const modal = modals[modals.length - 1]; // Pega o modal mais no topo
        const modalText = modal.innerText || '';
        
        // Injeta o texto do modal dentro do elemento original (escondido) para ser capturado depois
        if (modalText && modalText.length > 20) {
          const hiddenDiv = document.createElement('div');
          hiddenDiv.style.display = 'none';
          hiddenDiv.className = 'scraper-extracted-modal-text';
          hiddenDiv.innerText = '\\n[OPÇÕES DA IA: ' + modalText.replace(/\\n/g, ' ') + ']\\n';
          el.appendChild(hiddenDiv);
        }
        
        // Fecha o modal
        const closeBtn = modal.querySelector('button[aria-label*="close"], button[aria-label*="Fechar"], .close, [class*="close"], [class*="CloseButton"]');
        if (closeBtn) {
          try { closeBtn.click(); } catch(e) {}
        } else {
          // Tenta ESCAPE
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
          document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', keyCode: 27, bubbles: true }));
          
          // Fallback brutal: clica fora do modal
          const overlay = document.querySelector('.overlay, [class*="overlay"], [class*="backdrop"]');
          if (overlay) try { overlay.click(); } catch(e) {}
        }
        clickedCount++;
        const closePromise = new Promise(resolve => setTimeout(resolve, 300));
        await closePromise; // Aguarda fechar
      }
    }
  } catch(e) {
    console.warn("Erro ao tentar extrair modais de produtos:", e);
  }
}

function getCleanedHtmlForAIInPage() {
  function getAbsoluteUrl(url) {
    if (!url) return '';
    try {
      return new URL(url, window.location.href).href;
    } catch (e) {
      return url;
    }
  }
  
  const imgs = document.querySelectorAll('img');
  imgs.forEach(img => {
    const lazyAttrs = ['data-src', 'data-lazy-src', 'data-lazy', 'lazy-src', 'data-original', 'data-srcset'];
    for (const attrName of lazyAttrs) {
      const val = img.getAttribute(attrName);
      if (val && val.trim()) {
        img.setAttribute('src', getAbsoluteUrl(val.trim()));
        break;
      }
    }
    const currentSrc = img.getAttribute('src');
    if (currentSrc) {
      img.setAttribute('src', getAbsoluteUrl(currentSrc));
    }
  });

  const priceRegex = /(?:R\$\s*)?\d+[\.,]\d{2}/i;
  const allElements = Array.from(document.querySelectorAll('*'));
  
  const candidates = [];
  allElements.forEach(el => {
    const tagName = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'header', 'footer', 'nav'].includes(tagName)) return;
    
    const text = el.textContent || '';
    if (!priceRegex.test(text)) return;
    
    let isItemPattern = false;
    const className = el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '';
    
    if (tagName === 'li' || tagName === 'article') {
      isItemPattern = true;
    } else if (
      className.includes('product') ||
      className.includes('item') ||
      className.includes('card') ||
      className.includes('dish') ||
      className.includes('prato') ||
      className.includes('menu-') ||
      className.includes('opcao') ||
      className.includes('prato-') ||
      className.includes('col-') ||
      className.includes('row')
    ) {
      isItemPattern = true;
    }
    
    if (isItemPattern) {
      candidates.push(el);
    }
  });
  
  const allPriceEls = [];
  allElements.forEach(el => {
    const tagName = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'header', 'footer', 'nav'].includes(tagName)) return;
    
    let hasDirectPrice = false;
    for (let node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && priceRegex.test(node.textContent)) {
        hasDirectPrice = true;
        break;
      }
    }
    if (hasDirectPrice) {
      allPriceEls.push(el);
    }
  });
  
  allPriceEls.forEach(priceEl => {
    const insideCandidate = candidates.some(c => c.contains(priceEl));
    if (!insideCandidate) {
      let current = priceEl;
      for (let i = 0; i < 3; i++) {
        if (!current.parentElement || ['BODY', 'HTML'].includes(current.parentElement.tagName)) {
          break;
        }
        current = current.parentElement;
      }
      if (!candidates.includes(current)) {
        candidates.push(current);
      }
    }
  });
  
  let finalContainers = [];
  candidates.forEach(c => {
    const leafDescendants = candidates.filter(other => other !== c && c.contains(other) && !candidates.some(third => third !== other && other.contains(third)));
    if (leafDescendants.length > 1) {
    } else {
      finalContainers.push(c);
    }
  });
  
  finalContainers = finalContainers.filter(c => {
    const isDescendantOfAnother = finalContainers.some(other => other !== c && other.contains(c));
    return !isDescendantOfAnother;
  });
  
  const categoryElements = [];
  allElements.forEach(el => {
    const tagName = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'header', 'footer', 'nav'].includes(tagName)) return;
    
    const text = (el.textContent || '').trim();
    if (text.length < 2 || text.length > 80) return;
    if (priceRegex.test(text)) return;
    
    const insideItem = finalContainers.some(c => c.contains(el));
    if (insideItem) return;
    
    let isCategory = false;
    const className = el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '';
    
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      isCategory = true;
    } else if (
      className.includes('category-title') ||
      className.includes('category-name') ||
      className.includes('titulo-categoria') ||
      className.includes('categoria-titulo') ||
      className.includes('menu-category-title') ||
      className.includes('menu-section-title') ||
      className.includes('category-header')
    ) {
      isCategory = true;
    }
    
    if (isCategory) {
      categoryElements.push(el);
    }
  });
  
  const allNodes = [...finalContainers, ...categoryElements];
  allNodes.sort((a, b) => {
    if (a === b) return 0;
    const position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });
  
  let xml = '<menu>\n';
  allNodes.forEach(node => {
    if (categoryElements.includes(node)) {
      const catName = node.textContent.replace(/\s+/g, ' ').trim();
      xml += `  <category name="${catName}" />\n`;
    } else {
      let imgUrl = '';
      const imgEl = node.querySelector('img');
      if (imgEl) {
        const lazyAttrs = ['src', 'data-src', 'data-lazy-src', 'data-lazy', 'lazy-src', 'data-original', 'data-srcset'];
        for (const attr of lazyAttrs) {
          const val = imgEl.getAttribute(attr);
          if (val && val.trim() && (val.startsWith('http') || val.startsWith('/') || val.startsWith('.'))) {
            imgUrl = getAbsoluteUrl(val.trim());
            break;
          }
        }
      }
      
      // Fallback para background-image se não encontrou img ou o src do img está vazio
      if (!imgUrl) {
        const bgEls = [node, ...Array.from(node.querySelectorAll('*'))];
        for (const el of bgEls) {
          const style = el.getAttribute('style') || '';
          if (style.includes('background-image')) {
            const match = style.match(/url\(['"]?(https?:\/\/[^'"]+)['"]?\)/i) || style.match(/url\(['"]?([^'"]+)['"]?\)/i);
            if (match && match[1]) {
              imgUrl = getAbsoluteUrl(match[1]);
              break;
            }
          }
          try {
            const compStyle = window.getComputedStyle(el);
            const bgImg = compStyle.backgroundImage;
            if (bgImg && bgImg !== 'none') {
              const match = bgImg.match(/url\(['"]?(https?:\/\/[^'"]+)['"]?\)/i) || bgImg.match(/url\(['"]?([^'"]+)['"]?\)/i);
              if (match && match[1]) {
                imgUrl = getAbsoluteUrl(match[1]);
                break;
              }
            }
          } catch (_) {}
        }
      }
      
      const itemText = node.textContent.replace(/\s+/g, ' ').trim();
      xml += `  <item>\n`;
      xml += `    <text>${itemText}</text>\n`;
      if (imgUrl) {
        xml += `    <image>${imgUrl}</image>\n`;
      }
      xml += `  </item>\n`;
    }
  });
  xml += '</menu>';
  
  return xml;
}

// Funções auxiliares para detecção e raspagem do Anota AI
async function waitForMenuToLoad(tabId) {
  const maxAttempts = 30; // 15 segundos max (500ms * 30)
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          const hasPrice = document.body.textContent.includes('R$') || document.body.textContent.includes('$');
          const hasCards = document.querySelectorAll('button, a, div[class*="item"], div[class*="card"], div[class*="product"]').length > 10;
          const loader = document.getElementById('initial-splash-screen-loader') || document.querySelector('[class*="loader"]');
          const isLoaderHidden = !loader || window.getComputedStyle(loader).display === 'none' || window.getComputedStyle(loader).opacity === '0';
          return hasPrice && hasCards && isLoaderHidden;
        }
      });
      if (results && results[0] && results[0].result) {
        return true;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function detectAnotaAiInTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        const hasAnotaScript = !!document.querySelector('script[src*="anota.ai"]');
        const hasAnotaLink = !!document.querySelector('link[href*="anota.ai"]');
        const isAnotaHost = window.location.hostname.includes('anota.ai');
        const hasAnotaDiv = !!document.querySelector('#anota-app') || !!document.querySelector('.anota-app') || !!document.querySelector('[id*="anota"]') || !!document.querySelector('[class*="anota"]');
        return hasAnotaScript || hasAnotaLink || isAnotaHost || hasAnotaDiv;
      }
    });
    return !!(results && results[0] && results[0].result);
  } catch (e) {
    return false;
  }
}

async function detectCardapioWebInTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        const hasCwScript = !!document.querySelector('script[src*="cardapioweb"]') || !!document.querySelector('script[src*="cardapio-web"]');
        const hasCwLink = !!document.querySelector('link[href*="cardapioweb"]') || !!document.querySelector('link[href*="cardapio-web"]');
        const isCwHost = window.location.hostname.includes('cardapioweb');
        const hasCwWindow = !!window.webpackJsonpcardapio_web_menu || !!window.webpackJsonpcardapio_web_menu_aux || !!window.webpackJsonpcardapio_web || !!Object.keys(window).find(k => k.includes('cardapio-web') || k.includes('cardapioweb'));
        const hasCwStorage = localStorage.getItem('@cardapio-web-menu/session_id') !== null || !!Object.keys(localStorage).find(k => k.includes('cardapio-web') || k.includes('cardapioweb') || k.startsWith('cw.'));
        return hasCwScript || hasCwLink || isCwHost || hasCwWindow || hasCwStorage;
      }
    });
    return !!(results && results[0] && results[0].result);
  } catch (e) {
    return false;
  }
}

async function getCardapioWebDetailsFromTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        return {
          companySlug: window.companySlug || window.location.pathname.split('/').filter(Boolean).pop() || '',
          companyId: window.companyId || ''
        };
      }
    });
    return results && results[0] ? results[0].result : null;
  } catch (e) {
    return null;
  }
}

async function getSlugFromTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        return window.companySlug || window.location.pathname.split('/').filter(Boolean).pop() || '';
      }
    });
    return results && results[0] ? results[0].result : '';
  } catch (e) {
    return '';
  }
}

function parseAnotaAiMenu(json) {
  let menu = json;
  if (json.data && json.data.menu) {
    menu = json.data.menu;
  }
  
  if (!menu || (!menu.menu && !menu.menu_aux)) {
    return null;
  }

  const categories = [];
  const menuAuxMap = new Map();
  
  if (Array.isArray(menu.menu_aux)) {
    menu.menu_aux.forEach(cat => {
      if (cat.category_id) {
        menuAuxMap.set(cat.category_id, cat);
      }
    });
  }
  
  const borderItemsMap = new Map();
  
  function formatAnotaImage(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `https://client-assets.anota.ai/${imagePath}`;
  }
  
  if (Array.isArray(menu.menu)) {
    menu.menu.forEach(cat => {
      const catName = cat.title || 'Geral';
      const items = [];
      
      if (Array.isArray(cat.itens)) {
        cat.itens.forEach(item => {
          const itemName = item.title || '';
          const itemPrice = item.price || item.minimal_price || 0;
          const itemDesc = item.description || '';
          const itemImage = formatAnotaImage(item.image || '');
          
          let flavorCategory = null;
          let borderCategories = [];
          
          if (Array.isArray(item.next_steps)) {
            item.next_steps.forEach(step => {
              const auxCat = menuAuxMap.get(step.category);
              if (auxCat) {
                const auxTitle = (auxCat.title || '').toLowerCase();
                if (auxTitle.includes('sabor') || auxTitle.includes('sabores')) {
                  flavorCategory = auxCat;
                } else if (auxTitle.includes('borda') || auxTitle.includes('massa') || auxTitle.includes('adicional')) {
                  borderCategories.push(auxCat);
                }
              }
            });
          }
          
          const optionsList = [];
          
          if (flavorCategory && Array.isArray(flavorCategory.itens) && flavorCategory.itens.length > 0) {
            optionsList.push({
              title: flavorCategory.title || "Escolha o Sabor",
              itens: flavorCategory.itens.map(fi => ({
                name: fi.title || '',
                price: fi.price || 0
              }))
            });
          }
          
          borderCategories.forEach(bc => {
            if (Array.isArray(bc.itens) && bc.itens.length > 0) {
              optionsList.push({
                title: bc.title || "Opcionais",
                itens: bc.itens.map(bi => ({
                  name: bi.title || '',
                  price: bi.price || 0
                }))
              });
            }
          });
          
          let finalDesc = itemDesc;
          if (optionsList.length > 0) {
            finalDesc = JSON.stringify({
              description: itemDesc,
              options: optionsList
            });
          }
          
          items.push({
            name: itemName,
            price: itemPrice,
            description: finalDesc,
            image_url: itemImage
          });
          
          borderCategories.forEach(bc => {
            if (Array.isArray(bc.itens)) {
              bc.itens.forEach(bi => {
                if (bi.price > 0) {
                  const key = `${bi.title}-${bi.price}`;
                  borderItemsMap.set(key, {
                    name: `Adicional: ${bi.title}`,
                    price: bi.price,
                    description: bi.description || '',
                    image_url: formatAnotaImage(bi.image || '')
                  });
                }
              });
            }
          });
        });
      }
      
      if (items.length > 0) {
        categories.push({
          name: catName,
          items: items
        });
      }
    });
  }
  
  if (borderItemsMap.size > 0) {
    categories.push({
      name: "Adicionais / Bordas",
      items: Array.from(borderItemsMap.values())
    });
  }
  
  return categories;
}

function parseCardapioWebMenu(json) {
  if (!Array.isArray(json)) return null;
  
  const categories = [];
  const borderItemsMap = new Map();
  
  json.forEach(cat => {
    if (cat.status !== 'ACTIVE') return;
    
    const catName = cat.name || 'Geral';
    const items = [];
    
    if (Array.isArray(cat.items)) {
      cat.items.forEach(item => {
        if (item.status !== 'ACTIVE') return;
        
        const itemName = item.name || '';
        const itemDesc = item.description || '';
        
        // Calcular preço
        let itemPrice = item.price || 0;
        if (item.promotional_price_active && typeof item.promotional_price === 'number') {
          itemPrice = item.promotional_price;
        }
        
        // URL da imagem
        const itemImage = item.image_url || item.thumbnail_url || '';
        
        // Adicionais / Opcionais
        const optionsList = [];
        if (Array.isArray(item.add_ons)) {
          item.add_ons.forEach(addOn => {
            if (addOn.status === 'ACTIVE' && Array.isArray(addOn.subitems) && addOn.subitems.length > 0) {
              optionsList.push({
                title: addOn.name || 'Opcionais',
                itens: addOn.subitems
                  .filter(sub => sub.status === 'ACTIVE')
                  .map(sub => ({
                    name: sub.name || '',
                    price: sub.price || 0
                  }))
              });
            }
          });
        }
        
        let finalDesc = itemDesc;
        if (optionsList.length > 0) {
          finalDesc = JSON.stringify({
            description: itemDesc,
            options: optionsList
          });
        }
        
        items.push({
          name: itemName,
          price: itemPrice,
          description: finalDesc,
          image_url: itemImage
        });
        
        // Coletar adicionais globalmente
        if (Array.isArray(item.add_ons)) {
          item.add_ons.forEach(addOn => {
            if (addOn.status === 'ACTIVE' && Array.isArray(addOn.subitems)) {
              addOn.subitems.forEach(sub => {
                if (sub.status === 'ACTIVE' && sub.price > 0) {
                  const key = `${sub.name}-${sub.price}`;
                  borderItemsMap.set(key, {
                    name: `Adicional: ${sub.name}`,
                    price: sub.price,
                    description: sub.description || '',
                    image_url: sub.image_url || sub.thumbnail_url || ''
                  });
                }
              });
            }
          });
        }
      });
    }
    
    if (items.length > 0) {
      categories.push({
        name: catName,
        items: items
      });
    }
  });
  
  if (borderItemsMap.size > 0) {
    categories.push({
      name: "Adicionais / Bordas",
      items: Array.from(borderItemsMap.values())
    });
  }
  
  return categories;
}

async function handleWebContextScrape(url) {
  console.log("Iniciando raspagem de contexto web para:", url);
  // O Google Maps precisa estar ativo (active: true) para renderizar o DOM corretamente
  const tab = await createTabWithRetry({ url: url, active: false });
  const tabId = tab.id;
  
  try {
    await new Promise((resolve, reject) => {
      let tries = 0;
      let completeCount = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba foi fechada prematuramente."));
            return;
          }
          if (currentTab.status === 'complete') {
            completeCount++;
            if (completeCount > 6) { // Aguarda cerca de 3 segundos extras após 'complete'
              resolve();
            } else {
              setTimeout(checkStatus, 500);
            }
          } else {
            completeCount = 0; // reseta se não estiver mais complete
            setTimeout(checkStatus, 1000);
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        return new Promise((resolve) => {
          // Scroll page to ensure lazy-loaded elements are mounted
          window.scrollBy(0, 500);
          
          try {
            // Método super confiável para horários do Google Maps
            const hoursContainer = document.querySelector('[data-item-id="oh"]');
            if (hoursContainer) {
              const expandBtn = hoursContainer.querySelector('[aria-expanded="false"]');
              if (expandBtn) expandBtn.click();
              // Fallback: clica na própria linha de horários
              try { hoursContainer.click(); } catch(e) {}
              const innerButtons = hoursContainer.querySelectorAll('button, div[role="button"]');
              innerButtons.forEach(b => { try { b.click(); } catch(e) {} });
            }

            // Fallback genérico para outros botões importantes
            const els = Array.from(document.querySelectorAll('*'));
            els.forEach(b => {
              const clickEl = (el) => {
                try { el.click(); } catch(e) {}
                try { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch(e) {}
                try { el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch(e) {}
                try { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
              };

              if (b.innerText && (b.innerText.toLowerCase() === 'mais' || b.innerText.toLowerCase() === 'more')) clickEl(b);
              if (b.getAttribute('aria-expanded') === 'false' && (b.innerText && (b.innerText.includes('Abre') || b.innerText.includes('Fechado') || b.innerText.includes('horário')))) clickEl(b);
              
              const ariaLabel = b.getAttribute('aria-label') || '';
              const lowerLabel = ariaLabel.toLowerCase();
              if (lowerLabel && (lowerLabel.includes('horário') || lowerLabel.includes('horario') || lowerLabel.includes('hours') || lowerLabel.includes('abre às') || lowerLabel.includes('fechado'))) {
                clickEl(b);
              }
            });
          } catch(e) {}

          setTimeout(() => {
            let metaDesc = '';
            try {
              const meta = document.querySelector('meta[property="og:description"]');
              if (meta) metaDesc = meta.content;
            } catch(e) {}

            let tablesText = '';
            try {
              const tables = document.querySelectorAll('table');
              tables.forEach(t => {
                tablesText += "\nTABLE: " + t.textContent;
              });
            } catch(e) {}
            
            resolve(document.body.innerText + "\n\nMETA DESCRIPTION:\n" + metaDesc + "\n\nHIDDEN TABLES:\n" + tablesText);
          }, 1500); // Aguarda a tabela renderizar após o clique
        });
      }
    });

    if (results && results[0] && results[0].result) {
      return { success: true, text: results[0].result };
    } else {
      return { success: false, error: "Nenhum texto extraído." };
    }
  } catch (err) {
    console.error("Erro na raspagem de contexto:", err);
    return { success: false, error: err.message };
  } finally {
    try {
      await removeTabWithRetry(tabId);
    } catch(e) {}
  }
}

// --- INTERACTIVE WEB AGENT FUNCTIONS ---

let activeAgentTabId = null;

async function handleAgentSnapshot(url) {
  if (!activeAgentTabId && url) {
    const tab = await createTabWithRetry({ url: url, active: false });
    activeAgentTabId = tab.id;
    await new Promise((resolve) => {
      let completeCount = 0;
      const checkStatus = () => {
        chrome.tabs.get(activeAgentTabId, (currentTab) => {
          if (chrome.runtime.lastError) return;
          if (currentTab.status === 'complete') {
            completeCount++;
            if (completeCount > 4) { resolve(); }
            else { setTimeout(checkStatus, 500); }
          } else {
            completeCount = 0;
            setTimeout(checkStatus, 500);
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });
  }

  if (!activeAgentTabId) return { success: false, error: "Nenhuma aba ativa para snapshot." };

  const results = await chrome.scripting.executeScript({
    target: { tabId: activeAgentTabId },
    func: () => {
      window.scrollBy(0, 500);

      // NOVO: Pre-emptive click para expandir horários como na Fase 1
      try {
          const expandBtns = document.querySelectorAll('div[role="button"][jsaction*="pane.openhours"], div.o0Svhf');
          expandBtns.forEach(btn => {
              try { btn.click(); } catch(e) {}
              try { btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch(e) {}
              try { btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch(e) {}
              try { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
          });
      } catch(e) {}

      return new Promise((resolve) => {
        setTimeout(() => {
          let idCounter = 1;
          const interactables = document.querySelectorAll('button, a, [role="button"], input, select, [aria-expanded], [data-item-id="oh"], [data-item-id="oh"] div, div[aria-label], span[aria-label], div.o0Svhf, div[jsaction*="pane.openhours"]');
          interactables.forEach(el => {
             const rect = el.getBoundingClientRect();
             if (rect.width > 0 && rect.height > 0) {
               el.setAttribute('data-ai-id', idCounter.toString());
               idCounter++;
             }
          });
          
          const elementsData = [];
          document.querySelectorAll('[data-ai-id]').forEach(el => {
             const id = el.getAttribute('data-ai-id');
             const text = el.innerText ? el.innerText.trim().substring(0, 100) : el.getAttribute('aria-label') || '';
             if (text) {
                elementsData.push(`[ID: ${id}] ${text.replace(/\n/g, ' ')}`);
             }
          });
          
          const hiddenTables = Array.from(document.querySelectorAll('table, .o0Svhf')).map(t => t.textContent.trim().replace(/\n/g, ' ')).join('\n---\n');
          const bodyText = document.body.innerText;
          const resultText = `PÁGINA TEXTO:\n${bodyText.substring(0, 8000)}\n\nHIDDEN TABLES (IMPORTANT: Check here for opening hours):\n${hiddenTables}\n\nELEMENTOS INTERATIVOS:\n${elementsData.join('\n')}`;
          
          resolve(resultText);
        }, 1500);
      });
    }
  });
  
  return { success: true, text: results[0].result };
}

async function handleClickAgentElement(targetId) {
  if (!activeAgentTabId) throw new Error("Nenhuma aba ativa para clicar.");
  
  await chrome.scripting.executeScript({
    target: { tabId: activeAgentTabId },
    func: (id) => {
       const el = document.querySelector(`[data-ai-id="${id}"]`);
       
       // ESTRATÉGIA DEFINITIVA: Clicar no novo seletor que o usuário encontrou (span com aria-label) e jsaction
       const newArrow = document.querySelector('div[role="button"][jsaction*="pane.openhours"], span[aria-label*="Mostrar horário"], span[aria-label*="Mostrar horários"], div.o0Svhf');
       if (newArrow) {
          try { newArrow.click(); } catch(e) {}
          try { newArrow.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch(e) {}
          try { newArrow.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch(e) {}
          try { newArrow.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
       }
       
       if (el) {
          // Estratégia inspirada na Fase 1 (Robô Antigo Funcional)
          const ohContainer = el.closest('[data-item-id="oh"]') || el.closest('.o0Svhf');
          if (ohContainer) {
              const expandBtn = ohContainer.querySelector('[aria-expanded="false"], span[role="img"]');
              if (expandBtn) {
                 try { expandBtn.click(); } catch(e) {}
                 try { expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
              }
              try { ohContainer.click(); } catch(e) {}
              const innerButtons = ohContainer.querySelectorAll('button, div[role="button"], span[role="img"]');
              innerButtons.forEach(b => { try { b.click(); } catch(e) {} });
          } else {
              // Fallback para elementos fora dos horários
              let curr = el;
              let depth = 0;
              while (curr && depth < 5) {
                 try { curr.click(); } catch(e) {}
                 try { curr.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch(e) {}
                 try { curr.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch(e) {}
                 try { curr.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
                 curr = curr.parentElement;
                 depth++;
              }
          }
       }
    },
    args: [targetId]
  });
  
  await new Promise(r => setTimeout(r, 2500));
  return { success: true };
}

async function handleAgentClose() {
  if (activeAgentTabId) {
    try { await removeTabWithRetry(activeAgentTabId); } catch(e) {}
    activeAgentTabId = null;
  }
  return { success: true };
}

// ============================================================================
// NOVO FLUXO: Extração de Horários via Google Maps (Aba Física)
// ============================================================================
async function handleGoogleHoursScrape(query, mapUrl) {
  console.log("Iniciando busca de horários no Google Maps para:", query, mapUrl);
  
  // Se tivermos a URL direta do Maps, usamos ela. Caso contrário, usamos a busca de locais do Maps
  const searchUrl = mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  
  // Cria aba ativa para garantir que os scripts de interação do Google rodem
  const tab = await createTabWithRetry({ url: searchUrl, active: false });
  const tabId = tab.id;
  
  try {
    // Aguarda a aba carregar completamente
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba do Google Maps foi fechada."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 60) {
              reject(new Error("Tempo limite ao carregar o Google Maps (30s)."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    // Aguarda mais 3 segundos para garantir a renderização inicial do painel lateral
    await new Promise(resolve => setTimeout(resolve, 3000));

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async () => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        
        // 1. Rola o painel lateral para trazer os detalhes para o viewport se necessário
        const panel = document.querySelector('div[role="main"]') || document.querySelector('.m6ZQ1b') || document.querySelector('.DxyBCb');
        if (panel) panel.scrollTop = 500;
        await sleep(800);

        // 2. Tenta expandir a tabela de horários
        const isAlreadyExpanded = (() => {
          const tbl = document.querySelector('table.e25n6b') || document.querySelector('table[class*="hours"]');
          if (!tbl) return false;
          return tbl.querySelectorAll('tr').length > 2;
        })();

        if (!isAlreadyExpanded) {
          // Encontra o botão de expandir horários no Google Maps
          const ohElement = document.querySelector('*[data-item-id="oh"]') || 
                            document.querySelector('*[data-item-id^="oh"]');
          
          let expandBtn = null;
          if (ohElement) {
            expandBtn = ohElement.querySelector('[aria-expanded="false"]') || ohElement;
          } else {
            expandBtn = Array.from(document.querySelectorAll('*')).find(el => {
              const label = el.getAttribute('aria-label') || '';
              return label.toLowerCase().includes('horário de funcionamento da semana') ||
                     label.toLowerCase().includes('mostrar horário') ||
                     label.toLowerCase().includes('ocultar horário') ||
                     (el.textContent.trim() === '' && el.className.includes('OazX1c'));
            });
          }

          if (expandBtn) {
            try { expandBtn.click(); } catch(e) {}
            try {
              expandBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              expandBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            } catch(e) {}
            await sleep(1500); // Aguarda animação de dropdown
          }
        }

        // 3. Extrai a tabela de horários
        const findHoursTable = () => {
          const tables = Array.from(document.querySelectorAll('table'));
          const dayMappingKeys = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'sabado', 'domingo', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          for (const tbl of tables) {
            const text = tbl.textContent.toLowerCase();
            const hasDay = dayMappingKeys.some(day => text.includes(day));
            if (hasDay) return tbl;
          }
          return null;
        };

        const hoursTable = findHoursTable();
        const schedule = {};
        const dayMap = {
          'segunda': 'monday', 'terça': 'tuesday', 'quarta': 'wednesday', 'quinta': 'thursday',
          'sexta': 'friday', 'sábado': 'saturday', 'sabado': 'saturday', 'domingo': 'sunday',
          'monday': 'monday', 'tuesday': 'tuesday', 'wednesday': 'wednesday', 'thursday': 'thursday',
          'friday': 'friday', 'saturday': 'saturday', 'sunday': 'sunday'
        };

        // Inicializa dias
        Object.values(dayMap).forEach(d => {
          schedule[d] = { isOpen: false, slots: [] };
        });

        let foundAny = false;

        if (hoursTable) {
          const rows = Array.from(hoursTable.querySelectorAll('tr'));
          rows.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('td, th'));
            let dayCell = null;
            let timeCell = null;

            cells.forEach(cell => {
              const text = cell.textContent.trim().toLowerCase();
              let isDay = false;
              for (const key of Object.keys(dayMap)) {
                if (text.startsWith(key)) {
                  isDay = true;
                  break;
                }
              }
              if (isDay) {
                dayCell = cell;
              } else if (text.match(/\d/) || text.includes('fechado') || text.includes('closed') || text.includes('24')) {
                timeCell = cell;
              }
            });

            if (dayCell && timeCell) {
              const dayRaw = dayCell.textContent.toLowerCase().trim();
              const timeRaw = timeCell.textContent.trim();

              let targetDay = null;
              for (const [key, val] of Object.entries(dayMap)) {
                if (dayRaw.startsWith(key)) {
                  targetDay = val;
                  break;
                }
              }

              if (targetDay) {
                foundAny = true;
                if (timeRaw.toLowerCase().includes('fechado') || timeRaw.toLowerCase().includes('closed')) {
                  schedule[targetDay] = { isOpen: false, slots: [] };
                } else if (timeRaw.toLowerCase().includes('24 horas') || 
                           timeRaw.toLowerCase().includes('24h') || 
                           timeRaw.toLowerCase().includes('open 24 hours') ||
                           timeRaw.toLowerCase().includes('24 hours')) {
                  schedule[targetDay] = { isOpen: true, slots: [{ start: '00:00', end: '23:59' }] };
                } else {
                  const slots = timeRaw.split(/[,;]/).map(s => {
                    const times = s.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi) || s.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?/gi);
                    if (times && times.length === 2) {
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
                        const pad = (num) => String(num).padStart(2, '0');
                        return `${pad(hours)}:${pad(minutes)}`;
                      };
                      return { start: formatTime(times[0]), end: formatTime(times[1]) };
                    }
                    return null;
                  }).filter(Boolean);

                  schedule[targetDay] = {
                    isOpen: slots.length > 0,
                    slots: slots
                  };
                }
              }
            }
          });
        }

        // Fallback se não encontrou tabela estruturada
        if (!foundAny) {
          const allElements = Array.from(document.querySelectorAll('div, span, p, tr, li'));
          for (const el of allElements) {
            const text = el.textContent.trim();
            if (!text || text.length > 150) continue;
            const lowerText = text.toLowerCase();
            for (const [key, val] of Object.entries(dayMap)) {
              if (lowerText.startsWith(key) && (lowerText.includes(':') || lowerText.includes('–') || lowerText.includes('-') || lowerText.includes('fechado') || lowerText.includes('closed'))) {
                let timePart = text.substring(key.length).replace(/^[:\s\-–—]+/, '').trim();
                if (timePart && timePart.length > 2) {
                  foundAny = true;
                  if (timePart.toLowerCase().includes('fechado') || timePart.toLowerCase().includes('closed')) {
                    schedule[val] = { isOpen: false, slots: [] };
                  } else if (timePart.toLowerCase().includes('24 horas') || 
                             timePart.toLowerCase().includes('24h') || 
                             timePart.toLowerCase().includes('open 24 hours') ||
                             timePart.toLowerCase().includes('24 hours')) {
                    schedule[val] = { isOpen: true, slots: [{ start: '00:00', end: '23:59' }] };
                  } else {
                    const slots = timePart.split(/[,;]/).map(s => {
                      const times = s.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi) || s.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?/gi);
                      if (times && times.length === 2) {
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
                          const pad = (num) => String(num).padStart(2, '0');
                          return `${pad(hours)}:${pad(minutes)}`;
                        };
                        return { start: formatTime(times[0]), end: formatTime(times[1]) };
                      }
                      return null;
                    }).filter(Boolean);

                    schedule[val] = {
                      isOpen: slots.length > 0,
                      slots: slots
                    };
                  }
                }
              }
            }
          }
        }

        // 4. Extrai endereço, telefone, site e Instagram da página do Maps
        const extractedInfo = {};
        
        // Endereço - busca pelo botão/link com data-item-id="address"
        const addressEl = document.querySelector('*[data-item-id="address"]') || 
                          document.querySelector('button[data-tooltip="Copiar endereço"]');
        if (addressEl) {
          const addrText = addressEl.textContent.trim();
          if (addrText && addrText.length > 5) extractedInfo.address = addrText;
        }
        if (!extractedInfo.address) {
          // Fallback: busca por aria-label com endereço
          const addrBtn = Array.from(document.querySelectorAll('button[aria-label], a[aria-label]')).find(el => {
            const label = (el.getAttribute('aria-label') || '').toLowerCase();
            return label.includes('endereço:') || label.includes('address:');
          });
          if (addrBtn) {
            const label = addrBtn.getAttribute('aria-label') || '';
            const addrMatch = label.match(/(?:endereço|address):\s*(.+)/i);
            if (addrMatch) extractedInfo.address = addrMatch[1].trim();
          }
        }
        if (!extractedInfo.address) {
          // Fallback 2: busca por data-item-id que contenha "address"
          const addrEl2 = document.querySelector('[data-item-id*="address"]');
          if (addrEl2) {
            const txt = addrEl2.textContent.trim();
            if (txt.length > 5) extractedInfo.address = txt;
          }
        }
        
        // Telefone - busca pelo botão/link com data-item-id="phone"
        const phoneEl = document.querySelector('*[data-item-id^="phone"]') ||
                        document.querySelector('button[data-tooltip="Copiar número de telefone"]');
        if (phoneEl) {
          const phoneText = phoneEl.textContent.trim().replace(/[^\d\s\(\)\+\-]/g, '').trim();
          if (phoneText && phoneText.length >= 8) extractedInfo.phone = phoneText;
        }
        if (!extractedInfo.phone) {
          const phoneBtn = Array.from(document.querySelectorAll('button[aria-label], a[aria-label]')).find(el => {
            const label = (el.getAttribute('aria-label') || '').toLowerCase();
            return label.includes('telefone:') || label.includes('phone:');
          });
          if (phoneBtn) {
            const label = phoneBtn.getAttribute('aria-label') || '';
            const phoneMatch = label.match(/(?:telefone|phone):\s*(.+)/i);
            if (phoneMatch) extractedInfo.phone = phoneMatch[1].trim();
          }
        }
        
        // Site oficial
        const siteEl = document.querySelector('*[data-item-id="authority"]') ||
                       document.querySelector('a[data-item-id="authority"]');
        if (siteEl) {
          const href = siteEl.getAttribute('href') || siteEl.textContent.trim();
          if (href && href.startsWith('http')) extractedInfo.website = href;
          else if (siteEl.textContent.trim().includes('.')) extractedInfo.website = siteEl.textContent.trim();
        }
        
        // Links sociais (Instagram, Facebook, etc.)
        const socialLinks = [];
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        allLinks.forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href.includes('instagram.com/')) {
            const match = href.match(/instagram\.com\/([^/?]+)/);
            if (match) socialLinks.push({ platform: 'instagram', url: `https://www.instagram.com/${match[1]}/` });
          } else if (href.includes('facebook.com/')) {
            socialLinks.push({ platform: 'facebook', url: href });
          }
        });
        if (socialLinks.length > 0) extractedInfo.socialLinks = socialLinks;

        // Extrai fotos da galeria / capa
        const photos = [];
        const imgElements = Array.from(document.querySelectorAll('button[aria-label^="Foto"] img, div[aria-label^="Foto"] img, img[decoding="async"], .gallery-image, img.gallery-image, div[role="img"], img[src*="googleusercontent.com/p/AF1Qip"]'));
        
        imgElements.forEach(img => {
          let src = img.getAttribute('src') || '';
          if (img.tagName.toLowerCase() === 'div') {
            const style = img.getAttribute('style') || '';
            const match = style.match(/url\(['"]?(.*?)['"]?\)/);
            if (match) src = match[1];
          }
          
          if (src && src.includes('googleusercontent.com/p/AF1Qip') && !src.includes('w50-h50') && !src.includes('w24-h24') && !src.includes('w36-h36')) {
            // Aumenta a resolução da imagem do google
            const cleanSrc = src.replace(/=w\d+-h\d+.*$/, '=s800');
            if (!photos.includes(cleanSrc)) photos.push(cleanSrc);
          }
        });
        
        if (photos.length > 0) {
          extractedInfo.coverImage = photos[0];
          extractedInfo.galleryImages = photos.slice(1, 13);
        }

        if (foundAny) {
          return { success: true, schedule, ...extractedInfo };
        } else {
          // Mesmo sem horários, retorna os outros dados se encontrou algo
          const hasOtherData = extractedInfo.address || extractedInfo.phone || extractedInfo.website || (extractedInfo.socialLinks && extractedInfo.socialLinks.length > 0) || extractedInfo.coverImage;
          if (hasOtherData) {
            return { success: true, schedule: null, ...extractedInfo };
          }
          return { success: false, error: "Tabela de horários não encontrada na página do Google Maps." };
        }
      }
    });

    // Remove a aba logo em seguida
    await removeTabWithRetry(tabId);
    
    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    
    return { success: false, error: "Nenhum resultado retornado do script do Google Maps." };

  } catch (err) {
    console.error("Erro na captura de horários do Google Maps:", err);
    try { await removeTabWithRetry(tabId); } catch (_) {}
    return { success: false, error: err.message };
  }
}

async function handleSearchGoogleForMenu(query) {
  console.log("Iniciando busca por Cardápio para:", query);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const tab = await createTabWithRetry({ url: searchUrl, active: false });
  const tabId = tab.id;
  
  try {
    await new Promise((resolve, reject) => {
      let tries = 0;
      const checkStatus = () => {
        chrome.tabs.get(tabId, (currentTab) => {
          if (chrome.runtime.lastError) {
            reject(new Error("A aba foi fechada prematuramente."));
            return;
          }
          if (currentTab.status === 'complete') {
            resolve();
          } else {
            tries++;
            if (tries > 30) {
              reject(new Error("Tempo limite na busca do Google."));
            } else {
              setTimeout(checkStatus, 500);
            }
          }
        });
      };
      setTimeout(checkStatus, 1000);
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const anchors = Array.from(document.querySelectorAll('#search a'));
        const menuKeywords = [
          'goomer.app', 'pedir.to', 'ola.click', 'cardapio.menu', 'delivery',
          'menudigital', 'instamenu', 'abrahahot', 'tagme.com.br', 'wa.me',
          'api.whatsapp', 'cardapiomenu', 'comutat', 'cardapio', 'menu'
        ];
        
        for (const a of anchors) {
          if (!a.href) continue;
          const href = a.href.toLowerCase();
          const text = (a.innerText || a.textContent || '').toLowerCase();
          
          if (href.includes('google.com')) continue;
          
          for (const kw of menuKeywords) {
            if (href.includes(kw) || text.includes(kw)) {
              return a.href;
            }
          }
        }
        
        for (const a of anchors) {
          if (!a.href) continue;
          const href = a.href.toLowerCase();
          if (!href.includes('google.com') && !href.includes('instagram.com') && !href.includes('facebook.com')) {
            return a.href;
          }
        }
        return null;
      }
    });

    const foundUrl = results && results[0] && results[0].result;
    if (foundUrl) {
      return { success: true, url: foundUrl };
    } else {
      return { success: false, error: "Nenhum link de cardápio encontrado." };
    }
  } catch (err) {
    console.error("Erro na busca de cardápio:", err);
    return { success: false, error: err.message };
  } finally {
    try {
      await removeTabWithRetry(tabId);
    } catch(e) {}
  }
}




async function handleMenuScrapeFromInstagram(instagramUrl, restaurantName, city, neighborhood, sender) {
  console.log('[Extension] Iniciando fluxo completo de cardápio via Instagram:', instagramUrl, 'City:', city, 'Neighborhood:', neighborhood);
  
  let tabId;
  try {
    const tab = await createTabWithRetry({ url: instagramUrl, active: false });
    tabId = tab.id;
    
    await waitForTabToComplete(tabId);
    await new Promise(r => setTimeout(r, 1000));
    
    let bioLink = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async (targetCity, targetNeighborhood) => {
        return new Promise((resolve) => {
          const deliveryDomains = [
            'saipos.com', 'anota.ai', 'goomer.app', 'goomer.com.br', 'linktr.ee', 
            'bio.link', 'livemenu.app', 'livemenu', 'ola.menu', 'wa.me', 
            'whatsapp.com', 'cardapio.digital', 'instadelivery.com.br', 
            'menu.com.br', 'meumenu.com'
          ];

          const normalize = str => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
          const normCity = normalize(targetCity);
          const normNeighborhood = normalize(targetNeighborhood);

          const cleanUrl = (url) => {
            if (!url) return '';
            let cleaned = url;
            if (cleaned.includes('l.instagram.com/?u=')) {
              try {
                const urlParams = new URL(cleaned).searchParams;
                cleaned = decodeURIComponent(urlParams.get('u') || cleaned);
              } catch (e) {}
            }
            return cleaned;
          };

          const isExternalLink = (href) => {
            if (!href) return false;
            try {
              const url = new URL(href);
              const hostname = url.hostname.toLowerCase();
              if (hostname.includes('instagram.com') || hostname.includes('threads.net') || hostname.includes('facebook.com')) {
                return false;
              }
              return true;
            } catch (e) {
              return false;
            }
          };

          const parseCandidates = (anchors) => {
            const candidates = [];
            for (const a of anchors) {
              const href = cleanUrl(a.href || '');
              if (!href || !isExternalLink(href)) continue;
              const label = (a.innerText || a.textContent || '').split('\n')[0].trim();
              if (!candidates.some(c => c.url === href)) {
                candidates.push({ label, url: href });
              }
            }
            return candidates;
          };

          const findSelectedUrl = (candidates) => {
            if (candidates.length === 0) return null;
            let matchedLink = null;
            if (normCity) {
              if (normNeighborhood) {
                matchedLink = candidates.find(c => {
                  const normLabel = normalize(c.label);
                  const normUrl = normalize(c.url);
                  return (normLabel.includes(normCity) && normLabel.includes(normNeighborhood)) ||
                         (normUrl.includes(normCity) && normUrl.includes(normNeighborhood));
                });
              }
              if (!matchedLink) {
                matchedLink = candidates.find(c => {
                  const normLabel = normalize(c.label);
                  const normUrl = normalize(c.url);
                  return normLabel.includes(normCity) || normUrl.includes(normCity);
                });
              }
            }
            if (matchedLink) {
              return matchedLink.url;
            }
            const deliveryLink = candidates.find(c => {
              const urlLower = c.url.toLowerCase();
              return deliveryDomains.some(domain => urlLower.includes(domain));
            });
            if (deliveryLink) {
              return deliveryLink.url;
            }
            return candidates[0].url;
          };

          const findMultipleLinksButton = () => {
            const elements = Array.from(document.querySelectorAll('button, div, span, a'));
            for (const el of elements) {
              const text = (el.textContent || '').trim();
              const hasMoreText = /and \d+ more/i.test(text) || /e mais \d+/i.test(text);
              if (!hasMoreText) continue;
              
              const hasLinkText = text.toLowerCase().includes('link');
              const svg = el.querySelector('svg');
              const hasLinkIcon = svg && (
                (svg.getAttribute('aria-label') || '').toLowerCase().includes('link') ||
                svg.querySelector('title')?.textContent.toLowerCase().includes('link') ||
                Array.from(svg.attributes).some(attr => attr.value.toLowerCase().includes('link'))
              );
              
              if (hasLinkText || hasLinkIcon) {
                let clickable = el;
                while (clickable && clickable !== document.body) {
                  if (clickable.tagName === 'BUTTON' || clickable.getAttribute('role') === 'button' || clickable.onclick) {
                    return clickable;
                  }
                  clickable = clickable.parentElement;
                }
                return el;
              }
            }
            return null;
          };

          const scanProfileHeader = () => {
            const header = document.querySelector('header');
            const container = header || document;
            return parseCandidates(Array.from(container.querySelectorAll('a')));
          };

          const closeDialog = (dialog) => {
            const closeEl = dialog.querySelector('button[aria-label*="Close" i], button[aria-label*="Fechar" i], button[aria-label*="cancel" i], button[aria-label*="fechar" i]');
            if (closeEl) {
              closeEl.click();
              return;
            }
            
            const svgs = Array.from(dialog.querySelectorAll('svg'));
            for (const svg of svgs) {
              const ariaLabel = (svg.getAttribute('aria-label') || '').toLowerCase();
              if (ariaLabel.includes('close') || ariaLabel.includes('fechar') || ariaLabel.includes('cancel')) {
                const parentBtn = svg.closest('button');
                if (parentBtn) {
                  parentBtn.click();
                  return;
                }
                svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                return;
              }
            }
            
            let overlay = dialog.parentElement;
            while (overlay && overlay !== document.body) {
              if (overlay.getAttribute('role') === 'presentation' || overlay.className.includes('backdrop') || overlay.className.includes('overlay')) {
                overlay.click();
                return;
              }
              overlay = overlay.parentElement;
            }
            if (dialog.parentElement) {
              dialog.parentElement.click();
            }
          };

          const multiLinkButton = findMultipleLinksButton();
          if (multiLinkButton) {
            console.log('Multi-link button found, clicking it...');
            multiLinkButton.click();

            const observer = new MutationObserver((mutations, obs) => {
              const dialog = document.querySelector('div[role="dialog"]');
              if (dialog) {
                obs.disconnect();
                const candidates = parseCandidates(Array.from(dialog.querySelectorAll('a')));
                const selectedUrl = findSelectedUrl(candidates);
                closeDialog(dialog);
                resolve(selectedUrl);
              }
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true
            });

            setTimeout(() => {
              observer.disconnect();
              const dialog = document.querySelector('div[role="dialog"]');
              if (dialog) {
                const candidates = parseCandidates(Array.from(dialog.querySelectorAll('a')));
                const selectedUrl = findSelectedUrl(candidates);
                closeDialog(dialog);
                resolve(selectedUrl);
              } else {
                const fallbackCandidates = scanProfileHeader();
                resolve(findSelectedUrl(fallbackCandidates));
              }
            }, 5000);
          } else {
            const candidates = scanProfileHeader();
            resolve(findSelectedUrl(candidates));
          }
        });
      },
      args: [city, neighborhood]
    });
    
    let externalUrl = bioLink && bioLink[0] && bioLink[0].result;
    
    if (!externalUrl) {
      await removeTabWithRetry(tabId);
      return { success: false, error: 'Nenhum link de cardápio encontrado na Bio do Instagram.' };
    }
    
    console.log('[Extension] Link encontrado na bio:', externalUrl);
    
    if (externalUrl.includes('l.instagram.com/?u=')) {
      try {
        const urlParams = new URL(externalUrl).searchParams;
        externalUrl = decodeURIComponent(urlParams.get('u') || externalUrl);
      } catch(e){}
    }
    
    await updateTabWithRetry(tabId, { url: externalUrl });
    await waitForTabToComplete(tabId);
    await new Promise(r => setTimeout(r, 1000));
    
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
        await updateTabWithRetry(tabId, { url: targetUrl });
        await waitForTabToComplete(tabId);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        await removeTabWithRetry(tabId);
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
    
    await waitForTabToComplete(tabId);
    await new Promise(r => setTimeout(r, 1000));
    
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
              await removeTabWithRetry(tabId);
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
    
    await removeTabWithRetry(tabId);
    return { success: true, rawText: domText && domText[0] && domText[0].result };
    
  } catch (err) {
    console.error('Erro no handleMenuScrapeFromInstagram:', err);
    if (tabId !== undefined) {
      try { await removeTabWithRetry(tabId); } catch(e){}
    }
    return { success: false, error: err.message };
  }
}
