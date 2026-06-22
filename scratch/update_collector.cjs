const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/pages/admin/GoogleMapsCollector.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes("if (field === 'ai-validation' && isExtensionActive && extensionId) {"));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes("} else if (field === 'hours' && isExtensionActive && extensionId) {"));

if (startIdx === -1 || endIdx === -1) {
    console.error("Não foi possível encontrar o bloco.");
    process.exit(1);
}

const replacement = `      if (field === 'ai-validation' && isExtensionActive && extensionId) {
        const rest = results.find(r => r.id === restaurantId);
        let mapUrl = '';
        if (rest) {
          if (rest.googleMapsUrl) mapUrl = rest.googleMapsUrl;
          else if (rest.visit_notes) {
            const match = rest.visit_notes.match(/https:\\/\\/[^\\s\\n]*google[^\\s\\n]*\\/maps[^\\s\\n]*/i) || rest.visit_notes.match(/https:\\/\\/[^\\s\\n]*maps\\.app\\.goo\\.gl[^\\s\\n]*/i) || rest.visit_notes.match(/Google Maps:\\s*(https:\\/\\/[^\\s\\n]*)/i);
            if (match && match[0]) mapUrl = match[1] || match[0];
          }
        }

        // ==========================================
        // FASE A: Contexto Google (Horários e Nativo)
        // ==========================================
        showSuccess('Fase A: Buscando horários nativamente no Google...');
        const hoursQuery = \`\${rest?.name} \${rest?.city || ''} João Pessoa\`;
        try {
          const extRes = await new Promise<any>((resolve) => {
            const chromeObj = (window as any).chrome;
            if (chromeObj && chromeObj.runtime) {
              chromeObj.runtime.sendMessage(extensionId, { action: "scrapeGoogleHours", query: hoursQuery, mapUrl }, (response: any) => resolve(response));
            } else {
              resolve({ success: false });
            }
          });
          
          if (extRes && extRes.success && extRes.schedule) {
            showSuccess('Horários encontrados! Salvando no banco...');
            const { data: { session } } = await supabase.auth.getSession();
            await fetch('/api/local-collector/update-hours', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${session?.access_token}\`
              },
              body: JSON.stringify({ restaurantId: rest?.id, openingHours: extRes.schedule })
            });
            await supabase.from('restaurants').update({ opening_hours: extRes.schedule }).eq('id', rest?.id);
          } else {
            showError('Horários não encontrados na busca nativa.');
          }
        } catch (err) {
          console.error('Erro ao buscar horários:', err);
        }

        showSuccess('Fase A: Buscando contexto no Google Nativo via Extensão...');
        const queryNative = \`\${rest?.name} \${rest?.city || ''} \${rest?.state || ''} cardapio instagram telefone\`;
        let googleSearchResults = null;
        try {
          googleSearchResults = await new Promise((resolve) => {
            const chromeObj = (window as any).chrome;
            if (chromeObj && chromeObj.runtime) {
              chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleNative", query: queryNative }, (response: any) => {
                if (response && response.success && response.results) resolve(response.results);
                else resolve(null);
              });
            } else resolve(null);
          });
        } catch(e) {}

        if (!googleSearchResults || googleSearchResults.length === 0) {
           showError('Busca nativa no Google falhou. Prosseguindo sem contexto extra...');
        } else {
           showSuccess(\`Coletados \${googleSearchResults.length} resultados do Google Nativo.\`);
        }

        // ==========================================
        // FASE B: Busca Multi-Candidato Instagram
        // ==========================================
        showSuccess('Fase B: Buscando candidatos de Instagram...');
        let candidateUrls: string[] = [];
        
        // Se já tiver Instagram no cadastro, ele é o candidato prioritário
        const existingInsta = rest?.social_networks?.find((s: any) => s && s.platform === 'instagram' && s.url)?.url || rest?.instagram;
        if (existingInsta && existingInsta.trim() !== '') {
          candidateUrls.push(existingInsta);
        }
        
        // Busca 1: Nome + Cidade
        const query1 = \`\${rest?.name} \${rest?.city || ''} instagram\`;
        try {
          const res1 = await new Promise<any>((resolve) => {
            const chromeObj = (window as any).chrome;
            chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleForInstagram", query: query1, blocklist: [] }, (res: any) => resolve(res));
          });
          if (res1 && res1.urls) {
            res1.urls.forEach((u: string) => { if (!candidateUrls.includes(u)) candidateUrls.push(u); });
          } else if (res1 && res1.url) {
            if (!candidateUrls.includes(res1.url)) candidateUrls.push(res1.url);
          }
        } catch (e) {}

        // Busca 2: Telefone + Instagram (se tiver telefone válido)
        const cleanPhone = rest?.phone ? rest.phone.replace(/\\D/g, '') : '';
        if (cleanPhone.length >= 8) {
          const query2 = \`\${cleanPhone} instagram\`;
          try {
            const res2 = await new Promise<any>((resolve) => {
              const chromeObj = (window as any).chrome;
              chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleForInstagram", query: query2, blocklist: [] }, (res: any) => resolve(res));
            });
            if (res2 && res2.urls) {
              res2.urls.forEach((u: string) => { if (!candidateUrls.includes(u)) candidateUrls.push(u); });
            } else if (res2 && res2.url) {
              if (!candidateUrls.includes(res2.url)) candidateUrls.push(res2.url);
            }
          } catch (e) {}
        }
        
        candidateUrls = candidateUrls.slice(0, 3); // Limita a 3 candidatos

        // ==========================================
        // FASE C: IA Juíza e Extração de Instagram
        // ==========================================
        showSuccess(\`Fase C: Avaliando \${candidateUrls.length} candidato(s) com IA...\`);
        let activeInstagramUrl = '';
        let instagramBio = '';
        let bioLinkUrl = '';
        let instagramFollowers = 0;
        let logoPublicUrl = '';
        let highlightPublicUrls: string[] = [];
        let firstFeedPhotoUrl = '';

        for (const candidateUrl of candidateUrls) {
          showSuccess(\`Raspando candidato: \${candidateUrl}...\`);
          const scrapeRes = await new Promise<any>((resolve) => {
            const chromeObj = (window as any).chrome;
            chromeObj.runtime.sendMessage(extensionId, { action: "scrapeInstagram", instagramUrl: candidateUrl }, (res: any) => resolve(res));
          });

          if (!scrapeRes || !scrapeRes.success || scrapeRes.isLoginRequired) {
            showError(\`Falha ao raspar candidato \${candidateUrl}. Tentando próximo...\`);
            continue;
          }

          showSuccess(\`Validando candidato \${candidateUrl} com IA Semântica...\`);
          const valCheckOptions = {
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
          };
          
          try {
            const valCheckRes = await fetch(\`/api/local-collector/validate-instagram?restaurantId=\${restaurantId}\`, valCheckOptions);
            if (valCheckRes.ok) {
              const valCheckData = await valCheckRes.json();
              if (valCheckData.success && valCheckData.isValid && (valCheckData.confidenceScore || 0) >= 0.7) {
                showSuccess(\`🎉 Instagram Confirmado pela IA! (Confiança: \${Math.round((valCheckData.confidenceScore || 1) * 100)}%)\`);
                activeInstagramUrl = candidateUrl;
                instagramBio = scrapeRes.bio || '';
                bioLinkUrl = scrapeRes.bioLink || '';
                instagramFollowers = scrapeRes.followers || 0;
                if (scrapeRes.firstFeedPhotoUrl) firstFeedPhotoUrl = scrapeRes.firstFeedPhotoUrl;
                
                // Upload Logo
                if (scrapeRes.logoDataUrl) {
                  try {
                    const blob = base64ToBlob(scrapeRes.logoDataUrl);
                    const mime = blob.type;
                    let ext = 'jpg';
                    if (mime.includes('png')) ext = 'png';
                    else if (mime.includes('webp')) ext = 'webp';
                    
                    const storagePath = \`logos/\${restaurantId}_logo.\${ext}\`;
                    const { error: uploadError } = await supabase.storage
                      .from('restaurant-images')
                      .upload(storagePath, blob, { contentType: mime, upsert: true });
                    
                    if (!uploadError) {
                      const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                      logoPublicUrl = publicUrl;
                    }
                  } catch(e) {}
                }

                // Upload Highlights
                if (scrapeRes.highlightImages && scrapeRes.highlightImages.length > 0) {
                  for (let idx = 0; idx < scrapeRes.highlightImages.length; idx++) {
                    try {
                      const base64Str = scrapeRes.highlightImages[idx];
                      const blob = base64ToBlob(base64Str);
                      const storagePath = \`highlights/\${restaurantId}/highlight_\${idx}_\${Date.now()}.jpg\`;
                      const { error: uploadError } = await supabase.storage
                        .from('restaurant-images')
                        .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });
                      
                      if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                        highlightPublicUrls.push(publicUrl);
                      }
                    } catch(e) {}
                  }
                }
                break; // Encontrou um válido, sai do loop
              } else {
                showError(\`IA rejeitou \${candidateUrl}. Motivo: \${valCheckData.reason || 'Baixa confiança'}.\`);
              }
            }
          } catch(e) {
            console.error("Erro na validação do candidato", e);
          }
        }

        // Salva logo e seguidores no banco
        if (activeInstagramUrl) {
          const updates: any = {};
          if (logoPublicUrl) updates.image_url = logoPublicUrl;
          if (rest) {
            const currentSocials = rest.social_networks || [];
            const cleanSocials = currentSocials.filter((s: any) => s && s.platform !== 'instagram');
            const pct = parseFloat(localStorage.getItem('admin_followers_percentage') || '10');
            const finalFollowers = Math.round((instagramFollowers * pct) / 100);
            cleanSocials.push({ platform: 'instagram', url: activeInstagramUrl, followers: instagramFollowers, followers_override: finalFollowers });
            updates.social_networks = cleanSocials;
            updates.instagram = activeInstagramUrl;
          }
          await supabase.from('restaurants').update(updates).eq('id', restaurantId);
        }

        // PASSO 4: Envia contexto pro Backend (Phase 5) e aguarda validação
        showSuccess('Enviando contexto completo para Validação IA (Fase 5) no Servidor...');
        const fetchOptions: RequestInit = { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            googleSearchResults,
            instagramContext: instagramBio,
            instagramHighlights: highlightPublicUrls,
            instagramLogoUrl: logoPublicUrl,
            instagramFeedPhotoUrl: firstFeedPhotoUrl,
            bioLinkUrl: bioLinkUrl
          })
        };
        
        const valRes = await fetch(\`/api/local-collector/re-ai-validation?restaurantId=\${restaurantId}&origin=\${encodeURIComponent(window.location.origin)}\`, fetchOptions);
        
        if (valRes.ok) {
          const valData = await valRes.json();
          if (valData.success) {
            showSuccess(\`Validação IA (Fase 5) concluída com Sucesso!\`);
            loadScrapedFromSupabase();
            window.dispatchEvent(new Event('local-sync-restaurants'));
            return true;
          } else {
            showError(\`Erro na Validação IA: \${valData.error || 'Divergência de dados.'}\`);
            return false;
          }
        } else {
          showError('Erro no servidor ao executar Validação IA.');
          return false;
        }`;

const newLines = [
    ...lines.slice(0, startIdx),
    replacement,
    ...lines.slice(endIdx)
];

fs.writeFileSync(filePath, newLines.join('\n'));
console.log("Substituição concluída com sucesso.");
