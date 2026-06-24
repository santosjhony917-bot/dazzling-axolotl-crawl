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

type ValidationTab = 'pendentes' | 'prontos' | 'sem_cardapio' | 'revisao' | 'importados';

const MENU_REVIEW_STATUSES = ['manual_required', 'blocked', 'failed', 'invalid_source'];
const MENU_NO_CARDAPIO_STATUSES = ['not_found', 'unavailable'];

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

const normalizeDedupeKey = (value: string) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const safeDecodeUrl = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
};

const extractMapsCanonicalKey = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const decoded = safeDecodeUrl(raw);
  const entityId =
    decoded.match(/!1s([^!/?&#]+)/i)?.[1] ||
    decoded.match(/\/place_id:([^/?&#]+)/i)?.[1] ||
    decoded.match(/[?&]query=place_id:([^&]+)/i)?.[1];
  if (entityId) return `maps:${normalizeDedupeKey(entityId)}`;

  const placeSlug = decoded.match(/\/maps\/place\/([^/@?]+)/i)?.[1] || '';
  const coords = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i)
    || decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (placeSlug && coords) {
    return `maps:${normalizeDedupeKey(placeSlug)}:${Number(coords[1]).toFixed(5)}:${Number(coords[2]).toFixed(5)}`;
  }

  return `url:${normalizeDedupeKey(decoded.split('?')[0] || decoded)}`;
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

const buildRestaurantDedupeKeys = (restaurant: any) => {
  const mapsUrl = extractGoogleMapsUrlFromRestaurant(restaurant);
  const name = String(restaurant?.name || '').trim();
  const address = String(restaurant?.address || '').trim();
  const keys = [
    extractMapsCanonicalKey(mapsUrl),
    mapsUrl ? `raw-url:${normalizeDedupeKey(mapsUrl)}` : '',
    name || address ? `name-address:${normalizeDedupeKey(name)}-${normalizeDedupeKey(address)}` : '',
  ].filter(Boolean);
  return Array.from(new Set(keys));
};

export default function CityValidation() {
  const { cityId } = useParams();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ValidationTab>('pendentes');
  const [isApproving, setIsApproving] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [cityScope, setCityScope] = useState<{ name: string; state: string } | null>(null);
  
  const [logs, setLogs] = useState<string[]>([
    '[SYSTEM] Módulo de Validação e Enriquecimento IA iniciado.',
    '[SYSTEM] Aguardando comandos...'
  ]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const [extensionId, setExtensionId] = useState<string | null>(() => localStorage.getItem('chrome_extension_id') || null);
  const extensionTargetId = extensionId || 'content-bridge';

  const sendExtensionMessage = (id: string, message: Record<string, any>, timeoutMs = 30000) => new Promise<any>((resolve) => {
    const chromeObj = (window as any).chrome;
    if (id !== 'content-bridge' && chromeObj?.runtime?.sendMessage) {
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
      const response = await sendExtensionMessage(id || 'content-bridge', { action: "ping" }, 5000);
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

  const updateRestaurantWithSchemaFallback = async (restaurantId: string, payload: Record<string, any>) => {
    let currentPayload = { ...payload };
    const optionalColumns = [
      'google_maps_name',
      'ai_normalized_name',
      'name_cleanup_notes',
      'google_maps_url',
      'menu_status',
      'menu_status_reason',
      'menu_last_checked_at',
    ];

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { error } = await supabase
        .from('restaurants')
        .update(currentPayload)
        .eq('id', restaurantId);

      if (!error) return;

      const message = error.message || '';
      const missingColumn = message.match(/'([^']+)'\s+column/i)?.[1] || message.match(/column\s+"([^"]+)"/i)?.[1];
      const removable = missingColumn && Object.prototype.hasOwnProperty.call(currentPayload, missingColumn)
        ? missingColumn
        : optionalColumns.find(column => Object.prototype.hasOwnProperty.call(currentPayload, column) && /schema cache|column/i.test(message));

      if (removable) {
        const { [removable]: _removed, ...nextPayload } = currentPayload;
        currentPayload = nextPayload;
        continue;
      }

      throw error;
    }
  };

  const classifyRestaurantEligibilityLocal = (restaurant: any, extra: Record<string, any> = {}) => {
    const cleanCategory = normalizeText(restaurant?.category);
    const categoryIsPlaceholder = !cleanCategory || /pendente validacao|pendente|outros|unknown|nao classificado/.test(cleanCategory);
    const text = normalizeText([
      restaurant?.name,
      categoryIsPlaceholder ? '' : restaurant?.category,
      restaurant?.description,
      restaurant?.address,
      extra.title,
      extra.name,
      extra.category,
      extra.placeType,
      extra.businessStatus,
      extra.statusText,
      extra.bio,
      extra.website,
    ].filter(Boolean).join(' | '));

    const normalizedTerm = (term: string) => normalizeText(term);
    const hasTerm = (terms: string[]) => terms.some(term => text.includes(normalizedTerm(term)));
    const hasWord = (terms: string[]) => terms.some(term => {
      const escaped = normalizedTerm(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
    });

    const hasMapsStatusEvidence = Boolean(
      extra.isPermanentlyClosed === true ||
      extra.businessStatus ||
      extra.statusText
    );
    const mapsStatusText = normalizeText([
      extra.businessStatus,
      extra.statusText,
      extra.isPermanentlyClosed === true ? 'permanentemente fechado' : '',
    ].filter(Boolean).join(' | '));

    if (
      hasMapsStatusEvidence && (
      extra.isPermanentlyClosed === true ||
      mapsStatusText.includes('permanently closed') ||
      mapsStatusText.includes('permanentemente fechado') ||
      mapsStatusText.includes('fechado permanentemente')
      )
    ) {
      return { status: 'ineligible' as const, confidence: 0.99, reason: 'Estabelecimento aparece como permanentemente fechado no Google Maps.', source: 'local_rules' };
    }

    const strongPositive = hasTerm([
      'restaurante', 'pizzaria', 'hamburgueria', 'lanchonete', 'pastelaria', 'sorveteria',
      'gelateria', 'acai', 'açaí', 'churrascaria', 'bar e restaurante', 'bar/restaurante',
      'petiscaria', 'cafeteria', 'bistro', 'bistrô', 'cantina', 'cozinha', 'esfiharia',
      'temakeria', 'sushi', 'japones', 'japonês', 'italiana', 'self service', 'self-service',
      'marmitaria', 'food truck', 'frutos do mar', 'doceria', 'confeitaria', 'buffet',
      'espetinho', 'espetos', 'lanche', 'lanches', 'burger', 'burguer', 'pizza',
    ]);

    const hardNegative = hasTerm([
      'cooperativa', 'motoboy', 'moto boy', 'entregador', 'entregadores', 'delivery de entregas',
      'logistica', 'logística', 'transportadora', 'farmacia', 'farmácia', 'drogaria',
      'barbearia', 'salao de beleza', 'salão de beleza', 'academia', 'igreja', 'clinica',
      'clínica', 'hospital', 'escola', 'oficina', 'lava jato', 'pet shop', 'agropecuaria',
      'agropecuária', 'material de construcao', 'material de construção', 'deposito',
      'depósito', 'cesta basica', 'cesta básica',
    ]);

    const retailOrLodging = hasTerm([
      'supermercado', 'hipermercado', 'atacadao', 'atacadão', 'atacarejo', 'mercado publico',
      'mercado público', 'mercearia', 'conveniencia', 'conveniência', 'posto de gasolina',
      'hotel', 'pousada', 'distribuidora', 'bebidas e conveniencia', 'bebidas e conveniência',
    ]);

    const bakeryMarket = hasTerm([
      'padaria', 'panificadora', 'panificacao', 'panificação', 'super market', 'mercadinho',
      'hortifruti', 'sacolao', 'sacolão', 'açougue', 'acougue', 'peixaria',
    ]);

    const mixedFoodBusiness = strongPositive && (retailOrLodging || bakeryMarket);
    const weakFoodCue = hasWord(['bar']) || hasTerm(['boteco', 'pub']);

    if (hardNegative && !strongPositive && !weakFoodCue) {
      return { status: 'ineligible' as const, confidence: 0.98, reason: 'Tipo de estabelecimento incompatível com restaurante/cardápio público.', source: 'local_rules' };
    }
    if ((retailOrLodging || bakeryMarket) && !strongPositive) {
      return { status: 'ineligible' as const, confidence: 0.93, reason: 'Mercado/padaria/hotel/conveniência sem sinal claro de cardápio de restaurante.', source: 'local_rules' };
    }
    if (hardNegative && weakFoodCue) {
      return { status: 'unknown' as const, confidence: 0.6, reason: 'Negócio misto com bar/pub e serviço não gastronômico; precisa confirmar no Maps/IA.', source: 'local_rules' };
    }
    if (mixedFoodBusiness) {
      return { status: 'unknown' as const, confidence: 0.62, reason: 'Negócio misto: tem comida, mas também varejo/hotel/conveniência. Precisa confirmar cardápio no Maps/IA.', source: 'local_rules' };
    }
    if (strongPositive) {
      return { status: 'eligible' as const, confidence: 0.88, reason: 'Nome/categoria indica food service elegível.', source: 'local_rules' };
    }
    if (weakFoodCue) {
      return { status: 'unknown' as const, confidence: 0.58, reason: 'Bar/boteco precisa confirmar se serve comida ou tem cardápio útil.', source: 'local_rules' };
    }
    return { status: 'unknown' as const, confidence: 0.45, reason: 'Categoria insuficiente; precisa de avaliação por IA/Google Maps.', source: 'local_rules' };
  };

  const classifyRestaurantEligibilityAI = async (restaurant: any, context: Record<string, any> = {}) => {
    const local = classifyRestaurantEligibilityLocal(restaurant, context);
    if (local.status !== 'unknown') return local;
    try {
      const response = await fetch('/api/local-collector/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: 'Você decide se um lugar deve entrar em um app de busca de restaurantes/cardápios. Responda SOMENTE JSON: {"status":"eligible|ineligible|unknown","confidence":0_a_1,"reason":"curto"}. Elegível: restaurante, lanchonete, pizzaria, bar com comida, cafeteria, doceria/confeitaria, food truck, marmitaria. Inelegível: cooperativa de motoboy, supermercado, padaria/panificadora sem restaurante, mercado, posto, farmácia, loja, serviço, hotel, academia, distribuidora e estabelecimento permanentemente fechado no Google Maps.',
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
              businessStatus: context.businessStatus || '',
              statusText: context.statusText || '',
              isPermanentlyClosed: context.isPermanentlyClosed === true,
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

  const decideRestaurantOfficialNameAI = async (restaurant: any, context: Record<string, any> = {}) => {
    const googleMapsName = String(context.googleMapsName || restaurant?.google_maps_name || restaurant?.name || '').trim();
    if (!googleMapsName) return null;

    try {
      const response = await fetch('/api/local-collector/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: [
            'Você é o árbitro de nome comercial de restaurantes para um app público.',
            'Sua tarefa é escolher o nome que o dono provavelmente cadastraria no perfil dele.',
            'Remova slogans, textos de SEO, cidade/bairro e descrições genéricas vindas do Google Maps.',
            "Exemplos: \"La Migliore - O melhor rodízio de Campina Grande\" => \"La Migliore\"; \"Brazile Pizzaria - Delivery de Pizza em Campina Grande\" => \"Brazile Pizzaria\"; \"Domino's Pizza - Campina Grande\" => \"Domino's Pizza\".",
            'Preserve palavras que façam parte do nome real. Não invente nome novo. Se estiver em dúvida, mantenha o nome do Google com confiança menor.',
            'Responda SOMENTE JSON no formato {"official_name":"...","raw_google_name":"...","confidence":0_a_1,"reason":"curto","changed":true|false}.'
          ].join(' '),
          message: JSON.stringify({
            currentName: restaurant?.name || '',
            googleMapsName,
            googleMapsTitle: context.title || '',
            googleMapsCategory: context.category || restaurant?.category || '',
            city: restaurant?.city || context.city || '',
            state: restaurant?.state || context.state || '',
            neighborhood: restaurant?.neighborhood || context.neighborhood || '',
            address: context.address || restaurant?.address || '',
            website: context.website || restaurant?.website || '',
            instagramBio: context.bio || '',
          })
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const json = String(payload.reply || '').match(/{[\s\S]*}/)?.[0] || '{}';
      const decision = JSON.parse(json);
      const officialName = String(decision.official_name || decision.nome_oficial || '').replace(/\s+/g, ' ').trim();
      const confidence = Math.max(0, Math.min(1, Number(decision.confidence || 0)));

      if (!officialName || officialName.length < 2 || confidence < 0.55) return null;

      return {
        officialName,
        rawGoogleName: String(decision.raw_google_name || googleMapsName).trim() || googleMapsName,
        confidence,
        reason: String(decision.reason || 'Nome decidido pela IA a partir do Google Maps.').trim(),
        changed: Boolean(decision.changed) || normalizeText(officialName) !== normalizeText(googleMapsName),
      };
    } catch (error: any) {
      addLog(`IA de nome oficial falhou: ${error.message || error}`);
      return null;
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
    await markDuplicateRestaurantsIneligible(restaurant, decision, phase, payload);
    addLog(`Estabelecimento removido da validação: ${restaurant.name}. Motivo: ${decision.reason}`);
  };

  const markDuplicateRestaurantsIneligible = async (restaurant: any, decision: any, phase: string, basePayload: any) => {
    const keys = buildRestaurantDedupeKeys(restaurant);
    if (!restaurant?.id || !restaurant?.city || !restaurant?.state || keys.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, google_maps_url, visit_notes, address, is_deleted')
        .eq('city', restaurant.city)
        .eq('state', restaurant.state)
        .eq('name', restaurant.name)
        .neq('id', restaurant.id)
        .limit(50);

      if (error) throw error;

      const duplicateIds = (data || [])
        .filter(row => row.is_deleted !== true)
        .filter(row => {
          const rowKeys = buildRestaurantDedupeKeys(row);
          return rowKeys.some(key => keys.includes(key));
        })
        .map(row => row.id);

      if (duplicateIds.length === 0) return;

      await supabase
        .from('restaurants')
        .update({
          is_deleted: true,
          is_published: false,
          ai_validated: false,
          ai_log: JSON.stringify({
            ...basePayload,
            phase: `${phase}_duplicate`,
            duplicateOf: restaurant.id,
            decision,
            removedAt: new Date().toISOString(),
          }),
        } as any)
        .in('id', duplicateIds);

      addLog(`Duplicados canÃ´nicos removidos junto com ${restaurant.name}: ${duplicateIds.length}.`);
    } catch (error: any) {
      addLog(`NÃ£o consegui remover duplicados automaticamente: ${error?.message || error}`);
    }
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
      let projectCity: { name: string; state: string } | null = null;
      if (cityId) {
        const { data: cityData, error: cityError } = await supabase
          .from('expansion_projects')
          .select('name, state')
          .eq('slug', cityId)
          .single();
        if (cityError) throw cityError;
        projectCity = cityData;
        setCityScope(cityData);
      }

      const pageSize = 1000;
      const rows: any[] = [];

      for (let from = 0; from < 20000; from += pageSize) {
        let query = supabase
          .from('restaurants')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        if (projectCity?.name && projectCity?.state) {
          query = query.eq('city', projectCity.name).eq('state', projectCity.state);
        }

        const { data, error } = await query;
        if (error) throw error;

        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }

      setRestaurants(rows);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const readAiLog = (restaurant: any) => {
    const raw = restaurant?.ai_log;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(String(raw));
    } catch (_) {
      return {};
    }
  };

  const getMenuStatus = (restaurant: any) => {
    const log = readAiLog(restaurant);
    return restaurant?.menu_status || log?.menu_status || (log?.status === 'menu_found' ? 'found' : '');
  };

  const getMenuStatusReason = (restaurant: any) => {
    const log = readAiLog(restaurant);
    return restaurant?.menu_status_reason || log?.reason || '';
  };

  useEffect(() => {
    fetchRestaurants();
  }, [cityId]);

  const hasStructuredMenu = (restaurant: any) => {
    if (getMenuStatus(restaurant) === 'found') return true;
    const legacyMenuUrl = restaurant?.ifood_url || restaurant?.other_url || restaurant?.external_url;
    return restaurant?.ai_validated === true && !getMenuStatus(restaurant) && Boolean(legacyMenuUrl);
  };

  const getQaState = (restaurant: any) => {
    if (restaurant?.is_deleted === true) {
      return {
        key: 'rejeitado',
        label: 'Rejeitado',
        action: 'Fora do app',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }
    if (restaurant?.is_published === true) {
      return {
        key: 'publicado',
        label: 'Publicado',
        action: 'Visível no app',
        className: 'bg-slate-900 text-white border-slate-900',
      };
    }
    if (restaurant?.ai_validated !== true) {
      return {
        key: 'pendente',
        label: 'Pendente',
        action: 'Rodar Validar IA',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    if (hasStructuredMenu(restaurant)) {
      return {
        key: 'pronto',
        label: 'Pronto p/ app',
        action: 'Pode aprovar lote',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    const menuStatus = getMenuStatus(restaurant);
    if (MENU_REVIEW_STATUSES.includes(menuStatus || '')) {
      return {
        key: 'revisao',
        label: 'Revisão humana',
        action: 'Resolver bloqueio/login/captcha',
        className: 'bg-violet-50 text-violet-700 border-violet-200',
      };
    }
    if (MENU_NO_CARDAPIO_STATUSES.includes(menuStatus || '')) {
      return {
        key: 'sem_cardapio',
        label: 'Sem cardápio',
        action: 'Não publicar; possível CRM',
        className: 'bg-orange-50 text-orange-700 border-orange-200',
      };
    }
    return {
      key: 'revisao',
      label: 'QA incompleto',
      action: 'Revalidar com extensão',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  };

  const activeRestaurants = restaurants.filter(r => r.is_deleted !== true);
  const qaStats = {
    pendentes: activeRestaurants.filter(r => getQaState(r).key === 'pendente').length,
    prontos: activeRestaurants.filter(r => getQaState(r).key === 'pronto').length,
    sem_cardapio: activeRestaurants.filter(r => getQaState(r).key === 'sem_cardapio').length,
    revisao: activeRestaurants.filter(r => getQaState(r).key === 'revisao').length,
    importados: activeRestaurants.filter(r => getQaState(r).key === 'publicado').length,
  };

  const qaTabs: { key: ValidationTab; label: string; count: number; hint: string }[] = [
    { key: 'pendentes', label: 'Pendentes Validar IA', count: qaStats.pendentes, hint: 'Coletados na Fase 1 e ainda não auditados.' },
    { key: 'prontos', label: 'Prontos p/ App', count: qaStats.prontos, hint: 'Validar IA encontrou cardápio estruturado.' },
    { key: 'sem_cardapio', label: 'Sem Cardápio', count: qaStats.sem_cardapio, hint: 'Existe no Maps, mas não achou cardápio público confiável.' },
    { key: 'revisao', label: 'Revisão Humana', count: qaStats.revisao, hint: 'Bloqueio, captcha, login, fonte inválida ou QA incompleto.' },
    { key: 'importados', label: 'Base Publicada', count: qaStats.importados, hint: 'Já visíveis no app público.' },
  ];

  const filteredRestaurants = restaurants.filter(r => {
    if (r.is_deleted === true) return false;
    const matchesSearch = (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.address && r.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.category && r.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
    if (!matchesSearch) return false;

    const qaState = getQaState(r).key;
    if (activeTab === 'pendentes') return qaState === 'pendente';
    if (activeTab === 'prontos') return qaState === 'pronto';
    if (activeTab === 'sem_cardapio') return qaState === 'sem_cardapio';
    if (activeTab === 'revisao') return qaState === 'revisao';
    if (activeTab === 'importados') return qaState === 'publicado';
    return false;
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
          let mapsData: any = null;
          const mapUrl = extractGoogleMapsUrlFromRestaurant(r);
          if (isExtensionActive && mapUrl) {
            addLog(`Lote: abrindo Google Maps pela extensão para checar status/categoria de ${r.name}.`);
            const mapsResponse = await sendExtensionMessage(extensionTargetId, {
              action: 'scrapeGoogleHours',
              query: r.name || '',
              mapUrl,
              restaurantId: r.id,
            }, 90000);
            if (mapsResponse?.success) {
              mapsData = mapsResponse;
              const mapsEligibility = await classifyRestaurantEligibilityAI(r, mapsData);
              if (mapsEligibility.status === 'ineligible' && mapsEligibility.confidence >= 0.8) {
                await markRestaurantIneligible(r, mapsEligibility, 'batch_maps_eligibility_gate');
                successCount++;
                continue;
              }
            } else {
              addLog(`Lote: Maps não retornou dados úteis para ${r.name}: ${mapsResponse?.error || 'sem detalhe'}.`);
            }
          }
          const response = await fetch(`/api/local-collector/re-ai-validation?restaurantId=${r.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mapsData ? { mapsData } : {})
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
    let finalMenuStatus: 'unknown' | 'found' | 'not_found' | 'manual_required' | 'failed' = 'unknown';
    
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

      if (isExtensionActive) {
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
          const extRes = await sendExtensionMessage(extensionTargetId, { action: "scrapeGoogleHours", query: effectiveRestaurant.name || '', mapUrl, restaurantId: restaurant.id });
          
          if (extRes && extRes.success) {
            mapsData = extRes;
            const identityUpdate: any = {};
            const mapsName = extRes.name || extRes.title || extRes.restaurantName || '';
            const mapsCategory = extRes.category || extRes.type || '';
            if (mapsName) {
              identityUpdate.google_maps_name = mapsName;
            }
            if (mapsCategory && (!restaurant.category || /restaurante|outros|pendente/i.test(String(restaurant.category)))) {
              identityUpdate.category = mapsCategory;
            }
            const officialNameDecision = await decideRestaurantOfficialNameAI(effectiveRestaurant, {
              googleMapsName: mapsName,
              title: extRes.title || mapsName,
              category: mapsCategory,
              address: extRes.address || restaurant.address || '',
              website: extRes.website || restaurant.website || '',
              city: restaurant.city,
              state: restaurant.state,
              neighborhood: restaurant.neighborhood,
            });
            if (officialNameDecision?.officialName) {
              identityUpdate.name = officialNameDecision.officialName;
              identityUpdate.ai_normalized_name = officialNameDecision.officialName;
              identityUpdate.name_cleanup_notes = `IA definiu nome oficial a partir do Google Maps: ${officialNameDecision.reason} (confiança ${Math.round(officialNameDecision.confidence * 100)}%).`;
            } else if (mapsName && (!restaurant.name || /pendente|google maps|sem nome/i.test(String(restaurant.name)))) {
              identityUpdate.name = mapsName;
              identityUpdate.name_cleanup_notes = 'IA não retornou confiança suficiente; nome do Google Maps mantido provisoriamente.';
            }
            identityUpdate.visit_notes = String(restaurant.visit_notes || '').includes(mapUrl)
              ? restaurant.visit_notes
              : `${restaurant.visit_notes || ''}\nGoogle Maps: ${mapUrl}`.trim();
            if (officialNameDecision?.changed) {
              identityUpdate.visit_notes = `${identityUpdate.visit_notes}\nNome original no Google Maps: ${officialNameDecision.rawGoogleName}\n${identityUpdate.name_cleanup_notes}`.trim();
            }
            await updateRestaurantWithSchemaFallback(restaurant.id, { ...identityUpdate, google_maps_url: mapUrl });
            effectiveRestaurant = {
              ...effectiveRestaurant,
              ...identityUpdate,
              name: identityUpdate.name || mapsName || effectiveRestaurant.name,
              category: mapsCategory || effectiveRestaurant.category,
              googleMapsUrl: mapUrl,
              google_maps_url: mapUrl
            };
            if (officialNameDecision?.officialName) {
              addLog(`IA definiu nome oficial: ${mapsName || officialNameDecision.rawGoogleName} → ${officialNameDecision.officialName} (${Math.round(officialNameDecision.confidence * 100)}%).`);
            } else if (mapsName) {
              addLog(`Nome do Maps mantido provisoriamente: ${mapsName}`);
            }
            if (mapsCategory) addLog(`Categoria oficial do Maps: ${mapsCategory}`);
            
            if (extRes.schedule && extRes.scheduleIsWeekly === true) {
              toast.success('✅ Horários encontrados no Google Maps! Salvando...');
              addLog(`Horários salvos.`);
              await supabase.from('restaurants').update({ opening_hours: extRes.schedule }).eq('id', restaurant.id);
            } else if (extRes.schedule) {
              addLog(`HorÃ¡rios parciais detectados (${extRes.scheduleDaysFound || 0}/7 dias). NÃ£o vou salvar para nÃ£o marcar dias ausentes como fechados.`);
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
          const extRes = await sendExtensionMessage(extensionTargetId, { action: "searchGoogleForInstagram", query, restaurantId: restaurant.id });
          
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
          const scrapeRes = await sendExtensionMessage(extensionTargetId, { action: "scrapeInstagram", instagramUrl: activeInstagramUrl, restaurantId: restaurant.id });

          if (scrapeRes && scrapeRes.success) {
            instagramBio = scrapeRes.bio || '';
            instagramFollowers = scrapeRes.followers || 0;
            instagramMenuCandidates = Array.isArray(scrapeRes.linkCandidates)
              ? scrapeRes.linkCandidates
              : (Array.isArray(scrapeRes.bioLinks) ? scrapeRes.bioLinks : []);
            if (instagramMenuCandidates.length > 0) {
              addLog(`Links candidatos coletados no Instagram sem navegação externa: ${instagramMenuCandidates.length}.`);
            }
            
            const socialNameDecision = await decideRestaurantOfficialNameAI(effectiveRestaurant, {
              ...(mapsData || {}),
              googleMapsName: mapsData?.name || mapsData?.title || effectiveRestaurant.google_maps_name || effectiveRestaurant.name,
              bio: instagramBio,
              website: mapsData?.website || effectiveRestaurant.website || '',
            });
            if (socialNameDecision?.officialName && normalizeText(socialNameDecision.officialName) !== normalizeText(effectiveRestaurant.name)) {
              await updateRestaurantWithSchemaFallback(restaurant.id, {
                name: socialNameDecision.officialName,
                ai_normalized_name: socialNameDecision.officialName,
                google_maps_name: socialNameDecision.rawGoogleName,
                name_cleanup_notes: `IA revisou nome oficial com Instagram: ${socialNameDecision.reason} (confiança ${Math.round(socialNameDecision.confidence * 100)}%).`,
              });
              addLog(`IA revisou nome com Instagram: ${effectiveRestaurant.name} → ${socialNameDecision.officialName} (${Math.round(socialNameDecision.confidence * 100)}%).`);
              effectiveRestaurant = { ...effectiveRestaurant, name: socialNameDecision.officialName };
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
            return sendExtensionMessage(extensionTargetId, { action, url, ...extra }, timeoutMs);
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
            if (!startUrl || !/^https?:\/\//i.test(startUrl)) return false;
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
              finalMenuStatus = 'manual_required';
              addLog(`Cardapio nao coletado automaticamente: intervencao humana necessaria (${requiresHuman.error || requiresHuman.blocker || 'bloqueio'}).`);
              toast.warning('Restaurante validado, mas o cardapio exige intervencao humana.');
            } else {
              await persistMenuStatus(restaurant, 'not_found', 'Nenhuma fonte confiavel de cardapio foi encontrada apos bio, Google, GPT navegador e imagens recentes.');
              finalMenuStatus = 'not_found';
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

          await persistMenuStatus(
            restaurant,
            'found',
            menuResult.message || 'Cardápio estruturado e persistido pelo Validar IA.',
            {
              sourceUrl: menuEvidence?.sourceUrl || learnedSourceUrl || '',
              discoveryMethod: menuEvidence?.discoveryMethod || '',
              platform: menuEvidence?.platform || '',
              audit: menuResult.audit || null,
            }
          );
          finalMenuStatus = 'found';

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
      
      if (finalMenuStatus === 'found') {
        toast.success(`${effectiveRestaurant.name || initialName} pronto para app: cardápio estruturado.`, { id: toastId });
        addLog(`Validação de ${effectiveRestaurant.name || initialName} concluída: pronto para app.`);
      } else if (finalMenuStatus === 'not_found' || finalMenuStatus === 'manual_required') {
        toast.warning(`${effectiveRestaurant.name || initialName} processado, mas ainda não publicável no app.`, { id: toastId });
        addLog(`Validação de ${effectiveRestaurant.name || initialName} concluída sem cardápio publicável (${finalMenuStatus}).`);
      } else {
        toast.success(`${effectiveRestaurant.name || initialName} validado com sucesso!`, { id: toastId });
        addLog(`Validação de ${effectiveRestaurant.name || initialName} concluída com sucesso.`);
      }
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
    if (activeTab !== 'prontos') {
      toast.info('Abra a aba "Prontos p/ App" para publicar restaurantes.');
      return;
    }
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
      if (!hasStructuredMenu(r)) return false;
      const eligibility = classifyRestaurantEligibilityLocal(r);
      return !(eligibility.status === 'ineligible' && eligibility.confidence >= 0.9);
    });
    
    if (toApprove.length === 0) {
      toast.info('Não há restaurantes prontos para publicar. O lote agora exige Validar IA + cardápio estruturado.');
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
            disabled={isApproving || activeTab !== 'prontos' || filteredRestaurants.length === 0}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md hover:-translate-y-0.5 transition-all"
          >
            {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} 
            Publicar Prontos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-indigo-500">Régua do Validar IA</p>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            {cityScope ? `${cityScope.name}/${cityScope.state}` : 'Cidade atual'}
          </h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Fase 1 só cria candidatos do Maps. O Validar IA decide elegibilidade, status do Maps,
            cardápio e se o restaurante pode ir para o app.
          </p>
        </div>
        {qaTabs.filter(tab => tab.key !== 'importados').map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-left rounded-2xl border p-4 transition-all ${
              activeTab === tab.key
                ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
            title={tab.hint}
          >
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{tab.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{tab.count}</p>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{tab.hint}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg w-fit gap-1">
        {qaTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
              activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            title={tab.hint}
          >
            {tab.label} <span className="ml-1 text-[11px] text-slate-400">{tab.count}</span>
          </button>
        ))}
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
            <h3 className="font-bold text-slate-900 text-lg mb-1">Nenhum registro nesta fila</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              {qaTabs.find(tab => tab.key === activeTab)?.hint || 'Use o Motor de Coleta ou o Validar IA para avançar esta cidade.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="font-bold text-slate-900 text-[13px]">Restaurante</TableHead>
                  <TableHead className="font-bold text-slate-900 text-[13px]">Decisão QA</TableHead>
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
                  const qaState = getQaState(r);
                  const menuReason = getMenuStatusReason(r);
                  const hasPhone = !!r.phone && r.ai_validated;
                  const hasInsta = (!!r.instagram || !!r.social_networks) && r.ai_validated;
                  const hasMenu = hasStructuredMenu(r);
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
                      <TableCell className="align-middle min-w-[170px]">
                        <Badge variant="outline" className={`${qaState.className} font-black`}>
                          {qaState.label}
                        </Badge>
                        <div className="text-[11px] text-slate-500 mt-1 max-w-[220px] truncate" title={menuReason || qaState.action}>
                          {menuReason || qaState.action}
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
