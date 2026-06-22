import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Sparkles, Check, AlertCircle, MapPin, Instagram, Eye, Edit, Terminal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RestaurantDetailsDialog } from '@/components/admin/RestaurantDetailsDialog';
import { geocodeAddress } from '@/services/geocoding';

const parseGoogleMapsAddress = (fullAddress: string) => {
  let street = ''; let number = ''; let neighborhood = ''; let city = ''; let state = ''; let cep = '';
  if (!fullAddress) return { street, number, neighborhood, city, state, cep };
  let working = fullAddress.trim();
  const cepMatch = working.match(/\b(\d{5}-\d{3})\b/) || working.match(/\b(\d{8})\b/);
  if (cepMatch) { cep = cepMatch[1]; working = working.replace(cepMatch[0], '').trim(); }
  working = working.replace(/[\s,]+$/, '').replace(/^[\s,]+/, '').trim();
  const stateMatch = working.match(/[\s,-]\s*([A-Z]{2})\s*$/);
  if (stateMatch) { state = stateMatch[1]; working = working.substring(0, working.lastIndexOf(stateMatch[0])).trim(); }
  working = working.replace(/[\s,-]+$/, '').replace(/^[\s,-]+/, '').trim();
  const parts = working.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    street = parts[0];
    const secondPart = parts[1];
    const hyphenIdx = secondPart.indexOf(' - ');
    if (hyphenIdx !== -1) {
      const numPart = secondPart.substring(0, hyphenIdx).trim();
      const bairroPart = secondPart.substring(hyphenIdx + 3).trim();
      if (/\d/.test(numPart) || numPart.toLowerCase() === 's/n') { number = numPart; neighborhood = bairroPart; } 
      else { street += ', ' + secondPart; }
    } else {
      if (/^\d+/.test(secondPart) || secondPart.toLowerCase() === 's/n') number = secondPart;
      else neighborhood = secondPart;
    }
    if (parts.length >= 3) {
      const thirdPart = parts.slice(2).join(', ').trim();
      const thirdHyphen = thirdPart.indexOf(' - ');
      if (thirdHyphen !== -1 && !neighborhood) { neighborhood = thirdPart.substring(0, thirdHyphen).trim(); city = thirdPart.substring(thirdHyphen + 3).trim(); } 
      else city = thirdPart;
    }
  } else if (parts.length === 2) {
    street = parts[0];
    const secondPart = parts[1];
    const hyphenIdx = secondPart.indexOf(' - ');
    if (hyphenIdx !== -1) { neighborhood = secondPart.substring(0, hyphenIdx).trim(); city = secondPart.substring(hyphenIdx + 3).trim(); } 
    else city = secondPart;
    const numInStreet = street.match(/,\s*(\d+[A-Za-z]?)\s*$/);
    if (numInStreet) { number = numInStreet[1]; street = street.substring(0, street.lastIndexOf(numInStreet[0])).trim(); }
  } else {
    const hyphenIdx = working.indexOf(' - ');
    if (hyphenIdx !== -1) { street = working.substring(0, hyphenIdx).trim(); neighborhood = working.substring(hyphenIdx + 3).trim(); } 
    else street = working;
  }
  street = street.replace(/^[\s,-]+|[\s,-]+$/g, '').trim(); number = number.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  neighborhood = neighborhood.replace(/^[\s,-]+|[\s,-]+$/g, '').trim(); city = city.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  return { street, number, neighborhood, city, state, cep };
};

const extractCoordsFromUrl = (url: string) => {
  if (!url) return null;
  const match1 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (match1) return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
  const match2 = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match2) return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
  const match3 = url.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match3) return { lat: parseFloat(match3[1]), lng: parseFloat(match3[2]) };
  return null;
};

export default function CityValidation() {
  const { cityId } = useParams();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pendentes' | 'importados'>('pendentes');
  const [isApproving, setIsApproving] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  
  const [logs, setLogs] = useState<string[]>([
    '[SYSTEM] Módulo de Validação e Enriquecimento IA iniciado.',
    '[SYSTEM] Aguardando comandos...'
  ]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const [extensionId, setExtensionId] = useState<string | null>(() => localStorage.getItem('chrome_extension_id') || null);

  useEffect(() => {
    const checkConnection = async () => {
      const id = localStorage.getItem('chrome_extension_id') || '';
      if (!id) {
        setIsExtensionActive(false);
        return;
      }
      const chromeObj = (window as any).chrome;
      if (!chromeObj || !chromeObj.runtime || !chromeObj.runtime.sendMessage) {
        setIsExtensionActive(false);
        return;
      }
      try {
        chromeObj.runtime.sendMessage(id, { action: "ping" }, (response: any) => {
          if (chromeObj.runtime.lastError) {
            setIsExtensionActive(false);
          } else {
            setIsExtensionActive(!!(response && response.success));
          }
        });
      } catch (e) {
        setIsExtensionActive(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadExtension = () => {
    const link = document.createElement('a');
    link.href = '/chrome-extension.zip';
    link.download = 'chrome-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download da extensão iniciado!");
  };

  const handleSaveExtensionId = () => {
    if (extensionId) {
      localStorage.setItem('chrome_extension_id', extensionId.trim());
      toast.success("ID da extensão salvo!");
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);
      
      if (error) throw error;
      setRestaurants(data || []);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [cityId]);

  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.address && r.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.category && r.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
    if (!matchesSearch) return false;
    
    if (activeTab === 'importados') {
      return r.is_published === true;
    } else {
      return r.is_published !== true;
    }
  });

  const handleAutoValidate = async () => {
    const pendings = filteredRestaurants.filter(r => !r.ai_validated);
    if (pendings.length === 0) {
      toast.info('Não há restaurantes pendentes de validação.');
      return;
    }

    setIsValidating(true);
    addLog(`Iniciando validação em lote de ${pendings.length} restaurantes pendentes...`);
    toast.loading(`Iniciando validação de ${pendings.length} restaurantes com IA...`);

    // Valida apenas os 3 primeiros para evitar overload em dev
    const toValidate = pendings.slice(0, 3);
    
    try {
      for (const r of toValidate) {
        addLog(`Enriquecendo ${r.name} via IA...`);
        toast.loading(`Validando ${r.name}...`);
        await fetch(`/api/local-collector/re-ai-validation?restaurantId=${r.id}`, {
          method: 'POST'
        });
      }
      toast.success('Lote de validação concluído! Atualizando tela...');
      addLog(`Lote de validação IA concluído com sucesso.`);
      // Refresh
      fetchRestaurants();
    } catch (err: any) {
      toast.error('Erro na validação: ' + err.message);
    } finally {
      setIsValidating(false);
      toast.dismiss();
    }
  };

  const handleSingleValidate = async (e: React.MouseEvent, restaurant: any) => {
    e.stopPropagation();
    if (validatingId) return;
    
    try {
      setValidatingId(restaurant.id);
      addLog(`Iniciando validação IA individual para: ${restaurant.name}`);
      const toastId = toast.loading(`Validando ${restaurant.name} com IA...`);
      
      if (isExtensionActive && extensionId) {
        // Usa a lógica de extensão original da Manus
        addLog(`Iniciando fluxo completo da extensão para: ${restaurant.name}`);
        
        let mapUrl = '';
        if (restaurant.googleMapsUrl) mapUrl = restaurant.googleMapsUrl;
        else if (restaurant.visit_notes) {
          const match = restaurant.visit_notes.match(/https:\/\/[^\s\n]*google[^\s\n]*\/maps[^\s\n]*/i) || restaurant.visit_notes.match(/https:\/\/[^\s\n]*maps\.app\.goo\.gl[^\s\n]*/i) || restaurant.visit_notes.match(/Google Maps:\s*(https:\/\/[^\s\n]*)/i);
          if (match && match[0]) mapUrl = match[1] || match[0];
        }

        let mapsData: any = null;
        let activeInstagramUrl = '';
        let instagramBio = '';
        let instagramFollowers = 0;
        let logoPublicUrl = '';
        let highlightPublicUrls: string[] = [];

        if (mapUrl) {
          toast.success(`📍 PASSO 1/5: Acessando Google Maps para extrair dados oficiais...`);
          addLog(`PASSO 1/5: Acessando Google Maps...`);
          const extRes = await new Promise<any>((resolve) => {
            const chromeObj = (window as any).chrome;
            if (chromeObj && chromeObj.runtime) {
              chromeObj.runtime.sendMessage(extensionId, { action: "scrapeGoogleHours", query: restaurant.name || '', mapUrl }, (response: any) => {
                resolve(response);
              });
            } else {
              resolve({ success: false });
            }
          });
          
          if (extRes && extRes.success) {
            mapsData = extRes;
            
            if (extRes.schedule) {
              toast.success('✅ Horários encontrados no Google Maps! Salvando...');
              addLog(`Horários salvos.`);
              await supabase.from('restaurants').update({ opening_hours: extRes.schedule }).eq('id', restaurant.id);
            }
            
            if (extRes.address) {
              toast.success(`✅ Endereço oficial encontrado: ${extRes.address}`);
              addLog(`Endereço salvo: ${extRes.address}`);
              const parsedAddr = parseGoogleMapsAddress(extRes.address);
              const addrUpdate: any = { address: parsedAddr.street };
              if (parsedAddr.number) addrUpdate.number = parsedAddr.number;
              if (parsedAddr.neighborhood) addrUpdate.neighborhood = parsedAddr.neighborhood;
              if (parsedAddr.city) addrUpdate.city = parsedAddr.city;
              if (parsedAddr.state) addrUpdate.state = parsedAddr.state;
              if (parsedAddr.cep) addrUpdate.cep = parsedAddr.cep;
              
              let coords = extractCoordsFromUrl(mapUrl);
              if (coords) {
                addrUpdate.latitude = coords.lat;
                addrUpdate.longitude = coords.lng;
              } else {
                try {
                  const geocoded = await geocodeAddress(extRes.address);
                  if (geocoded) {
                    addrUpdate.latitude = geocoded.lat;
                    addrUpdate.longitude = geocoded.lon;
                  }
                } catch (geoErr) {}
              }
              await supabase.from('restaurants').update(addrUpdate).eq('id', restaurant.id);
            }
            
            if (extRes.phone) {
              toast.success(`✅ Telefone encontrado: ${extRes.phone}`);
              addLog(`Telefone salvo: ${extRes.phone}`);
              await supabase.from('restaurants').update({ phone: extRes.phone }).eq('id', restaurant.id);
            }
            
            if (extRes.website) {
              toast.success(`✅ Site oficial encontrado: ${extRes.website}`);
              addLog(`Website salvo: ${extRes.website}`);
              await supabase.from('restaurants').update({ website: extRes.website }).eq('id', restaurant.id);
            }
            
            if (extRes.socialLinks && extRes.socialLinks.length > 0) {
              const instaFromMaps = extRes.socialLinks.find((s: any) => s.platform === 'instagram');
              if (instaFromMaps) {
                activeInstagramUrl = instaFromMaps.url;
                toast.success(`✅ Instagram encontrado no Maps: ${activeInstagramUrl}`);
                addLog(`Instagram encontrado via Maps: ${activeInstagramUrl}`);
              }
            }
          } else {
            toast.error(`Falha ao obter dados do Google Maps (a aba abriu?). Tentando seguir...`);
            addLog(`Falha ao coletar dados do Google Maps via extensão.`);
          }
        }

        if (!activeInstagramUrl) {
          toast.success(`🔍 PASSO 2/5: Buscando Instagram no Google usando nome e endereço...`);
          addLog(`PASSO 2/5: Buscando Instagram no Google...`);
          const query = `${restaurant.name} ${restaurant.city || ''} instagram`;
          const extRes = await new Promise<any>((resolve) => {
            const chromeObj = (window as any).chrome;
            if (chromeObj && chromeObj.runtime) {
              chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleForInstagram", query }, (response: any) => {
                resolve(response);
              });
            } else {
              resolve({ success: false });
            }
          });
          
          if (extRes && extRes.success && extRes.url) {
            activeInstagramUrl = extRes.url;
            toast.success(`✅ Instagram provável encontrado: ${activeInstagramUrl}`);
            addLog(`Instagram encontrado no Google: ${activeInstagramUrl}`);
          } else {
            toast.error(`Nenhum Instagram encontrado via Google. ${extRes?.error || ''}`);
            addLog(`Nenhum Instagram encontrado via Google.`);
          }
        }

        if (activeInstagramUrl) {
          toast.success(`📸 PASSO 3/5: Coletando perfil e verificando relevância do Instagram...`);
          addLog(`PASSO 3/5: Verificando Instagram: ${activeInstagramUrl}`);
          const scrapeRes = await new Promise<any>((resolve) => {
            const chromeObj = (window as any).chrome;
            if (chromeObj && chromeObj.runtime) {
              chromeObj.runtime.sendMessage(extensionId, { action: "scrapeInstagram", instagramUrl: activeInstagramUrl }, (response: any) => {
                resolve(response);
              });
            } else {
              resolve({ success: false });
            }
          });

          if (scrapeRes && scrapeRes.success) {
            instagramBio = scrapeRes.bio || '';
            instagramFollowers = scrapeRes.followers || 0;
            
            toast.success(`🧠 Validando Instagram com IA (Nome: ${restaurant.name}, Bio: ${instagramBio})...`);
            addLog(`Validando Instagram com IA (Bio: ${instagramBio})...`);
            
            const payload = {
              candidates: [{ url: activeInstagramUrl, bio: instagramBio, followers: instagramFollowers }],
              restaurantName: restaurant.name,
              restaurantCity: restaurant.city || '',
              restaurantAddress: restaurant.address || ''
            };

            const validateRes = await fetch(`/api/local-collector/validate-instagram?restaurantId=${restaurant.id}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });

            if (validateRes.ok) {
              const valData = await validateRes.json();
              if (valData.isValid) {
                toast.success(`🎯 Instagram validado pela IA! (${valData.reason})`);
                addLog(`Instagram VALIDADO pela IA: ${valData.reason}`);
                
                toast.success(`🖼️ PASSO 4/5: Baixando foto de perfil (Logo)...`);
                addLog(`PASSO 4/5: Coleta de Logo...`);
                if (scrapeRes.rawLogoUrl) {
                  const storagePath = `restaurants/${restaurant.id}/logo_${Date.now()}.jpg`;
                  const logoRes = await fetch(`/api/local-collector/download-and-upload?url=${encodeURIComponent(scrapeRes.rawLogoUrl)}&path=${encodeURIComponent(storagePath)}`, {
                    method: 'POST'
                  });
                  if (logoRes.ok) {
                    const logoData = await logoRes.json();
                    if (logoData.success && logoData.url) {
                      logoPublicUrl = logoData.url;
                      toast.success(`✅ Logo salva com sucesso!`);
                      addLog(`Logo salva com sucesso.`);
                    }
                  }
                }
                
                if (scrapeRes.highlightImages && scrapeRes.highlightImages.length > 0) {
                  toast.success(`Coletando ${scrapeRes.highlightImages.length} imagens de destaque...`);
                  for (let i = 0; i < Math.min(scrapeRes.highlightImages.length, 3); i++) {
                    try {
                      const base64Str = scrapeRes.highlightImages[i];
                      const match = base64Str.match(/^data:([^;]+);base64,(.+)$/);
                      if (match) {
                        const contentType = match[1];
                        const b64Data = match[2];
                        const byteString = atob(b64Data);
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let j = 0; j < byteString.length; j++) {
                          ia[j] = byteString.charCodeAt(j);
                        }
                        const blob = new Blob([ab], { type: contentType });
                        
                        const storagePath = `restaurants/${restaurant.id}/gallery_${Date.now()}_${i}.jpg`;
                        const { error } = await supabase.storage.from('restaurants_assets').upload(storagePath, blob, { upsert: true, contentType });
                        if (!error) {
                          const { data } = supabase.storage.from('restaurants_assets').getPublicUrl(storagePath);
                          highlightPublicUrls.push(data.publicUrl);
                        }
                      }
                    } catch (err) {
                      console.error('Erro ao fazer upload da imagem de destaque', err);
                    }
                  }
                }

                toast.success(`💾 Salvando Instagram e ativando flag 'ai_validated'...`);
                addLog(`Salvando flag ai_validated no banco...`);
                const updates: any = { ai_validated: true };
                if (logoPublicUrl) updates.image_url = logoPublicUrl;
                
                const { data: updatedRest } = await supabase.from('restaurants').select('social_networks').eq('id', restaurant.id).single();
                const currentSocials = updatedRest?.social_networks || [];
                const cleanSocials = (Array.isArray(currentSocials) ? currentSocials : []).filter((s: any) => s && s.platform !== 'instagram');
                cleanSocials.push({ platform: 'instagram', url: activeInstagramUrl, followers: instagramFollowers });
                updates.social_networks = cleanSocials;
                updates.instagram = activeInstagramUrl;
                
                await supabase.from('restaurants').update(updates).eq('id', restaurant.id);
                
                if (highlightPublicUrls.length > 0) {
                  addLog(`Salvando ${highlightPublicUrls.length} imagens na galeria...`);
                  for (let i = 0; i < highlightPublicUrls.length; i++) {
                    await supabase.from('restaurant_gallery').insert({
                      restaurant_id: restaurant.id,
                      image_url: highlightPublicUrls[i],
                      caption: 'Destaque do Instagram',
                      order_index: i
                    });
                  }
                }
                
                toast.success(`✅ Instagram coletado! Logo e ${instagramFollowers} seguidores salvos.`);
                addLog(`Finalizado. Instagram salvo.`);
              } else {
                toast.error(`Instagram rejeitado pela IA: ${valData.reason || 'Divergência.'}`);
                addLog(`Instagram REJEITADO: ${valData.reason}`);
                await supabase.from('restaurants').update({ ai_validated: true }).eq('id', restaurant.id);
              }
            } else {
              toast.error('Erro ao validar Instagram no servidor.');
            }
          } else {
            toast.error(`Falha ao raspar perfil do Instagram: ${scrapeRes?.error || 'Tente novamente.'}`);
          }
        } else {
          toast.error('Nenhum link de Instagram encontrado para este restaurante.');
          await supabase.from('restaurants').update({ ai_validated: true }).eq('id', restaurant.id);
        }
        
        toast.success(`🔎 PASSO 5/5: Extraindo cardápio (Instagram → Google Maps)...`);
        addLog(`PASSO 5/5: Iniciando extração de cardápio...`);
        try {
          let extensionRes: any = null;
          if (isExtensionActive && extensionId && activeInstagramUrl) {
            addLog(`Usando Extensão do Chrome para navegar Linktree/Cardápio...`);
            extensionRes = await new Promise((resolve) => {
              const chromeObj = (window as any).chrome;
              if (chromeObj && chromeObj.runtime && chromeObj.runtime.connect) {
                try {
                  const port = chromeObj.runtime.connect(extensionId, { name: "scrapeMenuFromInstagramPort" });
                  port.onMessage.addListener((response: any) => {
                    addLog(`[DEBUG] Resposta da extensão via port: ${JSON.stringify(response)}`);
                    resolve(response);
                    port.disconnect();
                  });
                  port.onDisconnect.addListener(() => {
                    const err = chromeObj.runtime.lastError;
                    if (err) {
                      addLog(`[DEBUG] Port disconnected with error: ${err.message}`);
                      console.error("Port Disconnect Error:", err);
                    }
                    resolve({ success: false, error: err ? err.message : "Port disconnected" });
                  });
                  port.postMessage({ 
                    action: "scrapeMenuFromInstagram", 
                    instagramUrl: activeInstagramUrl, 
                    restaurantName: restaurant.name,
                    city: restaurant.city || '',
                    neighborhood: restaurant.neighborhood || ''
                  });
                } catch (e: any) {
                  addLog(`[DEBUG] Falha ao conectar/enviar via port: ${e.message}`);
                  resolve({ success: false, error: e.message });
                }
              } else { resolve({ success: false }); }
            });
          }

          if (extensionRes && extensionRes.success && (extensionRes.parsedMenu || extensionRes.rawText)) {
            addLog(`Extensão obteve os dados brutos. Estruturando com OpenAI via API Local...`);
            const fetchPayload: any = { restaurantId: restaurant.id };
            if (extensionRes.parsedMenu) fetchPayload.parsedMenu = extensionRes.parsedMenu;
            if (extensionRes.rawText) fetchPayload.rawText = extensionRes.rawText;
            
            const res = await fetch(`/api/local-collector/re-scrape-menu?restaurantId=${restaurant.id}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fetchPayload)
            });
            const menuResult = await res.json();
            if (menuResult.success) {
              toast.success(`✅ Cardápio extraído com sucesso!`);
              addLog(`Cardápio extraído com sucesso via Extensão e OpenAI.`);
            } else {
               addLog(`Aviso (Cardápio): Falha na estruturação final: ${menuResult.error || 'Nenhum item.'}`);
            }
          } else {
            addLog(`Fallback: Buscando cardápio via API local (Puppeteer)...`);
            const menuResp = await fetch('/api/local-collector/extract-menu', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ restaurantId: restaurant.id })
            });
            const menuResult = await menuResp.json();
            if (menuResult.success) {
              toast.success(`✅ Cardápio extraído com sucesso! ${menuResult.message || ''}`);
              addLog(`Cardápio extraído com sucesso: ${menuResult.message || ''}`);
            } else {
              toast.error(`⚠️ Cardápio: ${menuResult.message || 'Nenhum item encontrado.'}`);
              addLog(`Aviso (Cardápio): ${menuResult.message || 'Nenhum item encontrado.'}`);
            }
          }
        } catch (menuErr: any) {
          toast.error(`⚠️ Erro ao extrair cardápio: ${menuErr.message}`);
          addLog(`Erro ao extrair cardápio: ${menuErr.message}`);
        }
      } else {
        // Fallback for API
        const response = await fetch(`/api/local-collector/re-ai-validation?restaurantId=${restaurant.id}`, {
          method: 'POST'
        });
        
        if (!response.ok) throw new Error('Falha na resposta do servidor');
      }
      
      toast.success(`${restaurant.name} validado com sucesso!`, { id: toastId });
      addLog(`Validação de ${restaurant.name} concluída com sucesso.`);
      fetchRestaurants();
    } catch (err: any) {
      toast.error('Erro na validação: ' + err.message);
    } finally {
      setValidatingId(null);
    }
  };

  const handleApproveBatch = async () => {
    // Aprova todos os pendentes filtrados atualmente na tela (para não aprovar cidades erradas acidentalmente)
    const toApprove = filteredRestaurants.filter(r => r.is_published !== true);
    
    if (toApprove.length === 0) {
      toast.info('Não há restaurantes na lista atual para aprovar.');
      return;
    }

    try {
      setIsApproving(true);
      addLog(`Aprovando lote de ${toApprove.length} restaurantes...`);
      toast.loading(`Aprovando ${toApprove.length} restaurantes...`);
      
      const ids = toApprove.map(r => r.id);
      const { error } = await supabase
        .from('restaurants')
        .update({ is_published: true })
        .in('id', ids);

      if (error) throw error;
      
      addLog(`Lote aprovado com sucesso. ${toApprove.length} restaurantes publicados.`);
      toast.success(`${toApprove.length} restaurantes aprovados e importados!`);
      
      // Refresh
      const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false }).limit(5000);
      setRestaurants(data || []);
      
    } catch (err: any) {
      toast.error('Erro ao aprovar lote: ' + err.message);
    } finally {
      setIsApproving(false);
      toast.dismiss();
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Validação de Dados (QA)</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Inspeção visual e enriquecimento automatizado antes do CRM.</p>
        </div>
        <div className="flex items-center gap-2">
            {!isExtensionActive && (
              <div className="flex items-center gap-2 mr-2">
                <Input 
                  placeholder="ID da Extensão" 
                  value={extensionId || ''} 
                  onChange={e => setExtensionId(e.target.value)}
                  className="w-40 h-10 text-xs"
                />
                <Button variant="secondary" className="h-10 text-xs" onClick={handleSaveExtensionId}>
                  Salvar ID
                </Button>
              </div>
            )}
            {isExtensionActive ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm h-10">
                <Check className="w-4 h-4 mr-1.5" />
                Extensão Ativa
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 shadow-sm h-10">
                <AlertCircle className="w-4 h-4 mr-1.5" />
                Extensão Inativa
              </Badge>
            )}
            <Button variant="outline" className="h-10 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={handleDownloadExtension}>
              Baixar Extensão (ZIP)
            </Button>
          <Button 
            onClick={handleAutoValidate}
            disabled={isValidating}
            variant="outline" 
            className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 font-bold shadow-sm transition-all"
          >
            {isValidating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} 
            {isValidating ? 'Validando...' : 'Auto-Validar IA'}
          </Button>
          <Button 
            onClick={handleApproveBatch}
            disabled={isApproving || activeTab === 'importados' || filteredRestaurants.length === 0}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md hover:-translate-y-0.5 transition-all"
          >
            {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} 
            Lote Aprovado
          </Button>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
        <button 
          onClick={() => setActiveTab('pendentes')}
          className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'pendentes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Novos Encontrados (Pendentes)
        </button>
        <button 
          onClick={() => setActiveTab('importados')}
          className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'importados' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Base Importada (Lote Aprovado)
        </button>
      </div>

      {/* Terminal de Logs */}
      <div className="mb-6">
        <div className="border-slate-800 shadow-xl shadow-slate-900/20 rounded-2xl overflow-hidden bg-slate-950 text-slate-300 flex flex-col h-[200px]">
          <div className="p-3 border-b border-slate-800/60 bg-[#0A0D14] flex justify-between items-center px-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5 mr-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
              </div>
              <Terminal className="w-4 h-4 text-slate-500" />
              <h3 className="font-mono text-xs font-bold text-slate-400 tracking-wide">bash / qa-logs</h3>
            </div>
          </div>
          <div className="p-4 overflow-y-auto font-mono text-[13px] leading-relaxed flex-1 space-y-1.5 custom-scrollbar">
            {logs.map((log, index) => {
              const timeMatch = log.match(/^(\[\d{2}:\d{2}:\d{2}\])/);
              const timeStr = timeMatch ? timeMatch[1] : '';
              const msgStr = timeMatch ? log.substring(timeStr.length) : log;
              
              return (
                <div key={index} className="text-slate-300">
                  <span className="text-slate-500 mr-2">{timeStr}</span>
                  {msgStr}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por nome, categoria ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider bg-slate-200/50 px-3 py-1.5 rounded-md">
            {filteredRestaurants.length} registros
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
            <p className="text-slate-500 font-medium">Buscando dados no servidor...</p>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Nenhum dado pendente</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Volte ao Motor de Coleta para varrer novos estabelecimentos para esta cidade.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="font-bold text-slate-900 text-[13px]">Restaurante</TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-[13px]">Telefone</TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-[13px]">Instagram</TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-[13px]">Cardápio</TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-[13px]">Galeria</TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-[13px]">Horário</TableHead>
                  <TableHead className="text-right font-bold text-slate-900 text-[13px]">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRestaurants.map((r) => {
                  const hasPhone = !!r.phone && r.ai_validated;
                  const hasInsta = (!!r.instagram || !!r.social_networks) && r.ai_validated;
                  const hasMenu = (!!r.ifood_url || !!r.other_url || !!r.external_url) && r.ai_validated;
                  const hasGallery = (!!r.image_url || !!r.cover_image_url) && r.ai_validated;
                  const hasHours = !!r.opening_hours && r.ai_validated;
                  
                  const StatusDot = ({ active }: { active: boolean }) => (
                    <div className={`w-3.5 h-3.5 rounded-full mx-auto shadow-sm transition-colors duration-500 ${active ? 'bg-emerald-400 ring-2 ring-emerald-50' : 'bg-rose-500 ring-2 ring-rose-50'}`} title={active ? 'Extraído e validado pela IA' : 'Pendente de validação ou não encontrado'} />
                  );

                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/80 cursor-pointer group transition-colors">
                      <TableCell className="align-middle">
                        <div className="font-medium text-slate-900 text-[14px] group-hover:text-indigo-600 transition-colors">{r.name}</div>
                        <div className="flex items-center text-[12px] text-slate-500 mt-1">
                          <span className="truncate max-w-[280px]">{r.address || 'Endereço não disponível'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <StatusDot active={hasPhone} />
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <StatusDot active={hasInsta} />
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <StatusDot active={hasMenu} />
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <StatusDot active={hasGallery} />
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <StatusDot active={hasHours} />
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => handleSingleValidate(e, r)}
                              disabled={validatingId === r.id}
                              className="h-8 px-3 text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              {validatingId === r.id ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Validar IA
                            </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRestaurant(r);
                              setIsDialogOpen(true);
                            }}
                            className="h-8 px-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" /> Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selectedRestaurant && (
        <RestaurantDetailsDialog
          restaurant={selectedRestaurant}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSyncSuccess={() => {
            fetchRestaurants();
          }}
        />
      )}
    </div>
  );
}
