      if (field === 'ai-validation' && isExtensionActive && extensionId) {
        const rest = restaurant;
        let mapUrl = '';
        if (rest) {
          if (rest.googleMapsUrl) mapUrl = rest.googleMapsUrl;
          else if (rest.visit_notes) {
            const match = rest.visit_notes.match(/https:\/\/[^\s\n]*google[^\s\n]*\/maps[^\s\n]*/i) || rest.visit_notes.match(/https:\/\/[^\s\n]*maps\.app\.goo\.gl[^\s\n]*/i) || rest.visit_notes.match(/Google Maps:\s*(https:\/\/[^\s\n]*)/i);
            if (match && match[0]) mapUrl = match[1] || match[0];
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 1: Extrair dados do Google Maps (usando o link já salvo)
        // ═══════════════════════════════════════════════════════════════
        let mapsData: any = null;
        let activeInstagramUrl = '';
        let instagramBio = '';
        let instagramFollowers = 0;
        let logoPublicUrl = '';
        let highlightPublicUrls: string[] = [];

        if (mapUrl) {
          toast.success(`📍 PASSO 1/5: Acessando Google Maps para extrair dados oficiais...`);
          try {
            const extRes = await new Promise<any>((resolve) => {
              const chromeObj = (window as any).chrome;
              if (chromeObj && chromeObj.runtime) {
                chromeObj.runtime.sendMessage(extensionId, { action: "scrapeGoogleHours", query: rest?.name || '', mapUrl }, (response: any) => {
                  resolve(response);
                });
              } else {
                resolve({ success: false });
              }
            });
            
            if (extRes && extRes.success) {
              mapsData = extRes;
              
              // Salva horários no banco imediatamente
              if (extRes.schedule) {
                toast.success('✅ Horários encontrados no Google Maps! Salvando...');
                await supabase.from('restaurants').update({ opening_hours: extRes.schedule }).eq('id', restaurant.id);
              }
              
              // Salva endereço oficial se encontrado (com parsing em campos separados + coordenadas)
              if (extRes.address) {
                toast.success(`✅ Endereço oficial encontrado: ${extRes.address}`);
                const parsedAddr = parseGoogleMapsAddress(extRes.address);
                const addrUpdate: any = { address: parsedAddr.street };
                if (parsedAddr.number) addrUpdate.number = parsedAddr.number;
                if (parsedAddr.neighborhood) addrUpdate.neighborhood = parsedAddr.neighborhood;
                if (parsedAddr.city) addrUpdate.city = parsedAddr.city;
                if (parsedAddr.state) addrUpdate.state = parsedAddr.state;
                if (parsedAddr.cep) addrUpdate.cep = parsedAddr.cep;
                
                // Extrai coordenadas da URL do Google Maps
                let coords = extractCoordsFromUrl(mapUrl);
                if (coords) {
                  addrUpdate.latitude = coords.lat;
                  addrUpdate.longitude = coords.lng;
                  toast.success(`📍 Coordenadas extraídas do Maps: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
                } else {
                  // Fallback: geocoding via Nominatim usando o endereço completo
                  try {
                    const geocoded = await geocodeAddress(extRes.address);
                    if (geocoded) {
                      addrUpdate.latitude = geocoded.lat;
                      addrUpdate.longitude = geocoded.lon;
                      toast.success(`📍 Coordenadas obtidas via geocoding: ${geocoded.lat.toFixed(6)}, ${geocoded.lon.toFixed(6)}`);
                    }
                  } catch (geoErr) {
                    console.error('Erro no geocoding:', geoErr);
                  }
                }
                
                await supabase.from('restaurants').update(addrUpdate).eq('id', restaurant.id);
              }
              
              // Salva telefone se encontrado
              if (extRes.phone) {
                toast.success(`✅ Telefone encontrado: ${extRes.phone}`);
                await supabase.from('restaurants').update({ phone: extRes.phone }).eq('id', restaurant.id);
              }
              
              // Salva site oficial se encontrado
              if (extRes.website) {
                toast.success(`✅ Site oficial encontrado: ${extRes.website}`);
                await supabase.from('restaurants').update({ website: extRes.website }).eq('id', restaurant.id);
              }
              
              // Se encontrou Instagram no Maps, salva
              if (extRes.socialLinks && extRes.socialLinks.length > 0) {
                const instaFromMaps = extRes.socialLinks.find((s: any) => s.platform === 'instagram');
                if (instaFromMaps) {
                  toast.success(`✅ Instagram encontrado no Google Maps: ${instaFromMaps.url}`);
                  activeInstagramUrl = instaFromMaps.url;
                  // Salva no social_networks
                  const currentSocials = rest?.social_networks || [];
                  const cleanSocials = currentSocials.filter((s: any) => s && s.platform !== 'instagram');
                  cleanSocials.push({ platform: 'instagram', url: instaFromMaps.url });
                  await supabase.from('restaurants').update({ social_networks: cleanSocials, instagram: instaFromMaps.url }).eq('id', restaurant.id);
                }
              }
            } else {
              toast.error('⚠️ Não foi possível extrair dados do Google Maps. Continuando...');
            }
          } catch (err) {
            console.error('Erro ao extrair dados do Maps:', err);
            toast.error('⚠️ Erro ao acessar Google Maps. Continuando...');
          }
        } else {
          toast.error('⚠️ Link do Google Maps não encontrado no cadastro. Pulando PASSO 1.');
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 2: Busca contexto complementar no Google
        // ═══════════════════════════════════════════════════════════════
        toast.success('🔍 PASSO 2/5: Buscando contexto complementar no Google...');
        const query = `${rest?.name} ${rest?.city || ''} ${rest?.state || ''} cardapio instagram telefone`;
        
        let googleSearchResults = null;
        try {
          googleSearchResults = await new Promise((resolve) => {
            const chromeObj = (window as any).chrome;
            if (chromeObj && chromeObj.runtime) {
              chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleNative", query }, (response: any) => {
                if (response && response.success && response.results) resolve(response.results);
                else resolve(null);
              });
            } else resolve(null);
          });
        } catch(e) {}

        if (!googleSearchResults || (googleSearchResults as any[])?.length === 0) {
           toast.error('Busca nativa no Google falhou. Prosseguindo sem contexto extra...');
        } else {
           toast.success(`✅ Coletados ${(googleSearchResults as any[]).length} resultados do Google Nativo.`);
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 3: Envia para IA (Fase 5) validar e corrigir dados
        // ═══════════════════════════════════════════════════════════════
        toast.success('🤖 PASSO 3/5: Enviando para Validação IA no Servidor...');
        const fetchOptions: RequestInit = { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            googleSearchResults,
            instagramContext: instagramBio,
            instagramHighlights: highlightPublicUrls,
            mapsData: mapsData ? { address: mapsData.address, phone: mapsData.phone, website: mapsData.website, socialLinks: mapsData.socialLinks } : null
          })
        };
        
        const valRes = await fetch(`/api/local-collector/re-ai-validation?restaurant.id=${restaurant.id}&origin=${encodeURIComponent(window.location.origin)}`, fetchOptions);
        
        if (valRes.ok) {
          const valData = await valRes.json();
          if (valData.success) {
            toast.success(`✅ Validação IA concluída com Sucesso!`);
          } else {
            toast.error(`⚠️ Validação IA: ${valData.error || 'Divergência de dados.'}`);
          }
        } else {
          toast.error('⚠️ Erro no servidor ao executar Validação IA. Continuando...');
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 4: Buscar e Validar Instagram
        // ═══════════════════════════════════════════════════════════════
        // Recarrega os dados do restaurante do Supabase (pode ter sido atualizado pela IA)
        const { data: updatedRest } = await supabase.from('restaurants').select('*').eq('id', restaurant.id).single();
        const currentInsta = updatedRest?.social_networks?.find((s: any) => s && s.platform === 'instagram' && s.url)?.url || updatedRest?.instagram || activeInstagramUrl;
        
        // Valida se o Instagram é realmente uma URL válida (não "Não localizado", "ausente", etc.)
        const isValidInstagramUrl = (url: string | null | undefined): boolean => {
          if (!url || url.trim() === '') return false;
          const lower = url.toLowerCase().trim();
          const invalidValues = ['não localizado', 'nao localizado', 'não encontrado', 'nao encontrado', 'ausente', 'n/a', 'null', 'undefined', 'none', 'sem instagram', 'indisponível', 'indisponivel'];
          if (invalidValues.some(inv => lower.includes(inv))) return false;
          if (!lower.includes('instagram.com/')) return false;
          if (lower.includes('instagram.com/undefined')) return false;
          if (lower.includes('instagram.com/null')) return false;
          // Verifica se tem um username real após instagram.com/
          const match = lower.match(/instagram\.com\/([a-z0-9._]+)/);
          if (!match || match[1].length < 2) return false;
          return true;
        };
        
        if (isValidInstagramUrl(currentInsta)) {
          // Já tem Instagram cadastrado — raspa diretamente
          toast.success(`📸 PASSO 4/5: Raspando Instagram já cadastrado: ${currentInsta}...`);
          try {
            const scrapeRes = await new Promise<any>((resolve) => {
              const chromeObj = (window as any).chrome;
              chromeObj.runtime.sendMessage(extensionId, { action: "scrapeInstagram", instagramUrl: currentInsta }, (res: any) => resolve(res));
            });
            if (scrapeRes && scrapeRes.success) {
              activeInstagramUrl = currentInsta;
              instagramBio = scrapeRes.bio || '';
              instagramFollowers = scrapeRes.followers || 0;
              
              // Upload Logo
              if (scrapeRes.logoDataUrl) {
                try {
                  const blob = base64ToBlob(scrapeRes.logoDataUrl);
                  const mime = blob.type;
                  let ext = 'jpg';
                  if (mime.includes('png')) ext = 'png';
                  else if (mime.includes('webp')) ext = 'webp';
                  
                  const storagePath = `logos/${restaurant.id}_logo.${ext}`;
                  const { error: uploadError } = await supabase.storage
                    .from('restaurant-images')
                    .upload(storagePath, blob, { contentType: mime, upsert: true });
                  
                  if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                    logoPublicUrl = publicUrl;
                  }
                } catch(e) {
                  console.error('Erro ao fazer upload da logo:', e);
                }
              }

              // Upload Highlights
              if (scrapeRes.highlightImages && scrapeRes.highlightImages.length > 0) {
                toast.success(`Coletados ${scrapeRes.highlightImages.length} destaques de cardápio! Fazendo upload...`);
                for (let idx = 0; idx < scrapeRes.highlightImages.length; idx++) {
                  try {
                    const base64Str = scrapeRes.highlightImages[idx];
                    const blob = base64ToBlob(base64Str);
                    const storagePath = `highlights/${restaurant.id}/highlight_${idx}_${Date.now()}.jpg`;
                    const { error: uploadError } = await supabase.storage
                      .from('restaurant-images')
                      .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });
                    
                    if (!uploadError) {
                      const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                      highlightPublicUrls.push(publicUrl);
                    }
                  } catch(e) {
                    console.error('Erro ao subir destaque:', e);
                  }
                }
              }
              
              // Salva logo e seguidores no banco
              const updates: any = {};
              if (logoPublicUrl) updates.image_url = logoPublicUrl;
              const currentSocials = updatedRest?.social_networks || [];
              const cleanSocials = currentSocials.filter((s: any) => s && s.platform !== 'instagram');
              cleanSocials.push({ platform: 'instagram', url: activeInstagramUrl, followers: instagramFollowers });
              updates.social_networks = cleanSocials;
              updates.instagram = activeInstagramUrl;
              await supabase.from('restaurants').update(updates).eq('id', restaurant.id);
              toast.success(`✅ Instagram coletado! Logo e ${instagramFollowers} seguidores salvos.`);
            } else {
              toast.error('⚠️ Falha ao raspar perfil do Instagram.');
            }
          } catch(e) {
            console.error('Erro ao raspar Instagram:', e);
          }
        } else {
          // Sem Instagram: busca 3 candidatos no Google e envia para IA validar
          toast.success('📸 PASSO 4/5: Sem Instagram cadastrado. Buscando 3 candidatos no Google...');
          const instaQuery = `${rest?.name} ${rest?.city || 'João Pessoa'} instagram`;
          
          // Busca 3 candidatos de uma vez
          const searchResult = await new Promise<any>((resolve) => {
            const chromeObj = (window as any).chrome;
            chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleForInstagram", query: instaQuery, blocklist: [] }, (res: any) => resolve(res));
          });

          if (!searchResult || !searchResult.success || !searchResult.candidates || searchResult.candidates.length === 0) {
            toast.error('⚠️ Nenhum candidato de Instagram encontrado no Google.');
          } else {
            const candidates = searchResult.candidates;
            toast.success(`🔍 ${candidates.length} candidato(s) encontrado(s): ${candidates.join(', ')}`);
            
            // Raspa a bio de cada candidato
            const candidatesWithBio: Array<{ url: string; bio: string; followers: number; logoDataUrl?: string; highlightImages?: string[] }> = [];
            for (const candidateUrl of candidates) {
              toast.success(`Raspando perfil: ${candidateUrl}...`);
              try {
                const scrapeRes = await new Promise<any>((resolve) => {
                  const chromeObj = (window as any).chrome;
                  chromeObj.runtime.sendMessage(extensionId, { action: "scrapeInstagram", instagramUrl: candidateUrl }, (res: any) => resolve(res));
                });
                if (scrapeRes && scrapeRes.success && !scrapeRes.isLoginRequired) {
                  candidatesWithBio.push({
                    url: candidateUrl,
                    bio: scrapeRes.bio || 'Sem bio',
                    followers: scrapeRes.followers || 0,
                    logoDataUrl: scrapeRes.logoDataUrl,
                    highlightImages: scrapeRes.highlightImages
                  });
                } else {
                  toast.error(`Falha ao raspar ${candidateUrl}. Pulando...`);
                }
              } catch(e) {
                console.error('Erro ao raspar candidato:', e);
              }
            }

            if (candidatesWithBio.length === 0) {
              toast.error('⚠️ Nenhum candidato pôde ser raspado com sucesso.');
            } else {
              // Envia todos os candidatos para a IA validar qual é o correto
              toast.success(`🧠 Enviando ${candidatesWithBio.length} candidato(s) para IA validar...`);
              const valCheckOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  candidates: candidatesWithBio.map(c => ({ url: c.url, bio: c.bio, followers: c.followers })),
                  restaurantName: rest?.name || '',
                  restaurantCity: rest?.city || 'João Pessoa',
                  restaurantAddress: updatedRest?.address || rest?.address || ''
                })
              };
              const valCheckRes = await fetch(`/api/local-collector/validate-instagram?restaurant.id=${restaurant.id}`, valCheckOptions);
              
              if (valCheckRes.ok) {
                const valCheckData = await valCheckRes.json();
                if (valCheckData.success && valCheckData.isValid && valCheckData.selectedUrl) {
                  const selectedCandidate = candidatesWithBio.find(c => c.url === valCheckData.selectedUrl) || candidatesWithBio[0];
                  toast.success(`🎉 Instagram Confirmado pela IA: ${valCheckData.selectedUrl}`);
                  activeInstagramUrl = valCheckData.selectedUrl;
                  instagramBio = selectedCandidate.bio || '';
                  instagramFollowers = selectedCandidate.followers || 0;
                  
                  // Upload Logo
                  if (selectedCandidate.logoDataUrl) {
                    try {
                      const blob = base64ToBlob(selectedCandidate.logoDataUrl);
                      const mime = blob.type;
                      let ext = 'jpg';
                      if (mime.includes('png')) ext = 'png';
                      else if (mime.includes('webp')) ext = 'webp';
                      
                      const storagePath = `logos/${restaurant.id}_logo.${ext}`;
                      const { error: uploadError } = await supabase.storage
                        .from('restaurant-images')
                        .upload(storagePath, blob, { contentType: mime, upsert: true });
                      
                      if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                        logoPublicUrl = publicUrl;
                      }
                    } catch(e) {
                      console.error('Erro ao fazer upload da logo:', e);
                    }
                  }

                  // Upload Highlights
                  if (selectedCandidate.highlightImages && selectedCandidate.highlightImages.length > 0) {
                    toast.success(`Coletados ${selectedCandidate.highlightImages.length} destaques! Fazendo upload...`);
                    for (let idx = 0; idx < selectedCandidate.highlightImages.length; idx++) {
                      try {
                        const base64Str = selectedCandidate.highlightImages[idx];
                        const blob = base64ToBlob(base64Str);
                        const storagePath = `highlights/${restaurant.id}/highlight_${idx}_${Date.now()}.jpg`;
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

                  // Salva no banco
                  const updates: any = {};
                  if (logoPublicUrl) updates.image_url = logoPublicUrl;
                  const currentSocials2 = updatedRest?.social_networks || [];
                  const cleanSocials2 = currentSocials2.filter((s: any) => s && s.platform !== 'instagram');
                  cleanSocials2.push({ platform: 'instagram', url: activeInstagramUrl, followers: instagramFollowers });
                  updates.social_networks = cleanSocials2;
                  updates.instagram = activeInstagramUrl;
                  await supabase.from('restaurants').update(updates).eq('id', restaurant.id);
                  toast.success(`✅ Instagram salvo com sucesso! Logo e ${instagramFollowers} seguidores.`);
                } else {
                  toast.error(`⚠️ IA não confirmou nenhum dos candidatos como Instagram oficial.`);
                }
              } else {
                toast.error('⚠️ Erro ao validar candidatos no servidor.');
              }
            }
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 5: Extração de Cardápio (Instagram bio/destaques → Google Maps)
        // ═══════════════════════════════════════════════════════════════
        toast.success('🍽️ PASSO 5/5: Extraindo cardápio (Instagram → Google Maps)...');
        try {
          const menuResp = await fetch('/api/local-collector/extract-menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurant.id })
          });
          const menuResult = await menuResp.json();
          if (menuResult.success) {
            toast.success(`✅ Cardápio extraído com sucesso! ${menuResult.message || ''}`);
          } else {
            toast.error(`⚠️ Cardápio: ${menuResult.message || 'Nenhum item encontrado nas fontes disponíveis.'}`);
          }
        } catch (menuErr: any) {
          toast.error(`⚠️ Erro ao extrair cardápio: ${menuErr.message}`);
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 6: Finalização - Recarrega dados e notifica interface
        // ═══════════════════════════════════════════════════════════════
        toast.success('🏁 Processo concluído! Atualizando interface...');
        loadScrapedFromSupabase();
        window.dispatchEvent(new Event('local-sync-restaurants'));
        return true;
      } else if (field === 'hours' && isExtensionActive && extensionId) {
        const rest = restaurant;
        if (rest) {
          toast.success(`Buscando horários via Extensão Chrome para: ${rest.name}...`);
          const query = `${rest.name} ${rest.city || ''} João Pessoa`;
          let mapUrl = '';
          if (rest.googleMapsUrl) mapUrl = rest.googleMapsUrl;
          else if (rest.visit_notes) {
            const match = rest.visit_notes.match(/https:\/\/[^\s\n]*google[^\s\n]*\/maps[^\s\n]*/i) || rest.visit_notes.match(/https:\/\/[^\s\n]*maps\.app\.goo\.gl[^\s\n]*/i) || rest.visit_notes.match(/Google Maps:\s*(https:\/\/[^\s\n]*)/i);
            if (match && match[0]) mapUrl = match[1] || match[0];
          }
          
          try {
            const extRes = await new Promise<any>((resolve) => {
              const chromeObj = (window as any).chrome;
              if (chromeObj && chromeObj.runtime) {
                chromeObj.runtime.sendMessage(extensionId, { action: "scrapeGoogleHours", query, mapUrl }, (response: any) => {
                  resolve(response);
                });
              } else {
                resolve({ success: false, error: "Extensão não disponível." });
              }
            });
            
            if (extRes && extRes.success && extRes.schedule) {
              toast.success(`Horários encontrados no Maps! Salvando no banco de dados...`);
              const { error: updateError } = await supabase
                .from('restaurants')
                .update({ opening_hours: extRes.schedule })
                .eq('id', rest.id);
              
              if (!updateError) {
                toast.success(`Horários atualizados com sucesso!`);
                loadScrapedFromSupabase();
                window.dispatchEvent(new Event('local-sync-restaurants'));
                return true;
              } else {
                toast.error("Erro ao salvar os horários no banco de dados: " + updateError.message);
                return false;
              }
            } else {
              toast.error(`Extensão não encontrou horários no Google Maps: ${extRes?.error || 'Tente novamente.'}`);
              return false;
            }
          } catch (err) {
            console.error('Erro ao acionar extensão para horários:', err);
          }
        }
      } else if (field === 'instagram' && isExtensionActive && extensionId) {
        const rest = restaurant;
        if (rest) {
          toast.success(`Buscando Instagram para: ${rest.name}...`);
          let instagramUrl = '';
          const instaObj = rest.social_networks?.find((s: any) => s && s.platform === 'instagram' && s.url);
          if (instaObj) instagramUrl = instaObj.url;
          
          const chromeObj = (window as any).chrome;
          if (!instagramUrl) {
            const query = `${rest.name} ${rest.city || ''} instagram`;
            const searchRes = await new Promise<any>((resolve) => {
              chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleForInstagram", query }, (res) => resolve(res));
            });
            if (searchRes && searchRes.success && searchRes.url) {
              instagramUrl = searchRes.url;
            }
          }
          
          if (instagramUrl) {
            toast.success(`Instagram encontrado: ${instagramUrl}. Raspando bio...`);
            const scrapeRes = await new Promise<any>((resolve) => {
              chromeObj.runtime.sendMessage(extensionId, { action: "scrapeInstagram", instagramUrl }, (res) => resolve(res));
            });
            
            if (scrapeRes && scrapeRes.success) {
              toast.success(`Instagram raspado! Validando...`);
              const valRes = await fetch(`/api/local-collector/validate-instagram?restaurant.id=${restaurant.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instagramUrl, instagramContext: scrapeRes.bio || '' })
              });
              
              if (valRes.ok) {
                const valData = await valRes.json();
                if (valData.success && valData.isValid) {
                  toast.success(`Instagram validado! Gravando no banco...`);
                  let finalLogoUrl = null;
                  if (scrapeRes.logoDataUrl) {
                    try {
                      const base64Response = await fetch(scrapeRes.logoDataUrl);
                      const blob = await base64Response.blob();
                      const fileName = `logo_${Date.now()}.jpg`;
                      const filePath = `brands/${restaurant.id}/${fileName}`;
                      const { error: uploadError } = await supabase.storage.from('restaurant-images').upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
                      if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(filePath);
                        finalLogoUrl = publicUrl;
                      }
                    } catch(e) {}
                  }
                  
                  const updates: any = {};
                  if (finalLogoUrl) updates.image_url = finalLogoUrl;
                  
                  const newSocials = rest.social_networks ? [...rest.social_networks] : [];
                  const cleanSocials = newSocials.filter((s: any) => s && s.platform !== 'instagram');
                  cleanSocials.push({ platform: 'instagram', url: instagramUrl, followers: scrapeRes.followers });
                  updates.social_networks = cleanSocials;
                  
                  await supabase.from('restaurants').update(updates).eq('id', restaurant.id);
                  toast.success('Instagram e Logo gravados com sucesso!');
                  loadScrapedFromSupabase();
                  window.dispatchEvent(new Event('local-sync-restaurants'));
                  return true;
                } else {
                  toast.error(`Instagram rejeitado pela IA: ${valData.reason || 'Divergência.'}`);
                }
              } else {
                toast.error('Erro ao validar Instagram no servidor.');
              }
            } else {
              toast.error(`Falha ao raspar perfil do Instagram: ${scrapeRes?.error || 'Tente novamente.'}`);
            }
          } else {
            toast.error('Nenhum link de Instagram encontrado para este restaurante.');
          }
        }
        return false;