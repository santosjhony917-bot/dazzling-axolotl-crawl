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
