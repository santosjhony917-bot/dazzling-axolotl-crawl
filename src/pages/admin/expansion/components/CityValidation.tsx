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

const isGoogleMapsUrl = (value: string) => {
  if (!value || !/^https?:\/\//i.test(value)) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
    return (
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl' ||
      host.endsWith('google.com') && (
        pathAndQuery.includes('/maps') ||
        pathAndQuery.includes('place_id:') ||
        pathAndQuery.includes('query=') ||
        pathAndQuery.includes('search/')
      )
    );
  } catch (_) {
    return false;
  }
};

const extractGoogleMapsUrlFromRestaurant = (restaurant: any) => {
  const directCandidates = [
    restaurant?.googleMapsUrl,
    restaurant?.google_maps_url,
    restaurant?.maps_url,
    restaurant?.map_url,
    restaurant?.place_url,
    restaurant?.google_url,
    restaurant?.link_google_maps,
    restaurant?.external_url,
    restaurant?.other_url,
    restaurant?.ifood_url
  ].filter(Boolean).map(String);

  for (const candidate of directCandidates) {
    if (isGoogleMapsUrl(candidate)) return candidate;
  }

  const notes = String(restaurant?.visit_notes || '');
  const matches = notes.match(/https?:\/\/[^\s\n\r"'<>]+/gi) || [];
  const found = matches.find(isGoogleMapsUrl);
  if (found) return found;

  const labeled = notes.match(/Google Maps:\s*(https?:\/\/[^\s\n\r"'<>]+)/i);
  if (labeled?.[1] && isGoogleMapsUrl(labeled[1])) return labeled[1];

  return '';
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

  const sendExtensionMessage = (id: string, message: Record<string, any>, timeoutMs = 30000) => new Promise<any>((resolve) => {
    const chromeObj = (window as any).chrome;
    if (chromeObj?.runtime?.sendMessage) {
      try {
        chromeObj.runtime.sendMessage(id, message, (response: any) => {
          if (chromeObj.runtime.lastError) resolve({ success: false, error: chromeObj.runtime.lastError.message });
          else resolve(response || { success: false, error: 'A extensão não respondeu.' });
        });
        return;
      } catch (error: any) {
        resolve({ success: false, error: error.message });
        return;
      }
    }

    const requestId = 'ff-page-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    let settled = false;
    const finish = (value: any) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', listener);
      resolve(value);
    };
    const listener = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data || {};
      if (data.source !== 'filterfood-extension-bridge' || data.requestId !== requestId) return;
      if (data.error) finish({ success: false, error: data.error });
      else finish(data.response || { success: false, error: 'A extensão não respondeu.' });
    };
    const timer = window.setTimeout(() => finish({ success: false, error: 'Ponte da extensão não respondeu.' }), timeoutMs);
    window.addEventListener('message', listener);
    window.postMessage({ source: 'filterfood-admin-bridge', requestId, message }, '*');
  });

  useEffect(() => {
    const checkConnection = async () => {
      const id = localStorage.getItem('chrome_extension_id') || '';
      if (!id) {
        setIsExtensionActive(false);
        return;
      }
      const response = await sendExtensionMessage(id, { action: "ping" }, 5000);
      setIsExtensionActive(!!(response && response.success));
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

  const persistValidationFailure = async (restaurant: any, error: any, phase = 'validar_ia') => {
    if (!restaurant?.id) return;
    try {
      const payload = {
        pipeline: 'validar-ia-extension',
        status: 'failed',
        phase,
        error: error?.message || String(error || 'Erro desconhecido'),
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          city: restaurant.city,
          neighborhood: restaurant.neighborhood,
        },
        recentLogs: logs.slice(-80),
        failedAt: new Date().toISOString(),
      };
      await supabase
        .from('restaurants')
        .update({
          ai_validated: false,
          ai_log: JSON.stringify(payload),
        })
        .eq('id', restaurant.id);
    } catch (logError) {
      console.warn('[Validar IA] Falha ao persistir diagnóstico:', logError);
    }
  };

  const normalizeText = (value: any) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const classifyRestaurantEligibilityLocal = (restaurant: any, extra: Record<string, any> = {}) => {
    const text = normalizeText([
      restaurant?.name,
      restaurant?.category,
      restaurant?.description,
      restaurant?.address,
      extra.category,
      extra.placeType,
      extra.bio,
      extra.website,
    ].filter(Boolean).join(' | '));

    const positive = /\b(restaurante|pizzaria|hamburgueria|lanchonete|pastelaria|sorveteria|gelateria|acai|açaí|churrascaria|bar e restaurante|bar\/restaurante|petiscaria|cafeteria|bistro|bistr[oô]|cantina|cozinha|esfiharia|temakeria|sushi|japones|italiana|regional|self service|self-service|marmitaria|food truck|frutos do mar|doceria|confeitaria)\b/;
    const hardNegative = /\b(cooperativa|motoboy|moto boy|entregador|entregadores|delivery de entregas|logistica|logistica|transportadora|supermercado|hipermercado|atacadao|atacarejo|mercado publico|mercearia|conveniencia|posto de gasolina|farmacia|drogaria|barbearia|salao de beleza|hotel|pousada|academia|igreja|clinica|hospital|escola|oficina|lava jato|pet shop|agropecuaria|material de construcao|deposito|distribuidora|bebidas e conveniencia|cesta basica)\b/;
    const bakeryMarket = /\b(padaria|panificadora|panificacao|super market|supermercado|mercadinho|hortifruti|sacolao|açougue|acougue|peixaria)\b/;
    const restaurantContext = positive.test(text);

    if (hardNegative.test(text)) {
      return { status: 'ineligible' as const, confidence: 0.98, reason: 'Tipo de estabelecimento incompatível com restaurante/cardápio público.', source: 'local_rules' };
    }
    if (bakeryMarket.test(text) && !restaurantContext) {
      return { status: 'ineligible' as const, confidence: 0.93, reason: 'Padaria/mercado/similar não deve entrar na base de restaurantes.', source: 'local_rules' };
    }
    if (restaurantContext) {
      return { status: 'eligible' as const, confidence: 0.9, reason: 'Categoria/nome indica restaurante ou food service elegível.', source: 'local_rules' };
    }
    return { status: 'unknown' as const, confidence: 0.45, reason: 'Categoria insuficiente; precisa de avaliação por IA.', source: 'local_rules' };
  };

  const classifyRestaurantEligibilityAI = async (restaurant: any, context: Record<string, any> = {}) => {
    const local = classifyRestaurantEligibilityLocal(restaurant, context);
    if (local.status !== 'unknown') return local;
    try {
      const response = await fetch('/api/local-collector/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: 'Você decide se um lugar deve entrar em um app de busca de restaurantes/cardápios. Responda SOMENTE JSON: {"status":"eligible|ineligible|unknown","confidence":0_a_1,"reason":"curto"}. Elegível: restaurante, lanchonete, pizzaria, bar com comida, cafeteria, doceria/confeitaria, food truck, marmitaria. Inelegível: cooperativa de motoboy, supermercado, padaria/panificadora sem restaurante, mercado, posto, farmácia, loja, serviço, hotel, academia, distribuidora.',
          message: JSON.stringify({
            name: restaurant?.name,
            category: restaurant?.category,
            city: restaurant?.city,
            address: restaurant?.address,
            phone: restaurant?.phone,
            website: restaurant?.website || context.website || '',
            instagramBio: context.bio || '',
            googleMaps: {
              category: context.category || '',
              title: context.title || '',
              website: context.website || '',
            }
          })
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const json = String(payload.reply || '').match(/{[\s\S]*}/)?.[0] || '{}';
      const decision = JSON.parse(json);
      const status = ['eligible', 'ineligible', 'unknown'].includes(decision.status) ? decision.status : 'unknown';
      return {
        status,
        confidence: Math.max(0, Math.min(1, Number(decision.confidence || 0))),
        reason: String(decision.reason || 'Avaliação IA sem motivo.'),
        source: 'ai'
      };
    } catch (error: any) {
      return { status: 'unknown' as const, confidence: 0, reason: `Falha ao classificar elegibilidade: ${error.message || error}`, source: 'ai_error' };
    }
  };

  const markRestaurantIneligible = async (restaurant: any, decision: any, phase = 'eligibility_gate') => {
    const payload = {
      pipeline: 'validar-ia-extension',
      status: 'ineligible_removed',
      phase,
      decision,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        category: restaurant.category,
        city: restaurant.city,
        neighborhood: restaurant.neighborhood,
      },
      recentLogs: logs.slice(-80),
      removedAt: new Date().toISOString(),
    };
    await supabase
      .from('restaurants')
      .update({
        is_deleted: true,
        is_published: false,
        ai_validated: false,
        ai_log: JSON.stringify(payload),
      } as any)
      .eq('id', restaurant.id);
    addLog(`Estabelecimento removido da validação: ${restaurant.name}. Motivo: ${decision.reason}`);
  };

  const persistMenuStatus = async (
    restaurant: any,
    status: 'found' | 'not_found' | 'unavailable' | 'manual_required' | 'blocked' | 'invalid_source' | 'failed',
    reason: string,
    extra: Record<string, any> = {}
  ) => {
    const payload = {
      pipeline: 'validar-ia-extension',
      status: status === 'found' ? 'menu_found' : 'menu_not_collected',
      menu_status: status,
      reason,
      extra,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        neighborhood: restaurant.neighborhood,
      },
      recentLogs: logs.slice(-80),
      checkedAt: new Date().toISOString(),
    };
    const updateWithColumns: any = {
      ai_validated: true,
      ai_log: JSON.stringify(payload),
      menu_status: status,
      menu_status_reason: reason,
      menu_last_checked_at: new Date().toISOString(),
    };
    const result = await supabase.from('restaurants').update(updateWithColumns).eq('id', restaurant.id);
    if (!result.error) return;
    if (!/menu_status|menu_status_reason|menu_last_checked_at|schema cache|column/i.test(result.error.message || '')) throw result.error;
    await supabase
      .from('restaurants')
      .update({ ai_validated: true, ai_log: JSON.stringify(payload) })
      .eq('id', restaurant.id);
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
    if (r.is_deleted === true) return false;
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

    try {
      let successCount = 0;
      let failureCount = 0;
      for (const r of pendings) {
        addLog(`Enriquecendo ${r.name} via IA...`);
        toast.loading(`Validando ${r.name}...`);
        try {
          const eligibility = classifyRestaurantEligibilityLocal(r);
          if (eligibility.status === 'ineligible' && eligibility.confidence >= 0.9) {
            await markRestaurantIneligible(r, eligibility, 'batch_pre_validation_local_rules');
            successCount++;
            continue;
          }
          const response = await fetch(`/api/local-collector/re-ai-validation?restaurantId=${r.id}`, {
            method: 'POST'
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || data?.success === false) {
            throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
          }
          successCount++;
          addLog(`Validação em lote concluída para ${r.name}.`);
        } catch (rowErr: any) {
          failureCount++;
          addLog(`Validação em lote falhou para ${r.name}: ${rowErr.message || rowErr}`);
          await persistValidationFailure(r, rowErr, 'validacao_lote');
        }
      }
      toast.success(`Lote concluído: ${successCount} sucesso(s), ${failureCount} falha(s). Atualizando tela...`);
      addLog(`Lote de validação IA concluído: ${successCount} sucesso(s), ${failureCount} falha(s).`);
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
    const initialName = restaurant.name || 'registro vindo do Google Maps';
    let effectiveRestaurant: any = { ...restaurant };
    
    try {
      setValidatingId(restaurant.id);
      addLog(`Iniciando validação IA individual para: ${initialName}`);
      const toastId = toast.loading(`Validando ${initialName} com IA...`);
      
      const initialEligibility = classifyRestaurantEligibilityLocal(restaurant);
      if (initialEligibility.status === 'ineligible' && initialEligibility.confidence >= 0.9) {
        await markRestaurantIneligible(restaurant, initialEligibility, 'pre_validation_local_rules');
        toast.error(`${initialName} removido: não é restaurante elegível.`, { id: toastId });
        fetchRestaurants();
        return;
      }

      if (isExtensionActive && extensionId) {
        // A Fase 1 agora fornece apenas o link do Google Maps; o Validar IA descobre todo o resto.
        addLog(`Iniciando fluxo autônomo a partir do Google Maps para: ${initialName}`);
        
        const mapUrl = extractGoogleMapsUrlFromRestaurant(restaurant);
        if (!mapUrl) {
          await persistMenuStatus(restaurant, 'manual_required', 'Validar IA precisa de um link do Google Maps como entrada da Fase 1.');
          throw new Error('Link do Google Maps ausente. A nova Fase 1 deve salvar pelo menos o link do Maps no registro.');
        }

        let mapsData: any = null;
        const savedInstagram = restaurant.instagram || (Array.isArray(restaurant.social_networks) ? restaurant.social_networks.find((item: any) => item?.platform === 'instagram' && item?.url)?.url : '');
        let activeInstagramUrl = /^https?:\/\/(?:www\.)?instagram\.com\//i.test(savedInstagram || '') ? savedInstagram : '';
        let instagramBio = '';
        let instagramFollowers = 0;
        let instagramMenuCandidates: any[] = [];
        let instagramMenuImageCandidates: string[] = [];
        let googleMenuImageCandidates: any[] = [];
        let logoPublicUrl = '';
        let highlightPublicUrls: string[] = [];

        if (mapUrl) {
          toast.success(`📍 PASSO 1/5: Acessando Google Maps para extrair dados oficiais...`);
          addLog(`PASSO 1/5: Acessando Google Maps...`);
          const extRes = await sendExtensionMessage(extensionId, { action: "scrapeGoogleHours", query: effectiveRestaurant.name || '', mapUrl, restaurantId: restaurant.id });
          
          if (extRes && extRes.success) {
            mapsData = extRes;
            const identityUpdate: any = {};
            const mapsName = extRes.name || extRes.title || extRes.restaurantName || '';
            const mapsCategory = extRes.category || extRes.type || '';
            if (mapsName && (!restaurant.name || /pendente|google maps|sem nome/i.test(String(restaurant.name)))) {
              identityUpdate.name = mapsName;
            }
            if (mapsCategory && (!restaurant.category || /restaurante|outros|pendente/i.test(String(restaurant.category)))) {
              identityUpdate.category = mapsCategory;
            }
            identityUpdate.visit_notes = String(restaurant.visit_notes || '').includes(mapUrl)
              ? restaurant.visit_notes
              : `${restaurant.visit_notes || ''}\nGoogle Maps: ${mapUrl}`.trim();
            try {
              await supabase.from('restaurants').update({ ...identityUpdate, google_maps_url: mapUrl }).eq('id', restaurant.id);
            } catch (_) {
              await supabase.from('restaurants').update(identityUpdate).eq('id', restaurant.id);
            }
            effectiveRestaurant = {
              ...effectiveRestaurant,
              ...identityUpdate,
              name: mapsName || effectiveRestaurant.name,
              category: mapsCategory || effectiveRestaurant.category,
              googleMapsUrl: mapUrl,
              google_maps_url: mapUrl
            };
            if (mapsName) addLog(`Nome oficial do Maps: ${mapsName}`);
            if (mapsCategory) addLog(`Categoria oficial do Maps: ${mapsCategory}`);
            
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
              effectiveRestaurant = { ...effectiveRestaurant, ...addrUpdate };
            }
            
            if (extRes.phone) {
              toast.success(`✅ Telefone encontrado: ${extRes.phone}`);
              addLog(`Telefone salvo: ${extRes.phone}`);
              await supabase.from('restaurants').update({ phone: extRes.phone }).eq('id', restaurant.id);
              effectiveRestaurant.phone = extRes.phone;
            }
            
            if (extRes.coverImage || (extRes.galleryImages && extRes.galleryImages.length > 0)) {
              toast.success(`✅ Imagens encontradas via extensão no Google Maps!`);
              addLog(`Fotos do Google Maps extraídas via extensão.`);
              googleMenuImageCandidates = [
                ...(extRes.coverImage ? [{ image: extRes.coverImage, source: 'google_cover', dateText: extRes.coverImageDateText || '' }] : []),
                ...((extRes.galleryImages || []).map((image: string, index: number) => ({
                  image,
                  source: 'google_gallery',
                  dateText: extRes.galleryImageDates?.[index] || extRes.galleryImageMeta?.[index]?.dateText || ''
                })))
              ];
              
              const imgUpdates: any = {};
              if (extRes.coverImage) {
                imgUpdates.image_url = extRes.coverImage;
                addLog(`Capa definida a partir do Google Maps.`);
              }
              await supabase.from('restaurants').update(imgUpdates).eq('id', restaurant.id);
              
              if (extRes.galleryImages && extRes.galleryImages.length > 0) {
                addLog(`Salvando ${extRes.galleryImages.length} fotos na galeria...`);
                for (let i = 0; i < extRes.galleryImages.length; i++) {
                  await supabase.from('restaurant_gallery').insert({
                    restaurant_id: restaurant.id,
                    image_url: extRes.galleryImages[i],
                    caption: 'Google Maps',
                    order_index: i
                  });
                }
              }
            }

            if (extRes.website) {
              toast.success(`✅ Site oficial encontrado: ${extRes.website}`);
              addLog(`Website salvo: ${extRes.website}`);
              await supabase.from('restaurants').update({ website: extRes.website }).eq('id', restaurant.id);
              effectiveRestaurant.website = extRes.website;
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

        const enrichedEligibility = await classifyRestaurantEligibilityAI(effectiveRestaurant, {
          ...(mapsData || {}),
          website: mapsData?.website || effectiveRestaurant.website || '',
        });
        if (enrichedEligibility.status === 'ineligible' && enrichedEligibility.confidence >= 0.8) {
          await markRestaurantIneligible(restaurant, enrichedEligibility, 'post_maps_eligibility_gate');
          toast.error(`${effectiveRestaurant.name || initialName} removido: não é restaurante elegível.`, { id: toastId });
          fetchRestaurants();
          return;
        }

        if (!activeInstagramUrl) {
          toast.success(`🔍 PASSO 2/5: Buscando Instagram no Google usando nome e endereço...`);
          addLog(`PASSO 2/5: Buscando Instagram no Google...`);
          const query = `${effectiveRestaurant.name || ''} ${effectiveRestaurant.city || ''} instagram`;
          const extRes = await sendExtensionMessage(extensionId, { action: "searchGoogleForInstagram", query, restaurantId: restaurant.id });
          
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
          const scrapeRes = await sendExtensionMessage(extensionId, { action: "scrapeInstagram", instagramUrl: activeInstagramUrl, restaurantId: restaurant.id });

          if (scrapeRes && scrapeRes.success) {
            instagramBio = scrapeRes.bio || '';
            instagramFollowers = scrapeRes.followers || 0;
            instagramMenuCandidates = Array.isArray(scrapeRes.linkCandidates)
              ? scrapeRes.linkCandidates
              : (Array.isArray(scrapeRes.bioLinks) ? scrapeRes.bioLinks : []);
            if (instagramMenuCandidates.length > 0) {
              addLog(`Links candidatos coletados no Instagram sem navegação externa: ${instagramMenuCandidates.length}.`);
            }
            
            toast.success(`🧠 Validando Instagram com IA (Nome: ${effectiveRestaurant.name || initialName}, Bio: ${instagramBio})...`);
            addLog(`Validando Instagram com IA (Bio: ${instagramBio})...`);
            
            const socialEligibility = await classifyRestaurantEligibilityAI(effectiveRestaurant, { ...(mapsData || {}), bio: instagramBio });
            if (socialEligibility.status === 'ineligible' && socialEligibility.confidence >= 0.8) {
              await markRestaurantIneligible(restaurant, socialEligibility, 'instagram_bio_eligibility_gate');
              toast.error(`${effectiveRestaurant.name || initialName} removido: não é restaurante elegível.`, { id: toastId });
              fetchRestaurants();
              return;
            }

            const payload = {
              candidates: [{ url: activeInstagramUrl, bio: instagramBio, followers: instagramFollowers }],
              restaurantName: effectiveRestaurant.name || '',
              restaurantCity: effectiveRestaurant.city || '',
              restaurantAddress: effectiveRestaurant.address || ''
            };

            const validateRes = await fetch(`/api/local-collector/validate-instagram?restaurantId=${restaurant.id}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });

            if (validateRes.ok) {
              const valData = await validateRes.json();
              if (valData.isValid) {
                toast.success(`🎯 Instagram validado pela IA! (${valData.reason})`);
                addLog(`Instagram VALIDADO pela IA: ${valData.reason}`);
                toast.success(`🖼️ Baixando foto de perfil (Logo)...`);
                addLog(`Baixando foto de perfil (Logo)...`);
                if (scrapeRes.rawLogoUrl) {
                  const storagePath = `restaurants/${restaurant.id}/logo_${Date.now()}.jpg`;
                  try {
                    const logoRes = await fetch(`/api/local-collector/download-and-upload?url=${encodeURIComponent(scrapeRes.rawLogoUrl)}&path=${encodeURIComponent(storagePath)}`, {
                      method: 'POST'
                    });
                    if (logoRes.ok) {
                      const logoData = await logoRes.json();
                      if (logoData.success && logoData.url) {
                        logoPublicUrl = logoData.url;
                        toast.success(`✅ Logo salva com sucesso!`);
                        addLog(`Logo salva com sucesso.`);
                      } else {
                        addLog(`Erro ao salvar logo: ${logoData.error || 'sem URL'}`);
                      }
                    } else {
                      addLog(`Falha na requisição de logo: HTTP ${logoRes.status}`);
                    }
                  } catch (logoErr: any) {
                    addLog(`Erro ao baixar logo: ${logoErr.message}`);
                  }
                }

                // Coleta e Upload de Highlights (Destaques)
                if (scrapeRes.highlightImages && scrapeRes.highlightImages.length > 0) {
                  instagramMenuImageCandidates = [...instagramMenuImageCandidates, ...scrapeRes.highlightImages];
                  toast.success(`Coletando ${scrapeRes.highlightImages.length} imagens de destaque...`);
                  addLog(`Fazendo upload de ${scrapeRes.highlightImages.length} imagens de destaque...`);
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
                        
                        const storagePath = `gallery/${restaurant.id}/gallery_highlight_${Date.now()}_${i}.jpg`;
                        const { error } = await supabase.storage
                          .from('restaurant-images')
                          .upload(storagePath, blob, { upsert: true, contentType });
                        if (!error) {
                          const { data } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                          highlightPublicUrls.push(data.publicUrl);
                        } else {
                          console.error('Erro ao fazer upload do destaque no Supabase Storage:', error);
                          addLog(`Erro no upload do destaque ${i}: ${error.message}`);
                        }
                      }
                    } catch (err: any) {
                      console.error('Erro ao processar imagem de destaque:', err);
                      addLog(`Erro ao processar imagem de destaque ${i}: ${err.message}`);
                    }
                  }
                }

                // Coleta, Filtragem por IA e Upload de Feed
                if (scrapeRes.feedImages && scrapeRes.feedImages.length > 0) {
                  instagramMenuImageCandidates = [...instagramMenuImageCandidates, ...scrapeRes.feedImages];
                  toast.success(`🤖 Filtrando ${scrapeRes.feedImages.length} fotos do feed com IA...`);
                  addLog(`Enviando ${scrapeRes.feedImages.length} imagens do feed para filtragem por IA...`);
                  
                  try {
                    const filterResponse = await fetch('/api/local-collector/filter-instagram-gallery', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ images: scrapeRes.feedImages })
                    });
                    
                    if (filterResponse.ok) {
                      const filterData = await filterResponse.json();
                      if (filterData.success && filterData.filteredImages && filterData.filteredImages.length > 0) {
                        toast.success(`✅ IA aprovou ${filterData.filteredImages.length} de ${scrapeRes.feedImages.length} fotos!`);
                        addLog(`IA aprovou ${filterData.filteredImages.length} fotos de comida do feed.`);
                        
                        const feedPublicUrls: string[] = [];
                        for (let i = 0; i < filterData.filteredImages.length; i++) {
                          try {
                            const base64Str = filterData.filteredImages[i];
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
                              
                              const storagePath = `gallery/${restaurant.id}/gallery_feed_${Date.now()}_${i}.jpg`;
                              
                              const { error } = await supabase.storage
                                .from('restaurant-images')
                                .upload(storagePath, blob, { upsert: true, contentType });
                                
                              if (!error) {
                                const { data } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                                feedPublicUrls.push(data.publicUrl);
                              } else {
                                console.error('Erro ao fazer upload da imagem do feed no Supabase Storage:', error);
                                addLog(`Erro no upload da foto feed ${i}: ${error.message}`);
                              }
                            }
                          } catch (uploadErr: any) {
                            console.error(`Erro no processamento da imagem do feed index ${i}:`, uploadErr);
                            addLog(`Erro ao processar foto feed ${i}: ${uploadErr.message}`);
                          }
                        }
                        
                        // Insere as fotos aprovadas na tabela do banco
                        if (feedPublicUrls.length > 0) {
                          addLog(`Salvando ${feedPublicUrls.length} fotos aprovadas na galeria...`);
                          for (let i = 0; i < feedPublicUrls.length; i++) {
                            await supabase.from('restaurant_gallery').insert({
                              restaurant_id: restaurant.id,
                              image_url: feedPublicUrls[i],
                              caption: 'Feed do Instagram (Filtrado por IA)',
                              order_index: i + 10
                            });
                          }
                        }
                      } else {
                        addLog(`IA não aprovou nenhuma foto do feed ou erro no filtro.`);
                      }
                    } else {
                      addLog(`Erro HTTP ao chamar o endpoint de filtro de imagens: HTTP ${filterResponse.status}`);
                    }
                  } catch (filterErr: any) {
                    console.error('Erro ao filtrar/upload da galeria:', filterErr);
                    addLog(`Erro ao processar galeria do Instagram: ${filterErr.message}`);
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
          const normalizeKey = (value: string) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
          const baseName = effectiveRestaurant.name || restaurant.name || '';
          const baseCity = effectiveRestaurant.city || restaurant.city || '';
          const baseNeighborhood = effectiveRestaurant.neighborhood || restaurant.neighborhood || '';
          const baseAddress = effectiveRestaurant.address || restaurant.address || '';
          const baseWebsite = effectiveRestaurant.website || restaurant.website || mapsData?.website || '';
          const cityKey = normalizeKey(baseCity || '');
          const isSafeMenuUrl = (value: string) => {
            try {
              const host = new URL(value).hostname.toLowerCase();
              return !isGoogleMapsUrl(value) && !['instagram.com', 'threads.net', 'threads.com', 'facebook.com', 'tiktok.com', 'x.com', 'twitter.com', 'youtube.com'].some(domain => host === domain || host.endsWith('.' + domain));
            } catch (_) { return false; }
          };
          const legacyClues = [
            { url: restaurant.other_url, label: restaurant.other_url_label || 'URL antiga do cadastro', learned: false, legacy: true },
            { url: restaurant.external_url, label: 'URL externa antiga do cadastro', learned: false, legacy: true },
            { url: restaurant.ifood_url, label: 'iFood antigo do cadastro', learned: false, legacy: true },
            { url: baseWebsite, label: 'site oficial encontrado/antigo', learned: false, legacy: false }
          ].filter(candidate => /^https?:\/\//i.test(candidate.url || '') && isSafeMenuUrl(candidate.url));
          let knownCandidates: any[] = [...legacyClues];
          try {
            const websiteBase = baseWebsite ? new URL(baseWebsite).origin : '';
            if (websiteBase && isSafeMenuUrl(websiteBase)) {
              const websiteInferred = ['cardapio', 'menu', 'pedido', 'delivery', 'loja'].map(path => ({
                url: `${websiteBase}/${path}`,
                label: `Possível cardápio no site oficial: /${path}`,
                learned: false
              }));
              knownCandidates = [...knownCandidates, ...websiteInferred]
                .filter((candidate, index, list) => list.findIndex(other => other.url === candidate.url) === index);
            }
          } catch (_) {}
          try {
            const instagramUsername = activeInstagramUrl ? new URL(activeInstagramUrl).pathname.split('/').filter(Boolean)[0] : '';
            if (instagramUsername && /^[a-z0-9._-]{3,40}$/i.test(instagramUsername)) {
              const inferred = [
                { url: `https://${instagramUsername}.saipos.com/home`, label: `Cardápio ${baseCity || 'oficial'} inferido do Instagram`, learned: false },
                { url: `https://${instagramUsername}.saipos.com/`, label: `Cardápio ${baseCity || 'oficial'} inferido do Instagram`, learned: false }
              ].filter(candidate => isSafeMenuUrl(candidate.url));
              knownCandidates = [...inferred, ...knownCandidates]
                .filter((candidate, index, list) => list.findIndex(other => other.url === candidate.url) === index);
            }
          } catch (_) {}
          const trustedSource = knownCandidates.find(candidate => {
            const haystack = normalizeKey(`${candidate.label} ${candidate.url}`);
            return candidate.learned && cityKey && haystack.includes(cityKey);
          });

          const sendExtensionAction = (action: string, url: string, extra: Record<string, any> = {}, timeoutMs = 120000) => {
            if (!extensionId) return Promise.resolve({ success: false, error: 'ID da extensão ausente.' });
            return sendExtensionMessage(extensionId, { action, url, ...extra }, timeoutMs);
          };

          const validateCandidateUrl = async (sourceUrl: string, sourceLabel = '', discoveryMethod = 'textual_ai_url_selection') => {
            if (!sourceUrl || !isSafeMenuUrl(sourceUrl)) return false;
            learnedSourceUrl = sourceUrl;
            learnedSourceLabel = sourceLabel || `Cardápio ${baseCity || 'oficial'}`;
            const nativeResult = await sendExtensionAction('extractMenuPlatform', learnedSourceUrl, {}, 90000);
            menuEvidence = nativeResult?.success ? nativeResult : await sendExtensionAction('auditMenuHybrid', learnedSourceUrl, {}, 90000);
            if (menuEvidence?.success) {
              menuEvidence = { ...menuEvidence, sourceUrl: learnedSourceUrl, discoveryMethod };
              const confirmedItems = Array.isArray(menuEvidence.categories)
                ? menuEvidence.categories.reduce((total: number, category: any) => total + (category.items?.length || 0), 0)
                : Number(menuEvidence.metrics?.itemCandidates || 0);
              if (!confirmedItems || confirmedItems < 1) {
                addLog(`Fonte rejeitada: nenhum item real encontrado em ${learnedSourceUrl}.`);
                menuEvidence = null;
                return false;
              }
              addLog(`Fonte validada: ${confirmedItems} itens candidatos em ${learnedSourceUrl}.`);
              return true;
            }
            return false;
          };

          const runTextualMenuArbiter = async (candidates: any[], reason: string) => {
            const normalizeCandidateUrl = (value: string) => {
              try {
                const parsed = new URL(value);
                if (parsed.hostname.toLowerCase() === 'l.instagram.com') {
                  const target = parsed.searchParams.get('u');
                  if (target) return decodeURIComponent(target);
                }
                return parsed.href;
              } catch (_) {
                return '';
              }
            };
            const menuDomainScore = (value: string) => /saipos|livemenu|ola\.click|olaclick|anota|ifood|menudino|deliverymuch|goomer|aiqfome|cardapio|menu/i.test(value) ? 35 : 0;
            const cityTokenHit = (candidate: any) => {
              if (!cityKey) return false;
              return normalizeKey(`${candidate.label || ''} ${candidate.url || ''}`).includes(cityKey);
            };
            const cleanCandidates = (Array.isArray(candidates) ? candidates : [])
              .map((candidate: any) => {
                const url = normalizeCandidateUrl(String(candidate.url || candidate.sourceUrl || ''));
                const label = String(candidate.label || candidate.sourceLabel || candidate.title || '');
                return {
                  url,
                  label,
                  score: Number(candidate.score || 0) + menuDomainScore(`${url} ${label}`) + (cityTokenHit({ url, label }) ? 100 : 0),
                  reasons: candidate.reasons || []
                };
              })
              .filter((candidate: any) => /^https?:\/\//i.test(candidate.url) && isSafeMenuUrl(candidate.url));
            const merged = [...cleanCandidates, ...knownCandidates.map((candidate) => ({
              url: normalizeCandidateUrl(candidate.url),
              label: candidate.label || 'fonte conhecida',
              score: (candidate.learned ? 80 : 30) + menuDomainScore(`${candidate.url} ${candidate.label || ''}`) + (cityTokenHit(candidate) ? 100 : 0),
              reasons: ['known_candidate']
            }))]
              .filter((candidate, index, list) => candidate.url && list.findIndex(other => other.url === candidate.url) === index)
              .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
              .map((candidate, index) => ({ ...candidate, index }));
            if (!merged.length) return false;
            const deterministic = merged.find(candidate => cityTokenHit(candidate) && Number(candidate.score || 0) >= 100)
              || (merged.length === 1 && Number(merged[0].score || 0) >= 35 ? merged[0] : null);
            if (deterministic) {
              addLog(`Fonte candidata forte encontrada sem clicar em mÃºltiplas abas: ${deterministic.label || deterministic.url}.`);
              const ok = await validateCandidateUrl(deterministic.url, deterministic.label, 'deterministic_text_link_selection');
              if (ok) return true;
              addLog(`Fonte candidata forte nÃ£o passou na validaÃ§Ã£o: ${deterministic.url}.`);
            }
            addLog(`IA textual avaliando ${merged.length} candidato(s) de cardápio: ${reason}.`);
            try {
              const response = await fetch('/api/local-collector/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  systemContext: 'Você escolhe a URL de cardápio correta para um restaurante. Responda SOMENTE JSON: {"selected_index":numero,"confidence":0_a_1,"reason":"curto"}. Nunca escolha redes sociais. Prefira cidade/unidade correta e domínios de cardápio/delivery.',
                  message: JSON.stringify({
                    restaurantName: baseName,
                    city: baseCity || '',
                    neighborhood: baseNeighborhood || '',
                    address: baseAddress || '',
                    instagramBio,
                    candidates: merged
                  })
                })
              });
              if (!response.ok) throw new Error('HTTP ' + response.status);
              const payload = await response.json();
              const json = String(payload.reply || '').match(/{[\s\S]*}/)?.[0] || '{}';
              const decision = JSON.parse(json);
              const selected = merged.find(candidate => candidate.index === Number(decision.selected_index));
              const confidence = Number(decision.confidence || 0);
              if (selected && confidence >= 0.5) {
                addLog(`IA textual escolheu fonte: ${selected.label || selected.url} (confiança ${Math.round(confidence * 100)}%). Motivo: ${decision.reason || 'sem motivo'}.`);
                if (await validateCandidateUrl(selected.url, selected.label, 'textual_ai_url_selection')) return true;
                const alternates = merged.filter(candidate => candidate.url !== selected.url).slice(0, 3);
                for (const alternate of alternates) {
                  addLog(`Tentando fonte alternativa apÃ³s falha da escolhida: ${alternate.label || alternate.url}.`);
                  if (await validateCandidateUrl(alternate.url, alternate.label, 'textual_ai_url_selection_alternate')) return true;
                }
              }
              addLog('IA textual não teve confiança suficiente para escolher fonte.');
            } catch (error: any) {
              addLog(`IA textual falhou ao arbitrar fonte: ${error.message || error}.`);
            }
            return false;
          };

          const runGptNavigationDiscovery = async (startUrl: string, sourceLabel: string) => {
            if (!startUrl || !/^https?:\/\//i.test(startUrl) || !extensionId) return false;
            addLog(`GPT navegador tentando descobrir cardápio a partir de ${sourceLabel}...`);
            try {
              const startHost = new URL(startUrl).hostname.toLowerCase();
              const navResult = await sendExtensionAction('navigateWithAI', startUrl, {
                goal: [
                  `Encontrar a URL pública de cardápio/delivery do restaurante "${baseName}".`,
                  baseCity ? `A unidade/cidade correta é ${baseCity}.` : '',
                  baseNeighborhood ? `Bairro/endereço de referência: ${baseNeighborhood}.` : '',
                  'Se houver vários links, escolha o cardápio da unidade correta.',
                  'Se encontrar login, captcha ou bloqueio, peça intervenção humana.',
                  'Não clique em compra, pedido, pagamento, checkout ou ações destrutivas.'
                ].filter(Boolean).join(' '),
                context: {
                  restaurantName: baseName,
                  city: baseCity || '',
                  neighborhood: baseNeighborhood || '',
                  address: baseAddress || '',
                  expectedExternalDestination: true,
                  ignoredDestinationHosts: [startHost]
                },
                maxSteps: 7
              }, 150000);

              if (navResult?.requiresHuman) {
                requiresHuman = navResult;
                addLog(`GPT navegador pediu intervenção humana: ${navResult.error || navResult.blocker || 'sem motivo informado'}.`);
                return false;
              }

              const finalUrl = String(navResult?.finalUrl || '');
              if (!navResult?.success || !finalUrl || !isSafeMenuUrl(finalUrl)) {
                addLog(`GPT navegador não confirmou uma URL segura de cardápio: ${navResult?.error || finalUrl || 'sem resultado'}.`);
                return false;
              }

              addLog(`GPT navegador encontrou possível fonte: ${finalUrl}. Validando com adaptador/auditoria...`);
              const ok = await validateCandidateUrl(finalUrl, `GPT navegador: ${sourceLabel}`, 'gpt_navigation_discovery');
              if (ok) return true;

              addLog(`Fonte encontrada pelo GPT navegador não passou na validação de cardápio: ${finalUrl}.`);
              return false;
            } catch (error: any) {
              addLog(`GPT navegador falhou em ${sourceLabel}: ${error.message || error}.`);
              return false;
            }
          };

          const googlePhotoIsRecentEnough = (dateText: string) => {
            const normalized = String(dateText || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (!normalized.trim()) return false;
            if (/hoje|ontem|semana|semanas|dia|dias|mes|meses/.test(normalized) && !/\b1\s+ano|\banos\b/.test(normalized)) return true;
            const yearMatch = normalized.match(/\b(20\d{2})\b/);
            if (yearMatch) {
              const year = Number(yearMatch[1]);
              return year >= new Date().getFullYear() - 1;
            }
            return /\b1\s+ano\b/.test(normalized);
          };

          const runMenuImageExtraction = async (images: any[], source: string, discoveryMethod: string) => {
            const cleanImages = (images || [])
              .map((item: any) => typeof item === 'string' ? item : item?.image || item?.url)
              .filter((value: string, index: number, list: string[]) => /^data:image\/|^https?:\/\//i.test(value || '') && list.indexOf(value) === index)
              .slice(0, 10);
            if (!cleanImages.length) return false;

            addLog(`IA Vision analisando ${cleanImages.length} imagem(ns) candidata(s) de cardápio (${source}).`);
            try {
              const response = await fetch('/api/local-collector/extract-menu-from-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  images: cleanImages,
                  source,
                  sourceUrl: source === 'instagram_menu_image' ? activeInstagramUrl : mapUrl,
                  discoveryMethod
                })
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok || !data?.success || !data?.menuEvidence) {
                addLog(`IA Vision não confirmou cardápio em imagens (${source}): ${data?.error || `HTTP ${response.status}`}`);
                return false;
              }
              menuEvidence = data.menuEvidence;
              addLog(`Cardápio encontrado por imagem (${source}); enviando para OCR/estruturação.`);
              return true;
            } catch (error: any) {
              addLog(`Falha ao analisar imagens de cardápio (${source}): ${error.message || error}.`);
              return false;
            }
          };

          let menuEvidence: any = null;
          let learnedSourceUrl = '';
          let learnedSourceLabel = '';
          let requiresHuman: any = null;

          if (trustedSource) {
            addLog(`Usando fonte aprendida para ${baseCity || 'cidade não informada'}: ${trustedSource.url}`);
            const platformResult = await sendExtensionAction('extractMenuPlatform', trustedSource.url);
            menuEvidence = platformResult?.success ? platformResult : await sendExtensionAction('auditMenuHybrid', trustedSource.url);
            if (menuEvidence?.success) learnedSourceUrl = trustedSource.url;
          }

          if (!menuEvidence?.success && activeInstagramUrl && instagramMenuCandidates.length > 0) {
            addLog('Modo seguro anti-abas: escolhendo cardÃ¡pio a partir dos links jÃ¡ coletados do Instagram.');
            await runTextualMenuArbiter(instagramMenuCandidates, 'links coletados no scrape do Instagram');
          }

          if (!menuEvidence?.success && activeInstagramUrl && instagramMenuCandidates.length === 0) {
            addLog('Modo seguro anti-abas ativo: descoberta por clique/navegaÃ§Ã£o livre foi bloqueada para evitar abrir mÃºltiplas abas.');
          }

          // Prioridade: descoberta nativa da bio por cidade/domínio antes de gastar GPT navegador.
          if (false && !menuEvidence?.success && activeInstagramUrl && !requiresHuman) {
            addLog(`Descobrindo na bio o cardápio correspondente a ${baseCity || 'cidade cadastrada'}...`);
            const discoveryResult = await sendExtensionAction('scrapeMenuFromInstagram', activeInstagramUrl, {
              instagramUrl: activeInstagramUrl,
              restaurantName: baseName,
              city: baseCity || '',
              neighborhood: baseNeighborhood || '',
              restaurantId: restaurant.id
            }, 180000);

            if (discoveryResult?.success && (discoveryResult.parsedMenu || discoveryResult.rawText)) {
              learnedSourceUrl = discoveryResult.sourceUrl || '';
              learnedSourceLabel = discoveryResult.sourceLabel || '';
              if (!isSafeMenuUrl(learnedSourceUrl)) {
                throw new Error(`A fonte descoberta não é um destino seguro de cardápio: ${learnedSourceUrl || 'URL ausente'}`);
              }
              addLog(`Cardápio de ${baseCity || 'cidade'} selecionado na bio: ${learnedSourceLabel || learnedSourceUrl}`);
              const nativeResult = await sendExtensionAction('extractMenuPlatform', learnedSourceUrl);
              if (nativeResult?.success && Array.isArray(nativeResult.categories) && nativeResult.categories.length > 0) {
                menuEvidence = { ...nativeResult, sourceUrl: learnedSourceUrl, discoveryMethod: discoveryResult.discoveryMethod || 'instagram_bio_city_match' };
                const nativeItems = nativeResult.categories.reduce((total: number, category: any) => total + (category.items?.length || 0), 0);
                addLog(`Adaptador nativo ${nativeResult.platform} confirmou ${nativeItems} itens.`);
              } else {
                menuEvidence = {
                  success: true,
                  platform: discoveryResult.parsedMenu ? 'instagram_bio_structured' : 'instagram_bio_dom',
                  categories: discoveryResult.parsedMenu || [],
                  rawText: discoveryResult.rawText || '',
                  sourceUrl: learnedSourceUrl,
                  discoveryMethod: discoveryResult.discoveryMethod || 'instagram_bio_city_match'
                };
              }
            } else if (discoveryResult?.requiresHuman) {
              requiresHuman = discoveryResult;
              addLog(`Descoberta nativa solicitou intervenção: ${discoveryResult.error || discoveryResult.blocker || 'sem motivo informado'}.`);
            } else if (!discoveryResult?.success) {
              addLog(`Descoberta nativa não encontrou cardápio: ${discoveryResult?.error || 'sem motivo informado'}.`);
            }
          }

          if (false && !menuEvidence?.success && activeInstagramUrl) {
            addLog('Descoberta nativa completa não confirmou o cardápio; tentando descoberta rápida de links da bio...');
            const linkDiscovery = await sendExtensionAction('discoverInstagramMenuLinks', activeInstagramUrl, {
              instagramUrl: activeInstagramUrl,
              restaurantName: baseName,
              city: baseCity || '',
              neighborhood: baseNeighborhood || '',
              restaurantId: restaurant.id
            }, 45000);

            if (linkDiscovery?.success && isSafeMenuUrl(linkDiscovery.sourceUrl)) {
              learnedSourceUrl = linkDiscovery.sourceUrl;
              learnedSourceLabel = linkDiscovery.sourceLabel || `Cardápio ${baseCity || 'oficial'}`;
              addLog(`Descoberta rápida selecionou fonte: ${learnedSourceLabel || learnedSourceUrl} (confiança ${Math.round(Number(linkDiscovery.confidence || 0) * 100)}%).`);
              const nativeResult = await sendExtensionAction('extractMenuPlatform', learnedSourceUrl, {}, 90000);
              menuEvidence = nativeResult?.success ? nativeResult : await sendExtensionAction('auditMenuHybrid', learnedSourceUrl, {}, 90000);
              if (menuEvidence?.success) {
                menuEvidence = { ...menuEvidence, sourceUrl: learnedSourceUrl, discoveryMethod: 'instagram_bio_fast_link_discovery' };
                const confirmedItems = Array.isArray(menuEvidence.categories)
                  ? menuEvidence.categories.reduce((total: number, category: any) => total + (category.items?.length || 0), 0)
                  : Number(menuEvidence.metrics?.itemCandidates || 0);
                addLog(`Fonte rápida validada por adaptador/auditoria: ${confirmedItems} itens candidatos.`);
              }
            } else {
              addLog(`Descoberta rápida não confirmou fonte: ${linkDiscovery?.error || 'sem motivo informado'}.`);
              await runTextualMenuArbiter(linkDiscovery?.candidates || [], 'descoberta rápida com baixa confiança ou falha');
            }
          }

          if (!menuEvidence?.success) {
            addLog('Buscando candidatos de cardápio no Google em modo seguro (sem navegação livre).');
            const googleQuery = `${baseName || ''} ${baseCity || ''} ${baseNeighborhood || ''} cardápio delivery pedido`;
            const googleMenu = await sendExtensionAction('searchGoogleForMenu', '', { query: googleQuery, restaurantId: restaurant.id }, 60000);
            if (googleMenu?.success && Array.isArray(googleMenu.candidates) && googleMenu.candidates.length > 0) {
              addLog(`Google retornou ${googleMenu.candidates.length} candidato(s) de cardápio para avaliação.`);
              await runTextualMenuArbiter(googleMenu.candidates, 'candidatos encontrados no Google');
            } else {
              addLog(`Google não retornou candidatos úteis de cardápio: ${googleMenu?.error || 'sem motivo informado'}.`);
            }
          }

          if (!menuEvidence?.success && !requiresHuman) {
            const navigationStarts = [
              activeInstagramUrl ? { url: activeInstagramUrl, label: 'Instagram oficial' } : null,
              baseWebsite && isSafeMenuUrl(baseWebsite) ? { url: baseWebsite, label: 'site oficial' } : null,
              { url: `https://www.google.com/search?q=${encodeURIComponent(`${baseName || ''} ${baseCity || ''} ${baseNeighborhood || ''} cardápio delivery pedido`)}`, label: 'Google' }
            ].filter(Boolean) as Array<{ url: string; label: string }>;

            const triedStarts = new Set<string>();
            for (const start of navigationStarts) {
              if (triedStarts.has(start.url)) continue;
              triedStarts.add(start.url);
              if (await runGptNavigationDiscovery(start.url, start.label)) break;
              if (requiresHuman) break;
            }
          }

          if (!menuEvidence?.success && instagramMenuImageCandidates.length > 0 && !requiresHuman) {
            addLog('Nenhum link de cardápio confirmado; tentando cardápio em imagens de destaques/feed do Instagram.');
            await runMenuImageExtraction(instagramMenuImageCandidates, 'instagram_menu_image', 'instagram_highlights_or_feed_menu_image');
          }

          if (!menuEvidence?.success && googleMenuImageCandidates.length > 0 && !requiresHuman) {
            const recentGoogleImages = googleMenuImageCandidates
              .filter((item: any) => googlePhotoIsRecentEnough(item.dateText || item.date || item.age || ''))
              .map((item: any) => item.image || item.url)
              .filter(Boolean);

            if (recentGoogleImages.length > 0) {
              addLog(`Tentando cardápio em ${recentGoogleImages.length} foto(s) recente(s) do Google Maps (até 1 ano).`);
              await runMenuImageExtraction(recentGoogleImages, 'google_recent_menu_image', 'google_recent_user_photo_menu_image');
            } else {
              addLog('Fotos do Google Maps ignoradas para cardápio: nenhuma tinha data comprovada de até 1 ano.');
            }
          }

          if (!menuEvidence?.success && activeInstagramUrl && !requiresHuman) {
            const textualResolved = await runTextualMenuArbiter([], 'fontes conhecidas do restaurante');
            if (!textualResolved && !menuEvidence?.success) {
              requiresHuman = {
                error: 'Cardápio não confirmado por descoberta nativa/rápida nem por IA textual. Próximo fallback seguro deve coletar mais candidatos sem navegação livre.',
                blocker: 'safe_menu_discovery_failed'
              };
            }
          }

          if (!menuEvidence?.success) {
            if (requiresHuman) {
              await persistMenuStatus(restaurant, 'manual_required', `Intervencao necessaria: ${requiresHuman.error || requiresHuman.blocker || 'bloqueio/login/captcha'}`, { requiresHuman });
              addLog(`Cardapio nao coletado automaticamente: intervencao humana necessaria (${requiresHuman.error || requiresHuman.blocker || 'bloqueio'}).`);
              toast.warning('Restaurante validado, mas o cardapio exige intervencao humana.');
            } else {
              await persistMenuStatus(restaurant, 'not_found', 'Nenhuma fonte confiavel de cardapio foi encontrada apos bio, Google, GPT navegador e imagens recentes.');
              addLog('Restaurante validado, mas nenhum cardapio online confiavel foi encontrado.');
              toast.warning('Restaurante validado, mas sem cardapio online confiavel.');
            }
          }
          if (false && !menuEvidence?.success) {
            if (requiresHuman) {
              throw new Error(`Intervenção necessária: ${requiresHuman.error} Após o login, execute Validar IA novamente; a aba foi mantida aberta.`);
            }
            throw new Error('Nenhuma fonte confiável de cardápio foi encontrada para a cidade correta.');
          }

          if (menuEvidence?.success) {
          const response = await fetch('/api/local-collector/extract-menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantId: restaurant.id, menuEvidence })
          });
          const menuResult = await response.json();
          if (!response.ok || !menuResult.success) {
            await persistMenuStatus(restaurant, 'failed', menuResult.message || menuResult.error || 'Falha ao persistir o cardapio coletado.', { menuEvidence });
            throw new Error(menuResult.message || menuResult.error || 'Falha ao persistir o cardápio coletado.');
          }

          if (learnedSourceUrl && isSafeMenuUrl(learnedSourceUrl)) {
            await supabase.from('restaurants').update({
              other_url: learnedSourceUrl,
              other_url_label: learnedSourceLabel || `Cardápio ${baseCity || 'oficial'}`
            }).eq('id', restaurant.id);
            addLog(`Fonte aprendida e salva para as próximas execuções: ${learnedSourceUrl}`);
          }

          toast.success('✅ Cardápio extraído com sucesso!');
          addLog(`Cardápio persistido com sucesso: ${menuResult.message || 'concluído'}.`);
          }
        } catch (menuErr: any) {
          toast.error(`⚠️ Erro ao extrair cardápio: ${menuErr.message}`);
          addLog(`Erro ao extrair cardápio: ${menuErr.message}`);
          throw menuErr;
        }
      } else {
        throw new Error('Extensão inativa. Informe o ID e confirme o status Extensão Ativa antes de validar.');
      }
      
      toast.success(`${effectiveRestaurant.name || initialName} validado com sucesso!`, { id: toastId });
      addLog(`Validação de ${effectiveRestaurant.name || initialName} concluída com sucesso.`);
      fetchRestaurants();
    } catch (err: any) {
      toast.error('Erro na validação: ' + err.message);
      addLog(`Validação falhou para ${initialName}: ${err.message || err}`);
      await persistValidationFailure(restaurant, err);
    } finally {
      setValidatingId(null);
    }
  };

  const handleApproveBatch = async () => {
    // Aprova todos os pendentes filtrados atualmente na tela (para não aprovar cidades erradas acidentalmente)
    const ineligibleToRemove = filteredRestaurants
      .filter(r => r.is_published !== true && r.is_deleted !== true)
      .map(r => ({ restaurant: r, decision: classifyRestaurantEligibilityLocal(r) }))
      .filter(item => item.decision.status === 'ineligible' && item.decision.confidence >= 0.9);

    for (const item of ineligibleToRemove) {
      await markRestaurantIneligible(item.restaurant, item.decision, 'approve_batch_local_rules');
    }

    const toApprove = filteredRestaurants.filter(r => {
      if (r.is_published === true || r.is_deleted === true || r.ai_validated !== true) return false;
      const eligibility = classifyRestaurantEligibilityLocal(r);
      return !(eligibility.status === 'ineligible' && eligibility.confidence >= 0.9);
    });
    
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
      
      addLog(`Lote aprovado com sucesso. ${toApprove.length} restaurantes publicados. ${ineligibleToRemove.length} inelegiveis removidos.`);
      toast.success(`${toApprove.length} restaurantes aprovados. ${ineligibleToRemove.length} inelegiveis removidos.`);
      
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
