/**
 * Phase 5: Validação e Enriquecimento via IA (Gemini + Jina AI)
 * 
 * Lê os dados de scraped_restaurants_google.json e os submete ao 
 * Middleware de Validação para descartar links falsos e estruturar cardápios reais.
 */
const fs = require('fs');
const path = require('path');
const { validarECompletarDados } = require('./ai_validator.cjs');

// Carrega as variáveis de ambiente
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
loadEnv();

const JSON_PATH = path.join(__dirname, '..', 'scraped_restaurants_google.json');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function downloadAndUploadImage(supabase, url, filePath) {
  if (!url || url.includes('supabase.co')) return url;
  
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    
    const { data, error } = await supabase.storage
      .from('restaurant-images')
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });
      
    if (error) {
      console.error(`⚠️ Erro ao fazer upload de ${filePath}: ${error.message}`);
      return url; // Retorna original como fallback
    }
    
    const { data: publicData } = supabase.storage.from('restaurant-images').getPublicUrl(filePath);
    return publicData.publicUrl;
  } catch (err) {
    console.error(`⚠️ Erro ao baixar imagem ${url}: ${err.message}`);
    return url; // Fallback
  }
}

function getThemeCoverImage(category) {
  const normalized = (category || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  
  const covers = {
    pizza: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000',
      'https://images.unsplash.com/photo-1590947132387-155cc02f3212?q=80&w=1000',
      'https://images.unsplash.com/photo-1555072956-7758afb20e8f?q=80&w=1000'
    ],
    hamburguer: [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000',
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?q=80&w=1000'
    ],
    sushi: [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1000',
      'https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=1000',
      'https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1000'
    ],
    japonesa: [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1000',
      'https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=1000',
      'https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1000'
    ],
    seafood: [
      'https://images.unsplash.com/photo-1534080391025-097b03b293f2?q=80&w=1000',
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1000',
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?q=80&w=1000'
    ],
    frutosmar: [
      'https://images.unsplash.com/photo-1534080391025-097b03b293f2?q=80&w=1000',
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1000',
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?q=80&w=1000'
    ],
    churrasco: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000',
      'https://images.unsplash.com/photo-1432139548711-576e1e15009d?q=80&w=1000'
    ],
    carne: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000',
      'https://images.unsplash.com/photo-1432139548711-576e1e15009d?q=80&w=1000'
    ],
    cafe: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1000',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1000',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000'
    ],
    cafeteria: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1000',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1000',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000'
    ],
    lanches: [
      'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=1000',
      'https://images.unsplash.com/photo-1509722747041-616f39b57569?q=80&w=1000',
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=1000'
    ],
    salgado: [
      'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=1000',
      'https://images.unsplash.com/photo-1509722747041-616f39b57569?q=80&w=1000',
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=1000'
    ],
    massa: [
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=1000',
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=1000',
      'https://images.unsplash.com/photo-1546549032-9571cd6b27df?q=80&w=1000'
    ],
    italiano: [
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=1000',
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=1000',
      'https://images.unsplash.com/photo-1546549032-9571cd6b27df?q=80&w=1000'
    ],
    doce: [
      'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?q=80&w=1000',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000',
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=1000'
    ],
    sobremesa: [
      'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?q=80&w=1000',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000',
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=1000'
    ],
    sorvete: [
      'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?q=80&w=1000',
      'https://images.unsplash.com/photo-1501443769991-63e047715207?q=80&w=1000',
      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=1000'
    ],
    acai: [
      'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=1000',
      'https://images.unsplash.com/photo-1589417855018-ba20509a25b1?q=80&w=1000'
    ],
    bar: [
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000',
      'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?q=80&w=1000',
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1000'
    ],
    drinks: [
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000',
      'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?q=80&w=1000',
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1000'
    ]
  };

  const defaultCovers = [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=1000',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1000'
  ];

  // Encontra a chave que corresponde à categoria normalizada
  for (const [key, list] of Object.entries(covers)) {
    if (normalized.includes(key)) {
      const idx = Math.floor(Math.random() * list.length);
      return list[idx];
    }
  }

  const defaultIdx = Math.floor(Math.random() * defaultCovers.length);
  return defaultCovers[defaultIdx];
}

async function runValidation() {
  const args = process.argv.slice(2);
  const isSingle = args.includes('--single');
  const idIndex = args.indexOf('--id');
  const targetId = idIndex !== -1 ? args[idIndex + 1] : null;
  const contextFileIndex = args.indexOf('--browser-context-file');
  let browserContextStr = null;
  if (contextFileIndex !== -1) {
    const file = args[contextFileIndex + 1];
    if (fs.existsSync(file)) {
      browserContextStr = fs.readFileSync(file, 'utf-8');
      try { fs.unlinkSync(file); } catch(e){}
    }
  }
  
  const instaContextFileIndex = args.indexOf('--instagram-context-file');
  let instagramContextStr = null;
  if (instaContextFileIndex !== -1) {
    const file = args[instaContextFileIndex + 1];
    if (fs.existsSync(file)) {
      instagramContextStr = fs.readFileSync(file, 'utf-8');
      try { fs.unlinkSync(file); } catch(e){}
    }
  }

  const googleContextFileIndex = args.indexOf('--google-context-file');
  let googleSearchResultsStr = null;
  if (googleContextFileIndex !== -1) {
    const file = args[googleContextFileIndex + 1];
    if (fs.existsSync(file)) {
      googleSearchResultsStr = fs.readFileSync(file, 'utf-8');
      try { fs.unlinkSync(file); } catch(e){}
    }
  }

  const logoUrlIndex = args.indexOf('--instagram-logo-url');
  const instagramLogoUrlArg = logoUrlIndex !== -1 ? args[logoUrlIndex + 1] : null;
  
  const feedPhotoUrlIndex = args.indexOf('--instagram-feed-photo-url');
  const instagramFeedPhotoUrlArg = feedPhotoUrlIndex !== -1 ? args[feedPhotoUrlIndex + 1] : null;

  const bioLinkUrlIndex = args.indexOf('--bio-link-url');
  const bioLinkUrlArg = bioLinkUrlIndex !== -1 ? args[bioLinkUrlIndex + 1] : null;

  console.log('🚀 Iniciando Fase 5: Validação de Qualidade via IA...\n');

  let toProcess = [];
  const { createClient } = require('@supabase/supabase-js');
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
  let supabase = null;

  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  if (isSingle && targetId) {
    if (!supabase) {
      console.error('❌ Credenciais do Supabase não configuradas no .env');
      process.exit(1);
    }
    const { data: rest, error } = await supabase.from('restaurants').select('*').eq('id', targetId).single();
    if (error || !rest) {
      console.error(`❌ Restaurante com ID ${targetId} não encontrado no Supabase.`);
      process.exit(1);
    }
    // Formata o objeto do Supabase para o formato esperado pelo script
    toProcess = [{
      id: rest.id,
      name: rest.name,
      address: rest.address || '',
      neighborhood: rest.neighborhood || '',
      city: rest.city,
      state: rest.state,
      instagram: (() => {
        const url = (rest.social_networks || []).find(s => s && s.platform === 'instagram')?.url;
        return (url && url !== 'null' && url !== 'undefined') ? url : '';
      })(),
      social_networks: rest.social_networks || [],
      phone: rest.phone,
      menuSourceUrl: rest.other_url || rest.external_url || rest.ifood_url, // Supabase usa essas colunas
      category: rest.category,
      ai_validated: rest.ai_validated,
      opening_hours: rest.opening_hours || null,
      coverUrl: rest.cover_image_url || null,
      logoUrl: rest.image_url || null,
      visit_notes: rest.visit_notes || null
    }];
    console.log(`Filtro único ativado via Supabase para: ${toProcess[0].name}`);
  } else {
    // Modo lote original
    if (!fs.existsSync(JSON_PATH)) {
      console.error('❌ Arquivo scraped_restaurants_google.json não encontrado. Execute as fases anteriores primeiro.');
      process.exit(1);
    }
    const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
    toProcess = JSON.parse(rawData);
    console.log(`Encontrados ${toProcess.length} estabelecimentos para validar.\n`);
  }

  for (let i = 0; i < toProcess.length; i++) {
    const r = toProcess[i];
    
    // Evita validar se já estiver validado (a menos que seja forçado por --single)
    if (r.ai_validated && !isSingle) {
      console.log(`⏭️ [${i+1}/${toProcess.length}] ${r.name} já foi validado pela IA. Pulando...`);
      continue;
    }

    console.log(`🤖 [${i+1}/${toProcess.length}] Iniciando validação para: ${r.name}`);
    
    const estabelecimento = {
      name: r.name,
      city: r.city || '',
      state: r.state || '',
      address: r.address || '',
      neighborhood: r.neighborhood || ''
    };
    
    const dadosColetados = {
      instagram: r.instagram,
      phone: r.phone,
      menuSourceUrl: r.menuSourceUrl,
      pageContent: r.pageContent || '',
      visit_notes: r.visit_notes || (r.googleMapsUrl ? 'Google Maps: ' + r.googleMapsUrl : null) || (r.link_google_maps ? 'Google Maps: ' + r.link_google_maps : null),
      browserContext: browserContextStr,
      instagramContext: instagramContextStr,
      googleSearchResults: googleSearchResultsStr,
      bioLinkUrl: bioLinkUrlArg
    };

    try {
      const payload = await validarECompletarDados(estabelecimento, dadosColetados);
      
      // Normalização de links literais de redes sociais da resposta da IA
      if (payload.instagram_url === 'null' || payload.instagram_url === 'undefined' || (payload.instagram_url && payload.instagram_url.trim() === '')) {
        payload.instagram_url = null;
      }
      if (payload.telefone === 'null' || payload.telefone === 'undefined' || (payload.telefone && payload.telefone.trim() === '')) {
        payload.telefone = null;
      }
      if (payload.site_oficial === 'null' || payload.site_oficial === 'undefined' || (payload.site_oficial && payload.site_oficial.trim() === '')) {
        payload.site_oficial = null;
      }
      
      let ai_logs = [];
      const dataHoraAtual = new Date().toLocaleString('pt-BR');
      ai_logs.push(`[${dataHoraAtual}] Validação IA iniciada. Score de Confiança: ${payload.confidence_score || 'N/A'}`);

      if (payload.bairro_match) {
        ai_logs.push(`✅ Match de Bairro confirmado cruzando bio/web e base.`);
      }
      
      // Atualiza os dados de acordo com a validação rigorosa
      if (payload.confianca_confirmada) {
        ai_logs.push(`✅ Identidade confirmada com alta confiança.`);
        if (payload.instagram_url && payload.instagram_url !== r.instagram) {
          ai_logs.push(`[Incluído/Alterado] Instagram: ${payload.instagram_url}`);
          r.instagram = payload.instagram_url;
        } else if (!payload.instagram_url) {
          if (r.instagram) {
            ai_logs.push(`[Removido] Instagram não correspondente: ${r.instagram}`);
            r.instagram = null;
          }
          ai_logs.push(`[Removido] Logo removida devido a Instagram não correspondente.`);
          r.logoUrl = null;
        }
        if (payload.telefone && payload.telefone !== r.phone) {
          ai_logs.push(`[Incluído/Alterado] Telefone: ${payload.telefone}`);
          r.phone = payload.telefone;
        }
        if (payload.site_oficial && payload.site_oficial !== r.menuSourceUrl) {
          ai_logs.push(`[Incluído/Alterado] Site/Cardápio: ${payload.site_oficial}`);
          r.menuSourceUrl = payload.site_oficial;
        }
        if (payload.categoria_correta && payload.categoria_correta !== r.category) {
          ai_logs.push(`[Alterado] Categoria corrigida para: ${payload.categoria_correta}`);
          r.category = payload.categoria_correta;
        }
        if (payload.about) {
          ai_logs.push(`[Incluído] Sobre o restaurante (resumo criado).`);
          r.about = payload.about;
        }
        if (payload.working_hours) {
          ai_logs.push(`[Incluído] Horários de funcionamento preenchidos.`);
          r.working_hours = payload.working_hours;
        }
        if (payload.logo_url) {
           r.logoUrl = payload.logo_url;
        } else if (instagramLogoUrlArg) {
           r.logoUrl = instagramLogoUrlArg;
           ai_logs.push(`[Incluído] Logo do Instagram aplicada como fallback de qualidade.`);
        }

        if (payload.cover_url) {
          r.coverUrl = payload.cover_url;
        } else if (instagramFeedPhotoUrlArg) {
          r.coverUrl = instagramFeedPhotoUrlArg;
          ai_logs.push(`[Incluído] Primeira foto não-vídeo do feed aplicada como Capa de Destaque.`);
        } else if (!r.coverUrl) {
          r.coverUrl = getThemeCoverImage(r.category || payload.categoria_correta);
          ai_logs.push(`[Incluído] Capa temática bonita gerada aleatoriamente baseada na categoria.`);
        }
        
        // Se encontrou cardápio estruturado, anexa
        if (payload.menu_categories && payload.menu_categories.length > 0) {
          ai_logs.push(`[Incluído] Estrutura de cardápio com ${payload.menu_categories.length} categorias extraída.`);
          r.menu_categories = payload.menu_categories;
        }
      } else {
        // Zera os links falsos!
        if (r.instagram) ai_logs.push(`[Removido] Instagram falso: ${r.instagram}`);
        if (r.menuSourceUrl) ai_logs.push(`[Removido] Link/Site falso: ${r.menuSourceUrl}`);
        ai_logs.push(`[Removido] Logo removida devido a reprovação da identidade.`);
        
        r.instagram = null;
        r.menuSourceUrl = null;
        r.logoUrl = null;
        r.ai_mismatch_reason = payload.motivo_divergencia;
        
        ai_logs.push(`❌ Reprovado por Divergência/Fraude.`);
        ai_logs.push(`[Motivo] ${payload.motivo_divergencia}`);
        console.log(`🧹 Limpando links falsos de ${r.name} para manter a qualidade da base.`);
      }
      
      r.ai_log = ai_logs.join('\n');

      // Sincroniza as melhorias (ou a limpeza) com o Supabase
      try {
        const { createClient } = require('@supabase/supabase-js');
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
        const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
        
        if (SUPABASE_URL && SUPABASE_KEY) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
          
          if (payload.confianca_confirmada) {
            // Faz download e upload da logo e capa apenas se confirmado
            if (r.logoUrl) {
              console.log(`[Supabase Storage] Baixando logo de ${r.name}...`);
              r.logoUrl = await downloadAndUploadImage(supabase, r.logoUrl, `brands/${r.id}/logo.jpg`);
            }
            if (r.coverUrl) {
              console.log(`[Supabase Storage] Baixando capa de ${r.name}...`);
              r.coverUrl = await downloadAndUploadImage(supabase, r.coverUrl, `brands/${r.id}/cover.jpg`);
            }
          }

          // Constrói array social_networks atualizado e recupera estado atual de imagens e horários
          let dbRest = null;
          let updatedSocialNetworks = r.social_networks;
          if (!updatedSocialNetworks || r.logoUrl === undefined || r.coverUrl === undefined || r.opening_hours === undefined) {
            const { data } = await supabase.from('restaurants').select('social_networks, image_url, cover_image_url, opening_hours').eq('id', r.id).single();
            dbRest = data;
          }

          if (!updatedSocialNetworks) {
            updatedSocialNetworks = (dbRest && dbRest.social_networks) ? dbRest.social_networks : [];
          }

          let existingLogs = (dbRest && dbRest.coleta_logs) ? dbRest.coleta_logs : null;

          const existingLogo = (dbRest && dbRest.image_url) ? dbRest.image_url : null;
          const existingCover = (dbRest && dbRest.cover_image_url) ? dbRest.cover_image_url : null;
          const existingHours = (dbRest && dbRest.opening_hours) ? dbRest.opening_hours : null;
          
          // Remove instagram se existir para inserir o novo
          updatedSocialNetworks = updatedSocialNetworks.filter(s => s && s.platform !== 'instagram');
          if (r.instagram) {
            updatedSocialNetworks.push({ platform: 'instagram', url: r.instagram });
          }

          // 1. Atualiza restaurante
          const updateObj: any = {
            social_networks: updatedSocialNetworks,
            phone: r.phone,
            other_url: r.menuSourceUrl,
            external_url: r.menuSourceUrl,
            ifood_url: r.menuSourceUrl,
            category: r.category,
            description: r.about || null,
            opening_hours: existingHours || r.opening_hours || r.working_hours || null,
            image_url: r.logoUrl !== undefined ? r.logoUrl : existingLogo,
            cover_image_url: r.coverUrl !== undefined ? r.coverUrl : existingCover,
            ai_validated: r.ai_validated,
            ai_log: r.ai_log,
            ai_confidence_score: payload.confidence_score !== undefined ? payload.confidence_score : null
          };
          if (payload.motivo_divergencia) {
            updateObj.coleta_logs = (existingLogs ? existingLogs + ' | ' : '') + payload.motivo_divergencia;
          }

          const updateRes = await supabase.from('restaurants').update(updateObj).eq('id', r.id);
          if (updateRes.error) {
            console.error(`❌ Erro ao atualizar no Supabase:`, updateRes.error);
          }

          // 2. Atualiza cardápio (só insere se tiver categorias)
          if (payload.confianca_confirmada && r.menu_categories && r.menu_categories.length > 0) {
             await supabase.from('menu_categories').delete().eq('restaurant_id', r.id);
             
             let orderIdx = 0;
             for (const cat of r.menu_categories) {
               const { data: catData, error: catError } = await supabase
                 .from('menu_categories')
                 .insert([{ restaurant_id: r.id, name: cat.category_name, order_index: orderIdx++ }])
                 .select()
                 .single();
               
               if (!catError && catData && cat.items) {
                 const itemsToInsert = [];
                 for (const item of cat.items) {
                   let finalImageUrl = item.image_url || null;
                   if (finalImageUrl) {
                     const safeItemName = item.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                     finalImageUrl = await downloadAndUploadImage(supabase, finalImageUrl, `menus/${r.id}/${catData.id}_${safeItemName}.jpg`);
                   }
                   itemsToInsert.push({
                     category_id: catData.id,
                     name: item.name,
                     price: item.price || 0,
                     description: item.description || '',
                     image_url: finalImageUrl
                   });
                 }
                 if (itemsToInsert.length > 0) {
                   await supabase.from('menu_items').insert(itemsToInsert);
                 }
               }
             }
             console.log(`📡 [Supabase] Dados enriquecidos e imagens salvos com sucesso no banco remoto.`);
          } else if (!payload.confianca_confirmada) {
             console.log(`📡 [Supabase] Dados falsos apagados do banco remoto.`);
          }
        }
      } catch (supaErr) {
        console.error(`⚠️ [Supabase] Erro ao sincronizar dados da IA: ${supaErr.message}`);
      }

      r.ai_validated = true;
      r.ai_confidence = payload.confianca_confirmada;
      
      if (isSingle) {
        console.log(`RESULT:{"success":true,"message":"Validado com IA"}`);
      }
    } catch (e) {
      console.error(`❌ Erro inesperado ao validar ${r.name}: ${e.message}`);
      if (isSingle) {
        console.log(`RESULT:{"success":false,"error":"${e.message}"}`);
      }
    }
  }

  // Se não for single, ou se for single e quisermos manter o arquivo local atualizado
  if (fs.existsSync(JSON_PATH)) {
    try {
      const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
      let localRestaurants = JSON.parse(rawData);
      
      if (isSingle && toProcess.length > 0) {
        // Atualiza apenas o modificado
        const updatedRest = toProcess[0];
        const idx = localRestaurants.findIndex(x => x.id === targetId || x.name === updatedRest.name);
        if (idx !== -1) {
          localRestaurants[idx] = { ...localRestaurants[idx], ...updatedRest };
        }
      } else if (!isSingle) {
        // Atualiza todos
        localRestaurants = toProcess;
      }
      
      fs.writeFileSync(JSON_PATH, JSON.stringify(localRestaurants, null, 2), 'utf-8');
      if (!isSingle) console.log(`\n✅ Fase 5 Completa! Dados finais salvos no arquivo local.`);
    } catch (e) {
      console.error(`Aviso: falha ao atualizar arquivo JSON local: ${e.message}`);
    }
  } else if (!isSingle) {
    fs.writeFileSync(JSON_PATH, JSON.stringify(toProcess, null, 2), 'utf-8');
    console.log(`\n✅ Fase 5 Completa! Dados finais salvos.`);
  }
}

runValidation().catch(console.error);
