/**
 * Logo Scraper Robot (Fase 4: Coleta de Logos via Instagram)
 * 
 * Visita o link do Instagram de cada estabelecimento, coleta a foto de perfil,
 * realiza o download da imagem e faz o upload no bucket do Supabase,
 * salvando a URL pública na coluna image_url do restaurante.
 * 
 * Para executar:
 * node scratch/logo_scraper.cjs [--single --id <restaurantId>]
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeInstagramUrl(raw) {
  if (!raw) return '';
  let clean = raw.trim();
  if (clean.startsWith('@')) {
    return `https://instagram.com/${clean.slice(1)}`;
  }
  if (!clean.includes('/') && !clean.includes('.')) {
    return `https://instagram.com/${clean}`;
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

async function checkAndHandleLogin(page, url) {
  let isLoginPage = page.url().includes('accounts/login') || await page.evaluate(() => {
    return !!document.querySelector('input[name="username"]');
  });

  if (isLoginPage) {
    console.log('\n⚠️  [LOGIN REQUERIDO] O Instagram está exigindo login para ver este perfil.');
    console.log('👉 Por favor, faça login na sua conta do Instagram na janela do Chrome aberta.');
    console.log('⏱️  O robô está pausado aguardando o login para continuar...');
    
    let loggedIn = false;
    while (!loggedIn) {
      await delay(2000);
      const state = await page.evaluate(() => {
        const hasUserField = !!document.querySelector('input[name="username"]');
        return { hasUserField };
      });
      
      if (!page.url().includes('accounts/login') && !state.hasUserField) {
        loggedIn = true;
      }
    }
    
    console.log('✅ Login detectado! Retornando ao perfil...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);
    return true;
  }
  return false;
}

function parseFollowersValue(numberStr, multiplierStr) {
  let clean = numberStr.trim();
  if (multiplierStr) {
    clean = clean.replace(',', '.');
    let val = parseFloat(clean);
    if (isNaN(val)) return null;
    
    const mult = multiplierStr.toLowerCase().trim();
    if (mult === 'k' || mult === 'mil') {
      val = val * 1000;
    } else if (mult === 'm' || mult === 'mi' || mult === 'milhões' || mult === 'mili') {
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

async function extractInstagramFollowers(page) {
  try {
    const metaContent = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
      return meta ? meta.getAttribute('content') : null;
    });

    if (metaContent) {
      console.log(`   🔍 Analisando meta description para seguidores: "${metaContent}"`);
      const regexPt = /([\d\.,]+)\s*(mil|mi|milhões|m|k)?\s*seguidores/i;
      const regexEn = /([\d\.,]+)\s*(mil|mi|m|k)?\s*followers/i;
      
      const matchPt = metaContent.match(regexPt);
      const matchEn = metaContent.match(regexEn);
      const match = matchPt || matchEn;
      
      if (match) {
        return parseFollowersValue(match[1], match[3] || match[2]);
      }
    }

    const domText = await page.evaluate(() => {
      const selectors = [
        'a[href*="/followers/"] span',
        'a[href*="/followers/"]',
        'a[href*="/followers"] span',
        'a[href*="/followers"]',
        'header li:nth-child(2) span',
        'header li:nth-child(2)'
      ];
      
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.textContent || el.innerText;
          if (text && (text.toLowerCase().includes('seguidor') || text.toLowerCase().includes('follower') || /\d/.test(text))) {
            return text;
          }
        }
      }
      return null;
    });

    if (domText) {
      console.log(`   🔍 Analisando texto do DOM para seguidores: "${domText}"`);
      const cleanText = domText.replace(/seguidores|seguidor|followers|follower/gi, '').trim();
      const match = cleanText.match(/([\d\.,]+)\s*(mil|mi|m|k)?/i);
      if (match) {
        return parseFollowersValue(match[1], match[2]);
      }
    }
  } catch (err) {
    console.error('   ⚠️ Erro ao extrair seguidores:', err.message);
  }
  return null;
}

function downloadBufferNode(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        resolve({
          buffer: Buffer.concat(data),
          contentType: res.headers['content-type']
        });
      });
    }).on('error', (err) => reject(err));
  });
}

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
}

// Inicializa variáveis do .env
loadEnv();

async function downloadAndUploadLogo(restaurantId, imgUrl, page, profileImgSelector) {
  try {
    console.log(`   📥 Tentando baixar imagem do perfil com Node.js...`);
    let buffer;
    let contentType;
    
    try {
      const res = await downloadBufferNode(imgUrl);
      buffer = res.buffer;
      contentType = res.contentType;
      console.log(`   ✅ Download via Node.js bem-sucedido (${contentType})!`);
    } catch (nodeErr) {
      console.warn(`   ⚠️ Falha ao baixar via Node.js (${nodeErr.message}). Tentando via screenshot do elemento no Puppeteer...`);
      
      try {
        if (!profileImgSelector) {
          throw new Error('Nenhum seletor CSS fornecido para a imagem de perfil.');
        }
        
        const elementHandle = await page.$(profileImgSelector);
        if (!elementHandle) {
          throw new Error(`Elemento com seletor "${profileImgSelector}" não encontrado na página.`);
        }
        
        // Tira o screenshot direto do elemento renderizado na tela (evita CORS e download de rede)
        buffer = await elementHandle.screenshot({ type: 'jpeg', quality: 95 });
        contentType = 'image/jpeg';
        console.log(`   ✅ Captura de tela do elemento de imagem bem-sucedida!`);
      } catch (screenshotErr) {
        console.warn(`   ⚠️ Falha ao capturar screenshot do elemento (${screenshotErr.message}). Tentando via fetch clássico no Puppeteer...`);
        
        const base64Data = await page.evaluate(async (url) => {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }, imgUrl);

        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches) throw new Error('Formato de dados Base64 inválido no navegador.');
        
        contentType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
        console.log(`   ✅ Download via navegador (fetch) bem-sucedido (${contentType})!`);
      }
    }

    // Define a extensão do arquivo
    let ext = 'jpg';
    if (contentType && contentType.includes('png')) ext = 'png';
    else if (contentType && contentType.includes('webp')) ext = 'webp';
    else if (contentType && contentType.includes('gif')) ext = 'gif';
    
    const filePath = `logos/${restaurantId}_logo.${ext}`;
    
    console.log(`   📡 Enviando para o bucket "restaurant-images" no Supabase (${filePath})...`);
    
    const { data, error } = await supabase.storage
      .from('restaurant-images')
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });
      
    if (error) throw error;
    
    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(filePath);
      
    console.log(`   ✅ Logo enviado com sucesso! URL: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`   ❌ Falha ao baixar/enviar logo:`, err.message);
    return null;
  }
}

async function run() {
  console.log(`\n=============================================================`);
  console.log(`🖼️ LOGO SCRAPER: COLETA E DOWNLOAD DE LOGOS (FASE 4)`);
  console.log(`=============================================================\n`);

  // Parse command line arguments
  let targetId = null;
  let pct = 10;
  const singleIdx = process.argv.indexOf('--single');
  const idIdx = process.argv.indexOf('--id');
  if (singleIdx !== -1 && idIdx !== -1 && idIdx + 1 < process.argv.length) {
    targetId = process.argv[idIdx + 1];
    console.log(`🎯 Modo Single ativado para o restaurante ID: ${targetId}`);
  }
  const pctIdx = process.argv.indexOf('--pct');
  if (pctIdx !== -1 && pctIdx + 1 < process.argv.length) {
    pct = parseFloat(process.argv[pctIdx + 1]) || 10;
    console.log(`📈 Fator de Seguidores Iniciais ativado: ${pct}%`);
  }

  console.log('📡 Buscando estabelecimentos no Supabase...');
  let query = supabase.from('restaurants').select('*');
  
  if (targetId) {
    query = query.eq('id', targetId);
  } else {
    query = query.or('is_deleted.eq.false,is_deleted.is.null');
  }

  const { data, error: fetchError } = await query;

  if (fetchError) {
    console.error('❌ Erro ao buscar do Supabase:', fetchError.message);
    process.exit(1);
  }

  // Filtra e normaliza os links do Instagram
  let withInstagram = data.map(r => {
    const socialNetworks = r.social_networks || [];
    const instagramObj = socialNetworks.find(sn => sn && sn.platform === 'instagram');
    const rawUrl = instagramObj ? (instagramObj.url || '').trim() : '';
    const instagramUrl = normalizeInstagramUrl(rawUrl);
    return {
      id: r.id,
      name: r.name,
      instagramUrl,
      imageUrl: r.image_url
    };
  }).filter(r => r.instagramUrl && r.instagramUrl.includes('instagram.com'));

  if (targetId && withInstagram.length === 0) {
    const rawRest = data[0];
    const socialNetworks = rawRest ? (rawRest.social_networks || []) : [];
    const instagramObj = socialNetworks.find(sn => sn && sn.platform === 'instagram');
    const rawUrl = instagramObj ? (instagramObj.url || '').trim() : '';
    console.log(`❌ O restaurante solicitado não possui link de Instagram válido cadastrado (Valor no banco: "${rawUrl}").`);
    console.log(`RESULT:{"success":false,"error":"O restaurante não possui link de Instagram válido cadastrado no Supabase (Valor atual: '${rawUrl}')."}`);
    return;
  }

  // Se não for modo single, podemos filtrar para processar apenas quem ainda não tem logo baixado (ou seja, quem tem o placeholder ou está nulo)
  if (!targetId) {
    withInstagram = withInstagram.filter(r => {
      const isPlaceholder = !r.imageUrl || r.imageUrl.includes('unsplash.com') || r.imageUrl.includes('photo-');
      return isPlaceholder;
    });
  }

  console.log(`🔗 ${withInstagram.length} estabelecimentos prontos para verificação de logo.`);

  if (withInstagram.length === 0) {
    console.log(`✨ Todos os estabelecimentos elegíveis já possuem logos processados.`);
    if (targetId) {
      console.log(`RESULT:{"success":false,"error":"Nenhum estabelecimento pendente encontrado."}`);
    }
    return;
  }

  console.log(`🚀 Inicializando navegador Chrome com perfil persistente...`);
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir: path.join(__dirname, 'puppeteer_chrome_profile'),
    args: ['--start-maximized', '--lang=pt-BR']
  });

  const page = await browser.newPage();
  await page.setBypassCSP(true);
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9'
  });

  let successCount = 0;
  let failedCount = 0;
  let singleResultObj = { success: false, error: "Nenhum logo foi identificado ou baixado." };

  for (let idx = 0; idx < withInstagram.length; idx++) {
    const restaurant = withInstagram[idx];
    const url = restaurant.instagramUrl;

    console.log(`\n-------------------------------------------------------------`);
    console.log(`[${idx + 1}/${withInstagram.length}] "${restaurant.name}"`);
    console.log(`   🔗 Instagram: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(3000); // Aguarda renderizar perfil

      // Verifica e aguarda login se necessário
      await checkAndHandleLogin(page, url);

      // Tenta localizar a foto de perfil usando múltiplos seletores (inteligente + robusto)
      let profileImgSrc = null;
      let profileImgSelector = null;

      const getProfileImageFromPage = async () => {
        return await page.evaluate(() => {
          const pathParts = window.location.pathname.split('/').filter(Boolean);
          const username = pathParts[0] ? pathParts[0].toLowerCase() : '';
          const allImgs = Array.from(document.querySelectorAll('img'));
          
          // 1. Busca inteligente com username, filtrando destaques
          if (username) {
            for (const img of allImgs) {
              const alt = (img.alt || '').toLowerCase();
              const src = img.src || '';
              const isProfileAlt = alt.includes('perfil') || alt.includes('profile') || alt.includes('avatar');
              const hasUsername = alt.includes(username);
              const isInsideHighlight = !!img.closest('a[href*="/stories/highlights/"]');
              
              if (isProfileAlt && hasUsername && !isInsideHighlight && src.startsWith('http')) {
                return { src, selector: `img[alt*="${username}"]` };
              }
            }
          }
          
          // 2. Seletores clássicos excluindo links de stories/highlights
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
              return { src: el.src, selector: sel };
            }
          }
          
          // 3. Fallback geral excluindo links de stories/highlights
          for (const img of allImgs) {
            const alt = (img.alt || '').toLowerCase();
            const src = img.src || '';
            const isInsideHighlight = !!img.closest('a[href*="/stories/"]');
            
            if ((alt.includes('perfil') || alt.includes('profile') || alt.includes('avatar')) && !isInsideHighlight) {
              if (src.startsWith('http')) {
                return { src, selector: 'img' };
              }
            }
          }
          
          return null;
        });
      };

      const imgInfo = await getProfileImageFromPage();
      if (imgInfo) {
        profileImgSrc = imgInfo.src;
        profileImgSelector = imgInfo.selector;
      }

      // Se falhou ao localizar o profileImgSrc, faz uma segunda verificação para ver se apareceu tela de login depois
      if (!profileImgSrc) {
        console.log(`   🔍 Foto de perfil não encontrada de imediato. Verificando se fomos bloqueados para login...`);
        const handled = await checkAndHandleLogin(page, url);
        if (handled) {
          const imgInfo2 = await getProfileImageFromPage();
          if (imgInfo2) {
            profileImgSrc = imgInfo2.src;
            profileImgSelector = imgInfo2.selector;
          }
        }
      }

      if (!profileImgSrc) {
        console.log(`   ⚠️ Não foi possível localizar a foto de perfil do Instagram.`);
        failedCount++;
        if (targetId) {
          singleResultObj = { success: false, error: "Não foi possível localizar a foto de perfil na página do Instagram. Pode ser necessário recarregar ou fazer login manual." };
        }
        continue;
      }

      console.log(`   ✅ Foto de perfil localizada!`);
      
      // Tenta extrair a quantidade de seguidores
      console.log(`   👥 Coletando quantidade de seguidores do Instagram...`);
      const followersCount = await extractInstagramFollowers(page);
      if (followersCount !== null) {
        console.log(`   👥 Seguidores encontrados: ${followersCount}`);
      } else {
        console.log(`   ⚠️ Não foi possível coletar a quantidade de seguidores.`);
      }

      // Baixa e faz o upload da imagem
      const publicUrl = await downloadAndUploadLogo(restaurant.id, profileImgSrc, page, profileImgSelector);
      
      const updateData = {};
      if (publicUrl) {
        updateData.image_url = publicUrl;
      }
      if (followersCount !== null) {
        const scaledFollowers = Math.round((followersCount * pct) / 100);
        updateData.followers_override = scaledFollowers;
        console.log(`   👥 Seguidores originais: ${followersCount} -> Calculados (${pct}%): ${scaledFollowers}`);
      }

      if (Object.keys(updateData).length > 0) {
        console.log(`   📡 Atualizando registro do restaurante no Supabase:`, JSON.stringify(updateData));
        const { error: updateError } = await supabase
          .from('restaurants')
          .update(updateData)
          .eq('id', restaurant.id);
          
        if (updateError) {
          console.error(`   ❌ Erro ao atualizar no Supabase:`, updateError.message);
          failedCount++;
          if (targetId) {
            singleResultObj = { success: false, error: `Erro ao atualizar banco de dados: ${updateError.message}` };
          }
        } else {
          console.log(`   🎉 Registro atualizado com sucesso no Supabase!`);
          successCount++;
          if (targetId) {
            singleResultObj = { 
              success: true, 
              url: publicUrl || restaurant.imageUrl,
              followers: followersCount
            };
          }
        }
      } else {
        failedCount++;
        if (targetId) {
          singleResultObj = { success: false, error: "Falha ao baixar logo e coletar seguidores." };
        }
      }
    } catch (err) {
      console.error(`   ❌ Erro durante o processamento:`, err.message);
      failedCount++;
      if (targetId) {
        singleResultObj = { success: false, error: `Erro durante processamento: ${err.message}` };
      }
    }

    if (!targetId && idx < withInstagram.length - 1) {
      const waitTime = 2000 + Math.random() * 2000;
      console.log(`   ⏱️ Aguardando ${Math.round(waitTime)}ms...`);
      await delay(waitTime);
    }
  }

  await browser.close();

  if (targetId) {
    console.log(`RESULT:${JSON.stringify(singleResultObj)}`);
  }

  console.log(`\n=============================================================`);
  console.log(`🎉 LOGO SCRAPER CONCLUÍDO!`);
  console.log(`📊 Logos coletados com sucesso: ${successCount}`);
  console.log(`❌ Falhas: ${failedCount}`);
  console.log(`=============================================================\n`);
}

run().catch(err => {
  console.error('\n❌ Erro fatal:', err);
  process.exit(1);
});
