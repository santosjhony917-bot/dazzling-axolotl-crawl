import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Map, StopCircle, Terminal, Activity, Store, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import {
  getCommercialPoleNeighborhoodCount,
  getExpansionSearchZones,
  getCityZoneCount,
  MAPS_COLLECTION_ALL_NEIGHBORHOOD_TERMS,
  MAPS_COLLECTION_CITY_ZONE_TERMS,
  MAPS_COLLECTION_COMMERCIAL_POLE_TERMS,
  MAPS_RESULTS_PER_SEARCH,
  normalizeExpansionKey,
  resolveExpansionNeighborhoods,
} from '@/utils/expansionCollection';
import { normalizeRestaurantDisplayName } from '@/utils/formatters';

type MapsLead = {
  name?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  googleMapsUrl?: string;
};

type SearchQueryPlan = {
  query: string;
  neighborhood: string;
  term: string;
  label: string;
  coverage: 'all_neighborhoods' | 'commercial_poles' | 'city_zones';
};

const learnedMissingRestaurantColumns = new Set<string>();
const warnedMissingRestaurantColumns = new Set<string>();
const FIXED_EXTENSION_ID = 'kehbedmdplkodjgfiohgnebicblmhghe';
const REQUIRED_EXTENSION_VERSION = '1.10.30';

const compareVersions = (current = '', required = '') => {
  const currentParts = String(current || '').split('.').map(part => Number(part) || 0);
  const requiredParts = String(required || '').split('.').map(part => Number(part) || 0);
  const length = Math.max(currentParts.length, requiredParts.length);
  for (let index = 0; index < length; index += 1) {
    const currentValue = currentParts[index] || 0;
    const requiredValue = requiredParts[index] || 0;
    if (currentValue > requiredValue) return 1;
    if (currentValue < requiredValue) return -1;
  }
  return 0;
};

const isCompatibleExtensionPing = (response: any) => {
  if (!response?.success) return false;
  const versionOk = compareVersions(response.version || '0.0.0', REQUIRED_EXTENSION_VERSION) >= 0;
  const capabilities = response.capabilities || {};
  return versionOk && capabilities.nativePlatformAdapters !== false;
};

function normalizeKey(value: string) {
  return normalizeExpansionKey(value);
}

function safeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

function extractMapsCanonicalKey(value: string) {
  const raw = safeText(value);
  if (!raw) return '';
  const decoded = safeDecode(raw);
  const entityId =
    decoded.match(/!1s([^!/?&#]+)/i)?.[1] ||
    decoded.match(/\/place_id:([^/?&#]+)/i)?.[1] ||
    decoded.match(/[?&]query=place_id:([^&]+)/i)?.[1];
  if (entityId) return `maps:${normalizeKey(entityId)}`;

  const placeSlug = decoded.match(/\/maps\/place\/([^/@?]+)/i)?.[1] || '';
  const coords = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i)
    || decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (placeSlug && coords) {
    return `maps:${normalizeKey(placeSlug)}:${Number(coords[1]).toFixed(5)}:${Number(coords[2]).toFixed(5)}`;
  }

  return `url:${normalizeKey(decoded.split('?')[0] || decoded)}`;
}

function buildLeadDedupeKeys(params: { mapsUrl?: string; name?: string; address?: string }) {
  const mapsUrl = safeText(params.mapsUrl);
  const name = safeText(params.name);
  const address = safeText(params.address);
  const keys = [
    extractMapsCanonicalKey(mapsUrl),
    mapsUrl ? `raw-url:${normalizeKey(mapsUrl)}` : '',
    name || address ? `name-address:${normalizeKey(name)}-${normalizeKey(address)}` : '',
  ].filter(Boolean);
  return Array.from(new Set(keys));
}

function buildMapsUrlFromLead(lead: MapsLead) {
  const direct = safeText(lead.googleMapsUrl);
  if (/^https?:\/\/(www\.)?(google\.[^/]+\/maps|maps\.app\.goo\.gl)\//i.test(direct)) return direct;
  return '';
}

function buildPhase1Payload(lead: MapsLead, city: any, plannedNeighborhood?: string) {
  const googleMapsUrl = buildMapsUrlFromLead(lead);
  const rawName = safeText(lead.name);
  const neighborhood = safeText(lead.neighborhood) || safeText(plannedNeighborhood);
  const nameCleanup = normalizeRestaurantDisplayName(rawName || 'Lead Google Maps sem nome', {
    city: city.name,
    state: city.state,
    neighborhood,
  });
  const name = nameCleanup.displayName || rawName || 'Lead Google Maps sem nome';

  return {
    id: crypto.randomUUID(),
    name,
    google_maps_name: rawName || name,
    name_cleanup_notes: nameCleanup.cleanupReason || 'Fase 1 preservou o nome bruto do Google Maps; Validar IA deve decidir o nome comercial final.',
    category: 'Pendente validação',
    address: null,
    neighborhood: neighborhood || null,
    city: city.name,
    state: city.state,
    phone: null,
    plan: 'free',
    is_published: false,
    ai_validated: false,
    visit_notes: [
      googleMapsUrl ? `Google Maps: ${googleMapsUrl}` : '',
      rawName ? `Nome candidato no Google Maps: ${rawName}` : '',
      nameCleanup.changed ? `Nome público sugerido: ${name}` : '',
      'Fase 1: lead mínimo coletado pela extensão. Somente o link do Google Maps e o nome candidato foram capturados. Validar IA deve descobrir endereço, telefone, Instagram, cardápio, elegibilidade, nome final e rejeitar falsos restaurantes.',
    ].filter(Boolean).join('\n'),
    other_url: null,
    external_url: null,
    ifood_url: null,
    google_maps_url: googleMapsUrl || null,
    menu_status: 'unknown',
  };
}

function buildSearchQueries(city: any, neighborhoods: string[]): SearchQueryPlan[] {
  const queries: SearchQueryPlan[] = [];
  const seen = new Set<string>();
  const commercialPoleCount = getCommercialPoleNeighborhoodCount(neighborhoods.length);
  const commercialPoleKeys = new Set(neighborhoods.slice(0, commercialPoleCount).map(normalizeKey));
  const cityZones = getExpansionSearchZones(city.name, city.state, neighborhoods);

  for (const neighborhood of neighborhoods) {
    const terms = [
      ...MAPS_COLLECTION_ALL_NEIGHBORHOOD_TERMS,
      ...(commercialPoleKeys.has(normalizeKey(neighborhood)) ? MAPS_COLLECTION_COMMERCIAL_POLE_TERMS : []),
    ];

    for (const entry of terms) {
      const query = `${entry.term} ${neighborhood} ${city.name} ${city.state}`;
      const key = normalizeKey(query);
      if (seen.has(key)) continue;
      seen.add(key);
      queries.push({
        query,
        neighborhood,
        term: entry.term,
        label: entry.label,
        coverage: entry.coverage,
      });
    }
  }

  for (const zone of cityZones) {
    for (const entry of MAPS_COLLECTION_CITY_ZONE_TERMS) {
      const query = `${entry.term} ${zone} ${city.name} ${city.state}`;
      const key = normalizeKey(query);
      if (seen.has(key)) continue;
      seen.add(key);
      queries.push({
        query,
        neighborhood: zone,
        term: entry.term,
        label: entry.label,
        coverage: 'city_zones',
      });
    }
  }

  return queries;
}

function getMapsResultsLimit(searchPlan: SearchQueryPlan) {
  if (searchPlan.coverage === 'city_zones') return MAPS_RESULTS_PER_SEARCH;
  if (searchPlan.coverage === 'commercial_poles') return 32;
  if (normalizeKey(searchPlan.term) === 'restaurantes') return MAPS_RESULTS_PER_SEARCH;
  return 55;
}

async function fetchExistingLeadKeys(city: any) {
  const keys = new Set<string>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('google_maps_url, visit_notes, name, address')
      .eq('city', city.name)
      .eq('state', city.state)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    for (const restaurant of data || []) {
      const mapsUrl = safeText((restaurant as any).google_maps_url)
        || safeText(((restaurant as any).visit_notes || '').match(/Google Maps:\s*(https?:\/\/\S+)/i)?.[1]);
      const dedupeKeys = buildLeadDedupeKeys({
        mapsUrl,
        name: safeText((restaurant as any).name),
        address: safeText((restaurant as any).address),
      });
      dedupeKeys.forEach(key => keys.add(key));
    }

    if (!data || data.length < pageSize) break;
  }

  return keys;
}

function getCompletedSearchesStorageKey(city: any, fallbackCityId?: string) {
  const cityKey = safeText(city?.slug) || safeText(fallbackCityId) || `${safeText(city?.name)}-${safeText(city?.state)}`;
  return `filterfood:phase1:completed-searches:${normalizeKey(cityKey)}`;
}

function loadCompletedSearches(storageKey: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return new Set<string>(Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []);
  } catch (_) {
    return new Set<string>();
  }
}

function saveCompletedSearches(storageKey: string, completed: Set<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(completed)));
  } catch (_) {
    // Se o localStorage estiver indisponível/cheio, a coleta continua normalmente.
  }
}

function sendExtensionMessage(extensionId: string, message: any, timeoutMs = 45000): Promise<any> {
  return new Promise((resolve) => {
    const chromeObj = (window as any).chrome;
    if (!extensionId || !chromeObj?.runtime?.sendMessage) {
      resolve({ success: false, error: 'Extensão indisponível neste navegador.' });
      return;
    }

    let done = false;
    const timeout = window.setTimeout(() => {
      if (!done) {
        done = true;
        resolve({ success: false, error: 'Tempo limite ao falar com a extensão.' });
      }
    }, timeoutMs);

    try {
      chromeObj.runtime.sendMessage(extensionId, message, (response: any) => {
        if (done) return;
        done = true;
        window.clearTimeout(timeout);
        const runtimeError = chromeObj.runtime?.lastError?.message;
        if (runtimeError) resolve({ success: false, error: runtimeError });
        else resolve(response || { success: false, error: 'Extensão não respondeu.' });
      });
    } catch (error: any) {
      if (done) return;
      done = true;
      window.clearTimeout(timeout);
      resolve({ success: false, error: error?.message || 'Falha ao enviar comando para extensão.' });
    }
  });
}

function sendExtensionMessageBridge(extensionId: string, message: any, timeoutMs = 45000): Promise<any> {
  return new Promise((resolve) => {
    const chromeObj = (window as any).chrome;
    let done = false;
    let bridgePosted = false;
    const requestId = 'phase1-' + Date.now() + '-' + Math.random().toString(36).slice(2);

    const finish = (value: any) => {
      if (done) return;
      done = true;
      window.clearTimeout(timeout);
      window.removeEventListener('message', bridgeListener);
      resolve(value);
    };

    function bridgeListener(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data || {};
      if (data.source !== 'filterfood-extension-bridge' || data.requestId !== requestId) return;
      if (data.error) finish({ success: false, error: data.error });
      else finish(data.response || { success: false, error: 'Extensão não respondeu.' });
    }

    const postViaBridge = () => {
      if (bridgePosted || done) return;
      bridgePosted = true;
      window.postMessage({ source: 'filterfood-admin-bridge', requestId, message }, '*');
    };

    const timeout = window.setTimeout(() => {
      finish({ success: false, error: 'Tempo limite ao falar com a extensão.' });
    }, timeoutMs);

    try {
      window.addEventListener('message', bridgeListener);

      if (extensionId && chromeObj?.runtime?.sendMessage) {
        chromeObj.runtime.sendMessage(extensionId, message, (response: any) => {
          const runtimeError = chromeObj.runtime?.lastError?.message;
          if (runtimeError) postViaBridge();
          else finish(response || { success: false, error: 'Extensão não respondeu.' });
        });
        return;
      }

      postViaBridge();
    } catch (error: any) {
      finish({ success: false, error: error?.message || 'Falha ao enviar comando para extensão.' });
    }
  });
}

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

export default function CityCollection() {
  const { cityId } = useParams();
  const [, setSearchParams] = useSearchParams();
  const [isRunning, setIsRunning] = useState(false);
  const [abortRequested, setAbortRequested] = useState(false);
  const [logs, setLogs] = useState('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [city, setCity] = useState<any>(null);
  const [extensionId, setExtensionId] = useState(() => localStorage.getItem('chrome_extension_id') || FIXED_EXTENSION_ID);
  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);
  const [isExtensionCompatible, setIsExtensionCompatible] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const isExtensionReady = isExtensionActive && isExtensionCompatible;

  const addLog = (line: string) => setLogs(prev => `${prev}${line}\n`);

  const loadCityAndRestaurants = async () => {
    if (!cityId) return;
    const { data: cityData, error: cityError } = await supabase
      .from('expansion_projects')
      .select('*')
      .eq('slug', cityId)
      .single();

    if (cityError) throw cityError;
    setCity(cityData);

    const { data: restData, error: restError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('city', cityData.name)
      .eq('state', cityData.state)
      .order('created_at', { ascending: false })
      .limit(150);

    if (restError) throw restError;
    setRestaurants(restData || []);
  };

  useEffect(() => {
    loadCityAndRestaurants().catch((err) => console.error('Erro ao carregar dados da coleta da cidade:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const id = localStorage.getItem('chrome_extension_id') || extensionId || FIXED_EXTENSION_ID;
    if (!localStorage.getItem('chrome_extension_id')) localStorage.setItem('chrome_extension_id', id);
    setExtensionId(id);

    sendExtensionMessageBridge(id, { action: 'ping' }, 3000).then((res) => {
      setIsExtensionActive(!!res?.success);
      setExtensionVersion(res?.version || null);
      setIsExtensionCompatible(isCompatibleExtensionPing(res));
      if (res?.success && !isCompatibleExtensionPing(res)) {
        showError(`Extensão desatualizada/incompleta (${res.version || 'sem versão'}). Atualize para ${REQUIRED_EXTENSION_VERSION}+ antes de iniciar a Fase 1.`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistLead = async (payload: any) => {
    let currentPayload = { ...payload };
    const removedColumns: string[] = [];

    for (const missingColumn of learnedMissingRestaurantColumns) {
      if (Object.prototype.hasOwnProperty.call(currentPayload, missingColumn)) {
        const { [missingColumn]: _removed, ...nextPayload } = currentPayload;
        currentPayload = nextPayload;
      }
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { error } = await supabase.from('restaurants').insert(currentPayload);
      if (!error) {
        const newWarnings = removedColumns.filter(column => !warnedMissingRestaurantColumns.has(column));
        if (newWarnings.length) {
          newWarnings.forEach(column => warnedMissingRestaurantColumns.add(column));
          addLog(`[WARN] Schema atual sem colunas opcionais (${newWarnings.join(', ')}). Vou ignorá-las nos próximos leads desta sessão.`);
        }
        return;
      }

      const message = error.message || '';
      const missingColumn = message.match(/'([^']+)'\s+column/i)?.[1] || message.match(/column\s+"([^"]+)"/i)?.[1];
      if (missingColumn && Object.prototype.hasOwnProperty.call(currentPayload, missingColumn)) {
        const { [missingColumn]: _removed, ...nextPayload } = currentPayload;
        currentPayload = nextPayload;
        learnedMissingRestaurantColumns.add(missingColumn);
        removedColumns.push(missingColumn);
        continue;
      }

      if (/schema cache|column/i.test(message)) {
        const optionalColumns = [
          'visit_status',
          'ai_validated',
          'visit_notes',
          'google_maps_url',
          'google_maps_name',
          'ai_normalized_name',
          'name_cleanup_notes',
          'menu_status',
          'is_published',
          'other_url',
          'external_url',
          'ifood_url',
        ];
        const removable = optionalColumns.find(column => Object.prototype.hasOwnProperty.call(currentPayload, column));
        if (removable) {
          const { [removable]: _removed, ...nextPayload } = currentPayload;
          currentPayload = nextPayload;
          learnedMissingRestaurantColumns.add(removable);
          removedColumns.push(removable);
          continue;
        }
      }

      throw error;
    }

    throw new Error('Não foi possível salvar o lead após remover colunas opcionais incompatíveis.');
  };

  const handleStartScraping = async () => {
    if (isRunning || !city) return;
    const id = (localStorage.getItem('chrome_extension_id') || extensionId || FIXED_EXTENSION_ID).trim();

    const ping = await sendExtensionMessageBridge(id, { action: 'ping' }, 3000);
    if (!ping?.success) {
      setIsExtensionActive(false);
      setExtensionVersion(null);
      setIsExtensionCompatible(false);
      showError(`Extensão inativa: ${ping?.error || 'sem resposta'}`);
      return;
    }

    setExtensionId(id);
    setIsExtensionActive(true);
    if (id) localStorage.setItem('chrome_extension_id', id);
    setIsRunning(true);
    setAbortRequested(false);
    abortRef.current = false;
    setProgress(0);
    setLogs('');

    try {
      addLog(`[SYSTEM] Fase 1 iniciada pela extensão. Cidade: ${city.name}/${city.state}`);
      addLog('[SYSTEM] Regra: coletar somente leads mínimos do Google Maps. Nada será validado aqui.');

      const existing = await fetchExistingLeadKeys(city);
      addLog(`[SYSTEM] Deduplicação carregada com ${existing.size} links/chaves já salvos para ${city.name}/${city.state}.`);

      const neighborhoods = await resolveExpansionNeighborhoods(city.name, city.state, addLog);
      const queries = buildSearchQueries(city, neighborhoods);
      const completedSearchesStorageKey = getCompletedSearchesStorageKey(city, cityId);
      const completedSearches = loadCompletedSearches(completedSearchesStorageKey);
      const commercialPoleCount = getCommercialPoleNeighborhoodCount(neighborhoods.length);
      const cityZones = getExpansionSearchZones(city.name, city.state, neighborhoods);
      const cityZoneCount = getCityZoneCount(neighborhoods.length, city.name, city.state);
      addLog(`[PLANO] ${queries.length} buscas: ${MAPS_COLLECTION_ALL_NEIGHBORHOOD_TERMS.length} termos essenciais em ${neighborhoods.length} bairros + ${MAPS_COLLECTION_COMMERCIAL_POLE_TERMS.length} termos extras nos ${commercialPoleCount} principais polos + ${MAPS_COLLECTION_CITY_ZONE_TERMS.length} termos compactos em ${cityZoneCount} zonas/polos macro.`);
      if (cityZones.length) {
        addLog(`[PLANO] Zonas/polos macro: ${cityZones.join(', ')}.`);
      }
      addLog(`[PLANO] Potencial bruto: até ${queries.length * MAPS_RESULTS_PER_SEARCH} posições do Maps antes de deduplicar por link do Google Maps.`);
      addLog('[CONTRATO] Fase 1 salva apenas nome candidato + link do Google Maps. Endereço, telefone, categoria, Instagram, cardápio e elegibilidade ficam para o Validar IA.');
      if (completedSearches.size) {
        addLog(`[RESUME] ${completedSearches.size} buscas jÃ¡ concluÃ­das neste navegador serÃ£o puladas nesta retomada.`);
      }
      let saved = 0;
      let skipped = 0;

      for (let i = 0; i < queries.length; i += 1) {
        if (abortRef.current) {
          addLog('[STOP] Coleta interrompida pelo usuário.');
          break;
        }

        const searchPlan = queries[i];
        const searchKey = normalizeKey(searchPlan.query);
        if (completedSearches.has(searchKey)) {
          setProgress(Math.round(((i + 1) / queries.length) * 100));
          addLog(`[SKIP ${i + 1}/${queries.length}] Busca jÃ¡ concluÃ­da anteriormente â†’ ${searchPlan.query}`);
          continue;
        }

        setProgress(Math.round((i / queries.length) * 100));
        const layer = searchPlan.coverage === 'city_zones' ? 'zona/polo' : searchPlan.coverage === 'commercial_poles' ? 'polo' : 'bairro';
        addLog(`[BUSCA ${i + 1}/${queries.length}] ${searchPlan.label} • ${layer} • ${searchPlan.neighborhood} → ${searchPlan.query}`);

        let response: any = null;
        let leads: MapsLead[] = [];
        const maxSearchAttempts = 3;

        for (let attempt = 1; attempt <= maxSearchAttempts; attempt += 1) {
          if (abortRef.current) break;

          response = await sendExtensionMessageBridge(id, {
            action: 'searchGoogleMapsLeads',
            query: searchPlan.query,
            city: city.name,
            state: city.state,
            neighborhood: searchPlan.neighborhood,
            categoryTerm: searchPlan.term,
            maxResults: getMapsResultsLimit(searchPlan),
          }, 240000);

          leads = Array.isArray(response?.leads) ? response.leads : [];
          const errorText = safeText(response?.error);
          const emptyMapsResult = !response?.success && /nenhum lead|nenhum resultado|sem resultados/i.test(errorText);
          if (response?.success || emptyMapsResult) break;

          const retryable = !response?.success
            ? /tempo limite|timeout|sem resposta|n[aã]o respondeu|target|closed|carregar|google/i.test(errorText)
            : leads.length === 0;

          if (!retryable || attempt >= maxSearchAttempts) break;

          const reason = response?.success
            ? '0 candidatos retornados'
            : (errorText || 'falha sem detalhe');
          addLog(`[RETRY ${attempt + 1}/${maxSearchAttempts}] ${reason}. Vou repetir a mesma busca antes de seguir.`);
          await wait(3500 * attempt);
        }

        if (abortRef.current) {
          addLog('[STOP] Coleta interrompida pelo usuário.');
          break;
        }

        const emptyMapsResult = !response?.success && /nenhum lead|nenhum resultado|sem resultados/i.test(safeText(response?.error));
        if (emptyMapsResult) {
          addLog('[OK] 0 candidatos encontrados nessa busca. Vou seguir sem retry.');
          completedSearches.add(searchKey);
          saveCompletedSearches(completedSearchesStorageKey, completedSearches);
          continue;
        }

        if (!response?.success) {
          addLog(`[WARN] Extensão não retornou leads: ${response?.error || 'erro desconhecido'}`);
          continue;
        }

        addLog(`[OK] ${leads.length} candidatos encontrados nessa busca.`);

        for (const lead of leads) {
          const mapsUrl = buildMapsUrlFromLead(lead);
          const leadKeys = buildLeadDedupeKeys({
            mapsUrl,
            name: safeText(lead.name),
            address: safeText(lead.address),
          });
          if (leadKeys.length === 0 || leadKeys.some(key => existing.has(key))) {
            skipped += 1;
            continue;
          }

          leadKeys.forEach(key => existing.add(key));
          const payload = buildPhase1Payload(lead, city, searchPlan.coverage === 'city_zones' ? undefined : searchPlan.neighborhood);
          await persistLead(payload);
          saved += 1;
          const rawName = safeText((payload as any).google_maps_name);
          const savedName = rawName && rawName !== payload.name ? `${rawName} → ${payload.name}` : payload.name;
          addLog(`[SALVO] ${savedName} ${mapsUrl ? `(${mapsUrl})` : ''}`);
        }

        completedSearches.add(searchKey);
        saveCompletedSearches(completedSearchesStorageKey, completedSearches);
      }

      setProgress(100);
      await loadCityAndRestaurants();
      addLog(`[DONE] Fase 1 encerrada. Novos leads: ${saved}. Duplicados ignorados: ${skipped}.`);
      addLog('[NEXT] Próximo passo obrigatório: QA & Validação → Auto-Validar IA.');
      showSuccess(`Fase 1 concluída: ${saved} novos leads enviados para validação IA.`);
    } catch (error: any) {
      console.error(error);
      addLog(`[ERRO] ${error?.message || 'Falha inesperada na Fase 1.'}`);
      showError(error?.message || 'Falha ao executar Fase 1 pela extensão.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopScraping = () => {
    abortRef.current = true;
    setAbortRequested(true);
    addLog('[SYSTEM] Parada solicitada. Vou encerrar após a busca atual.');
  };

  const goToValidation = () => setSearchParams({ tab: 'validation' });

  const pendingCount = restaurants.filter(r => r.ai_validated !== true && r.is_deleted !== true).length;
  const validatedCount = restaurants.filter(r => r.ai_validated === true && r.is_deleted !== true).length;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Motor de Coleta — Fase 1</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Google Maps pela extensão: IA carrega bairros, monta buscas por categoria e coleta só a base mínima.</p>
        </div>
        <div className="flex gap-3">
          {isRunning ? (
            <Button variant="destructive" onClick={handleStopScraping} disabled={abortRequested} className="shadow-sm font-bold">
              <StopCircle className="w-4 h-4 mr-2" /> {abortRequested ? 'Encerrando...' : 'Parar Fase 1'}
            </Button>
          ) : (
            <Button onClick={handleStartScraping} className="bg-slate-900 hover:bg-slate-800 text-white shadow-md font-bold px-6">
              <Search className="w-4 h-4 mr-2" /> Iniciar Fase 1 pela Extensão
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 flex items-center gap-4">
              <div className="p-2.5 bg-white shadow-sm ring-1 ring-slate-900/5 text-blue-600 rounded-xl">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">Maps pela Extensão</h3>
                <p className="text-[13px] text-slate-500 font-medium">Navegação visível, sem API do Google e sem validação prematura.</p>
              </div>
            </div>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 uppercase tracking-wider">Progresso da Fase 1</span>
                  <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-indigo-500" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="font-black text-slate-900 text-lg">{restaurants.length}</p>
                  <p className="text-slate-500 font-semibold">Base total</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  <p className="font-black text-amber-700 text-lg">{pendingCount}</p>
                  <p className="text-amber-700 font-semibold">A validar</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="font-black text-emerald-700 text-lg">{validatedCount}</p>
                  <p className="text-emerald-700 font-semibold">Validados</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isExtensionReady ? 'bg-emerald-500' : isExtensionActive ? 'bg-amber-500' : 'bg-rose-500'}`} />
                {isExtensionReady
                  ? `Extensão ativa v${extensionVersion || REQUIRED_EXTENSION_VERSION} e pronta para navegar.`
                  : isExtensionActive
                    ? `Extensão carregada, mas desatualizada/incompleta (${extensionVersion || 'sem versão'}). Atualize para ${REQUIRED_EXTENSION_VERSION}+.`
                    : 'Extensão inativa: carregue/atualize a extensão e salve o ID.'}
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-800 font-semibold leading-relaxed">
                Ao iniciar, a Fase 1 descobre/cacheia bairros e monta uma cobertura adaptativa: bairros para termos essenciais, polos comerciais para cauda longa e, em cidades grandes, zonas/polos macro como “Zona Sul” ou “Centro Comercial” para ampliar cobertura sem explodir tempo.
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 shadow-xl shadow-slate-900/20 rounded-2xl overflow-hidden bg-slate-950 text-slate-300 flex flex-col h-[400px]">
            <div className="p-3 border-b border-slate-800/60 bg-[#0A0D14] flex justify-between items-center px-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5 mr-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <Terminal className="w-4 h-4 text-slate-500" />
                <h3 className="font-mono text-xs font-bold text-slate-400 tracking-wide">extension / maps-leads</h3>
              </div>
              {isRunning ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono bg-emerald-400/10 px-2 py-1 rounded-md">
                  <Activity className="w-3 h-3 animate-pulse" /> Em execução...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                  <div className="w-2 h-2 rounded-full bg-slate-600" /> Standby
                </div>
              )}
            </div>
            <CardContent className="p-5 font-mono text-[12px] flex-1 overflow-y-auto custom-scrollbar bg-[#0f111a]">
              {logs ? (
                <pre className="whitespace-pre-wrap text-emerald-400/90 font-mono text-[11px] leading-relaxed">
                  {logs}
                  <div ref={logEndRef} />
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40 select-none text-slate-400">
                  <Terminal className="w-12 h-12 mb-3 opacity-20" />
                  <p>Nenhum processo ativo.</p>
                  <p className="text-[10px] mt-1">Aguardando início da Fase 1 pela extensão.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-violet-50/60 to-purple-50/60 flex items-center gap-4">
              <div className="p-2.5 bg-white shadow-sm ring-1 ring-slate-900/5 text-violet-600 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">Próxima etapa obrigatória</h3>
                <p className="text-[13px] text-slate-500 font-medium">Validar IA abre Maps/Instagram/cardápio, rejeita inválidos e só então libera CRM.</p>
              </div>
            </div>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 uppercase tracking-wider">Fila para QA</span>
                  <span className="text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{pendingCount} pendentes</span>
                </div>
                <Progress value={restaurants.length ? Math.round((validatedCount / restaurants.length) * 100) : 0} className="h-2 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-purple-500" />
              </div>
              <Button onClick={goToValidation} variant="outline" className="w-full font-bold border-violet-200 text-violet-700 hover:bg-violet-50">
                <Sparkles className="w-4 h-4 mr-2" /> Ir para Auto-Validar IA
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white flex flex-col h-[400px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-500" /> Leads da Cidade
              </h3>
              <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                {restaurants.length} {restaurants.length === 150 ? '+' : ''}
              </span>
            </div>
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
              {restaurants.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <Store className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-600">Nenhum lead coletado ainda.</p>
                  <p className="text-xs text-slate-400 mt-1">Inicie a Fase 1 para criar a fila do Validar IA.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {restaurants.map((r, i) => (
                    <div key={r.id || i} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-sm text-slate-900 line-clamp-1">
                          {normalizeRestaurantDisplayName(r.name || '', { city: r.city, state: r.state, neighborhood: r.neighborhood }).displayName || r.name}
                        </span>
                        {r.ai_validated ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex-shrink-0">
                            Validado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
                            QA pendente
                          </span>
                        )}
                      </div>
                      {normalizeRestaurantDisplayName(r.name || '', { city: r.city, state: r.state, neighborhood: r.neighborhood }).changed && (
                        <div className="text-[11px] text-slate-400 line-clamp-1" title={r.name}>
                          Maps: {r.name}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{r.address || r.google_maps_url || 'Google Maps aguardando validação'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
