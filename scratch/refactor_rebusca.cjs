const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/pages/admin/GoogleMapsCollector.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const handleRebuscaStartRegex = /const handleRebusca = async \([^)]+\)(?:: Promise<boolean>)? => \{/;
const handleRebuscaStartMatch = content.match(handleRebuscaStartRegex);

if (handleRebuscaStartMatch) {
  const startIdx = handleRebuscaStartMatch.index;
  
  // Find the end of handleRebusca
  let braceCount = 0;
  let endIdx = -1;
  let started = false;
  
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      started = true;
    } else if (content[i] === '}') {
      braceCount--;
    }
    
    if (started && braceCount === 0) {
      endIdx = i + 1;
      break;
    }
  }
  
  if (endIdx !== -1) {
    // Generate new modularized handleRebusca and subfunctions
    const newHandleRebuscaBlock = `
  // --- SUBFUNÇÕES MODULARES PARA AI-VALIDATION ---
  const runPhaseA_Context = async (rest: any, mapUrl: string) => {
    // Fase A: Horários
    const hoursQuery = \`\${rest?.name} \${rest?.city || ''} João Pessoa\`;
    try {
      const extRes = await new Promise<any>((resolve) => {
        const chromeObj = (window as any).chrome;
        if (chromeObj && chromeObj.runtime) {
          chromeObj.runtime.sendMessage(extensionId, { action: "scrapeGoogleHours", query: hoursQuery, mapUrl }, resolve);
        } else resolve({ success: false });
      });
      if (extRes && extRes.success && extRes.schedule) {
        await supabase.from('restaurants').update({ opening_hours: extRes.schedule }).eq('id', rest?.id);
      }
    } catch (err) { }
    
    // Fase A: Nativo
    const queryNative = \`\${rest?.name} \${rest?.city || ''} \${rest?.state || ''} cardapio instagram telefone\`;
    let googleSearchResults = null;
    try {
      googleSearchResults = await new Promise((resolve) => {
        const chromeObj = (window as any).chrome;
        if (chromeObj && chromeObj.runtime) {
          chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleNative", query: queryNative }, (res: any) => resolve(res?.success ? res.results : null));
        } else resolve(null);
      });
    } catch(e) {}
    return googleSearchResults;
  };

  const runPhaseB_Candidates = async (rest: any) => {
    let candidateUrls: string[] = [];
    const existingInsta = rest?.social_networks?.find((s: any) => s && s.platform === 'instagram' && s.url)?.url || rest?.instagram;
    if (existingInsta && existingInsta.trim() !== '') candidateUrls.push(existingInsta);
    
    const query1 = \`\${rest?.name} \${rest?.city || ''} instagram\`;
    try {
      const res1 = await new Promise<any>((resolve) => {
        const chromeObj = (window as any).chrome;
        chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleForInstagram", query: query1, blocklist: [] }, resolve);
      });
      if (res1 && res1.urls) res1.urls.forEach((u: string) => { if (!candidateUrls.includes(u)) candidateUrls.push(u); });
      else if (res1 && res1.url && !candidateUrls.includes(res1.url)) candidateUrls.push(res1.url);
    } catch (e) {}

    const cleanPhone = rest?.phone ? rest.phone.replace(/\\D/g, '') : '';
    if (cleanPhone.length >= 8) {
      const query2 = \`\${cleanPhone} instagram\`;
      try {
        const res2 = await new Promise<any>((resolve) => {
          const chromeObj = (window as any).chrome;
          chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleForInstagram", query: query2, blocklist: [] }, resolve);
        });
        if (res2 && res2.urls) res2.urls.forEach((u: string) => { if (!candidateUrls.includes(u)) candidateUrls.push(u); });
        else if (res2 && res2.url && !candidateUrls.includes(res2.url)) candidateUrls.push(res2.url);
      } catch (e) {}
    }
    return candidateUrls.slice(0, 3);
  };

  const runPhaseC_Validation = async (restaurantId: string, rest: any, candidateUrls: string[], googleSearchResults: any) => {
    let activeInstagramUrl = '';
    let instagramBio = '';
    let bioLinkUrl = '';
    let instagramFollowers = 0;
    let logoPublicUrl = '';
    let highlightPublicUrls: string[] = [];
    let firstFeedPhotoUrl = '';

    for (const candidateUrl of candidateUrls) {
      const scrapeRes = await new Promise<any>((resolve) => {
        const chromeObj = (window as any).chrome;
        chromeObj.runtime.sendMessage(extensionId, { action: "scrapeInstagram", instagramUrl: candidateUrl }, resolve);
      });

      if (!scrapeRes || !scrapeRes.success || scrapeRes.isLoginRequired) continue;

      try {
        const valCheckRes = await fetch(\`/api/local-collector/validate-instagram?restaurantId=\${restaurantId}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            instagramUrl: candidateUrl, 
            instagramContext: scrapeRes.bio || 'Sem bio.',
            restaurantName: rest?.name,
            restaurantAddress: rest?.address,
            restaurantPhone: rest?.phone,
            restaurantCity: rest?.city
          })
        });
        if (valCheckRes.ok) {
          const valCheckData = await valCheckRes.json();
          if (valCheckData.success && valCheckData.isValid && (valCheckData.confidenceScore || 0) >= 0.7) {
            activeInstagramUrl = candidateUrl;
            instagramBio = scrapeRes.bio || '';
            bioLinkUrl = scrapeRes.bioLink || '';
            instagramFollowers = scrapeRes.followers || 0;
            if (scrapeRes.firstFeedPhotoUrl) firstFeedPhotoUrl = scrapeRes.firstFeedPhotoUrl;
            
            if (scrapeRes.logoDataUrl) {
              try {
                const blob = base64ToBlob(scrapeRes.logoDataUrl);
                const storagePath = \`logos/\${restaurantId}_logo.jpg\`;
                const { error: uploadError } = await supabase.storage.from('restaurant-images').upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });
                if (!uploadError) logoPublicUrl = supabase.storage.from('restaurant-images').getPublicUrl(storagePath).data.publicUrl;
              } catch(e) {}
            }
            if (scrapeRes.highlightImages && scrapeRes.highlightImages.length > 0) {
              for (let idx = 0; idx < scrapeRes.highlightImages.length; idx++) {
                try {
                  const blob = base64ToBlob(scrapeRes.highlightImages[idx]);
                  const storagePath = \`highlights/\${restaurantId}/highlight_\${idx}_\${Date.now()}.jpg\`;
                  const { error } = await supabase.storage.from('restaurant-images').upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });
                  if (!error) highlightPublicUrls.push(supabase.storage.from('restaurant-images').getPublicUrl(storagePath).data.publicUrl);
                } catch(e) {}
              }
            }
            break;
          }
        }
      } catch(e) {}
    }

    if (activeInstagramUrl) {
      const updates: any = {};
      if (logoPublicUrl) updates.image_url = logoPublicUrl;
      if (rest) {
        const cleanSocials = (rest.social_networks || []).filter((s: any) => s && s.platform !== 'instagram');
        const pct = parseFloat(localStorage.getItem('admin_followers_percentage') || '10');
        cleanSocials.push({ platform: 'instagram', url: activeInstagramUrl, followers: instagramFollowers, followers_override: Math.round((instagramFollowers * pct) / 100) });
        updates.social_networks = cleanSocials;
        updates.instagram = activeInstagramUrl;
      }
      await supabase.from('restaurants').update(updates).eq('id', restaurantId);
    }

    const valRes = await fetch(\`/api/local-collector/re-ai-validation?restaurantId=\${restaurantId}&origin=\${encodeURIComponent(window.location.origin)}\`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleSearchResults, instagramContext: instagramBio, instagramHighlights: highlightPublicUrls, instagramLogoUrl: logoPublicUrl, instagramFeedPhotoUrl: firstFeedPhotoUrl, bioLinkUrl })
    });
    
    return valRes.ok ? (await valRes.json()).success : false;
  };

  const handleRebusca = async (restaurantId: string, field: 'instagram' | 'menu' | 'hours' | 'scrape-menu' | 'scrape-logo' | 'ai-validation'): Promise<boolean> => {
    const key = \`\${restaurantId}-\${field}\`;
    if (loadingRebusca[key]) return false;
    
    setLoadingRebusca(prev => ({ ...prev, [key]: true }));
    
    try {
      const rest = results.find(r => r.id === restaurantId);
      if (!rest) return false;

      if (field === 'ai-validation' && isExtensionActive && extensionId) {
        let mapUrl = rest.googleMapsUrl || '';
        const googleSearchResults = await runPhaseA_Context(rest, mapUrl);
        const candidateUrls = await runPhaseB_Candidates(rest);
        const success = await runPhaseC_Validation(restaurantId, rest, candidateUrls, googleSearchResults);
        
        if (success) {
          loadScrapedFromSupabase();
          window.dispatchEvent(new Event('local-sync-restaurants'));
          return true;
        }
        return false;
      }
      // Outros fields podem ser ignorados ou mantidos caso a extensão não esteja ativa
      return false;
    } catch (err) {
      return false;
    } finally {
      setLoadingRebusca(prev => ({ ...prev, [key]: false }));
    }
  };
`;

    content = content.substring(0, startIdx) + newHandleRebuscaBlock + content.substring(endIdx);
    fs.writeFileSync(filePath, content);
    console.log('handleRebusca refatorado com sucesso!');
  }
} else {
  console.log('handleRebusca não encontrado.');
}
