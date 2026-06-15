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
});

async function handleInstagramScrape(instagramUrl) {
  console.log("Iniciando raspagem para:", instagramUrl);
  // 1. Cria a aba (ativa para evitar o bloqueio de throttling do Chrome)
  const tab = await chrome.tabs.create({ url: instagramUrl, active: true });
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
      await chrome.tabs.update(tabId, { active: true });
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
    
    // 5. Fecha a aba temporária (pois a raspagem deu certo)
    await chrome.tabs.remove(tabId);
    
    return {
      success: true,
      followers: scrapeData.followers,
      logoDataUrl: base64 ? `data:${contentType};base64,${base64}` : null,
      rawLogoUrl: scrapeData.profilePicUrl
    };
    
  } catch (err) {
    console.error("Erro no fluxo do scraper:", err);
    // Tenta limpar a aba em caso de erro
    try {
      chrome.tabs.get(tabId, (currentTab) => {
        if (!chrome.runtime.lastError && currentTab) {
          chrome.tabs.remove(tabId);
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
function scrapePageLogic() {
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
      } else if (mult === 'm' || mult === 'mi' || mult === 'milões' || mult === 'milões' || mult === 'mili') {
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
  
  return {
    success: true,
    profilePicUrl: profilePicUrl,
    followers: followersCount
  };
}

async function handleInstagramPostScrape(url) {
  console.log("Iniciando raspagem de post para:", url);
  // 1. Cria a aba (ativa para evitar throttling do Chrome)
  const tab = await chrome.tabs.create({ url: url, active: true });
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
      await chrome.tabs.update(tabId, { active: true });
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
    await chrome.tabs.remove(tabId);
    
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
          chrome.tabs.remove(tabId);
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
  const tab = await chrome.tabs.create({ url: url, active: true });
  const tabId = tab.id;
  
  // Restaura o foco na aba original para não perturbar o usuário
  if (originalTabId) {
    try {
      await chrome.tabs.update(originalTabId, { active: true });
    } catch (e) {
      console.warn("Não foi possível restaurar o foco para a aba original:", e);
    }
  }
  
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
    await chrome.tabs.remove(tabId);

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
          chrome.tabs.remove(tabId);
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
        
        const headerClassStr = String(header.className || '');
        if (headerClassStr.includes('collapsed') || headerClassStr.includes('close')) {
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
        imgUrl = imgEl.getAttribute('src') || '';
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
