export type MapsCollectionRound = {
  label: string;
  isNearby: boolean;
  query: string;
  /**
   * Termos curtos usados quando a coleta acontece pelo Google Maps visível
   * via extensão. O campo `query` continua existindo para o coletor legado
   * por API/grade, que aceitava consultas longas com OR.
   */
  mapsSearchTerms: string[];
};

export type MapsCollectionTermCoverage = 'all_neighborhoods' | 'commercial_poles';

export const MAPS_COLLECTION_SCAN_ROUNDS: MapsCollectionRound[] = [
  {
    label: 'Restaurantes gerais',
    isNearby: true,
    query: '',
    mapsSearchTerms: ['restaurantes'],
  },
  {
    label: 'Lanches/Fast Food',
    isNearby: false,
    query: 'food truck OR hamburgueria OR lanches OR trailer OR pastelaria OR pizzaria OR cachorro quente OR sanduicheria OR burguer OR salgadaria OR creperia OR tapiocaria OR shawarma OR esfiha OR petiscaria OR batata frita OR caldos OR lanchonete OR chapa OR panificiadora',
    mapsSearchTerms: ['pizzaria', 'lanchonete', 'hamburgueria'],
  },
  {
    label: 'Refeições/Restaurantes',
    isNearby: false,
    query: 'restaurante OR comida caseira OR self-service OR prato feito OR almoço OR jantar OR marmita OR buffet OR churrascaria OR carne na brasa OR frango assado OR peixaria OR frutos do mar OR comida nordestina OR cozinha regional OR comida brasileira OR bar e restaurante OR bistrô OR cantina OR tasca',
    mapsSearchTerms: ['marmitaria', 'churrascaria'],
  },
  {
    label: 'Café/Sobremesas/Açaí',
    isNearby: false,
    query: 'açaí OR sorvete OR café OR cafeteria OR confeitaria OR doceria OR bolos OR brigadeiro OR gelato OR milkshake OR suco OR vitamina OR sucos naturais OR caldo de cana OR tapioca OR crepe doce OR waffle OR frozen OR sorveteria OR ponto de café',
    mapsSearchTerms: ['açaí', 'cafeteria', 'sorveteria'],
  },
  {
    label: 'Japonesa/Oriental',
    isNearby: false,
    query: 'sushi OR temaki OR japonesa OR comida japonesa OR temakeria OR oriental OR comida oriental OR chinesa OR comida chinesa OR yakisoba OR asiática OR comida asiática OR hot roll OR sashimi OR ramen OR lamen OR sushi bar',
    mapsSearchTerms: ['comida japonesa'],
  },
];

export type MapsCollectionExtensionTerm = {
  label: string;
  term: string;
  coverage: MapsCollectionTermCoverage;
};

export const MAPS_COLLECTION_EXTENSION_TERMS: MapsCollectionExtensionTerm[] = [
  { label: 'Restaurantes gerais', term: 'restaurantes', coverage: 'all_neighborhoods' },
  { label: 'Lanches/Fast Food', term: 'pizzaria', coverage: 'all_neighborhoods' },
  { label: 'Lanches/Fast Food', term: 'lanchonete', coverage: 'all_neighborhoods' },
  { label: 'Lanches/Fast Food', term: 'hamburgueria', coverage: 'all_neighborhoods' },
  { label: 'Café/Sobremesas/Açaí', term: 'açaí', coverage: 'all_neighborhoods' },
  { label: 'Japonesa/Oriental', term: 'comida japonesa', coverage: 'all_neighborhoods' },
  { label: 'Japonesa/Oriental', term: 'comida chinesa', coverage: 'all_neighborhoods' },
  { label: 'Japonesa/Oriental', term: 'comida oriental', coverage: 'commercial_poles' },
  { label: 'Refeições/Restaurantes', term: 'marmitaria', coverage: 'all_neighborhoods' },
  { label: 'Refeições/Restaurantes', term: 'churrascaria', coverage: 'commercial_poles' },
  { label: 'Café/Sobremesas/Açaí', term: 'cafeteria', coverage: 'commercial_poles' },
  { label: 'Café/Sobremesas/Açaí', term: 'sorveteria', coverage: 'commercial_poles' },
  { label: 'Lanches/Fast Food', term: 'pastelaria', coverage: 'commercial_poles' },
  { label: 'Refeições/Restaurantes', term: 'self service', coverage: 'commercial_poles' },
].filter((entry, index, all) => all.findIndex(other => normalizeExpansionKey(other.term) === normalizeExpansionKey(entry.term)) === index);

export const MAPS_COLLECTION_ALL_NEIGHBORHOOD_TERMS = MAPS_COLLECTION_EXTENSION_TERMS
  .filter(entry => entry.coverage === 'all_neighborhoods');

export const MAPS_COLLECTION_COMMERCIAL_POLE_TERMS = MAPS_COLLECTION_EXTENSION_TERMS
  .filter(entry => entry.coverage === 'commercial_poles');

export function getCommercialPoleNeighborhoodCount(neighborhoodCount: number) {
  if (neighborhoodCount <= 0) return 0;
  return Math.min(neighborhoodCount, Math.max(8, Math.ceil(neighborhoodCount * 0.35)));
}

export function estimateMapsCollectionQueryCount(neighborhoodCount: number) {
  const allNeighborhoodQueries = neighborhoodCount * MAPS_COLLECTION_ALL_NEIGHBORHOOD_TERMS.length;
  const commercialPoleQueries = getCommercialPoleNeighborhoodCount(neighborhoodCount) * MAPS_COLLECTION_COMMERCIAL_POLE_TERMS.length;
  return allNeighborhoodQueries + commercialPoleQueries;
}

export function normalizeExpansionKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function safeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

const NEIGHBORHOOD_CACHE_VERSION = 2;
export const MAPS_RESULTS_PER_SEARCH = 80;

export const KNOWN_CITY_NEIGHBORHOODS: Record<string, string[]> = {
  'joao-pessoa-pb': [
    'Tambaú',
    'Manaíra',
    'Cabo Branco',
    'Bessa',
    'Centro Histórico',
    'Altiplano',
    'Torre',
    'Mangabeira',
    'Bancários',
    'Miramar',
    'Bairro dos Estados',
    'Jaguaribe',
    'Castelo Branco',
    'Geisel',
    'José Américo',
    'Expedicionários',
    'João Paulo II',
    'Cruz das Armas',
    'Valentina',
  ],
  'sao-paulo-sp': [
    'Jardins',
    'Pinheiros',
    'Bela Vista',
    'Vila Mariana',
    'Perdizes',
    'Santana',
    'Moema',
    'Itaim Bibi',
    'Vila Madalena',
    'Consolação',
    'Liberdade',
    'Butantã',
    'Lapa',
    'Mooca',
    'Tatuapé',
    'Ipiranga',
  ],
  'rio-de-janeiro-rj': [
    'Copacabana',
    'Ipanema',
    'Leblon',
    'Botafogo',
    'Flamengo',
    'Barra da Tijuca',
    'Recreio',
    'Tijuca',
    'Centro',
    'Lapa',
    'Santa Teresa',
    'Gávea',
    'Jardim Botânico',
    'Catete',
    'Glória',
    'Humaitá',
  ],
  'recife-pe': [
    'Boa Viagem',
    'Madalena',
    'Graças',
    'Espinheiro',
    'Casa Forte',
    'Pina',
    'Derby',
    'Afogados',
    'Imbiribeira',
    'Cordeiro',
    'Várzea',
    'Poço da Panela',
    'Apipucos',
    'San Martin',
    'Areias',
  ],
  'belo-horizonte-mg': [
    'Savassi',
    'Lourdes',
    'Funcionários',
    'Anchieta',
    'Sion',
    'Buritis',
    'Prado',
    'Padre Eustáquio',
    'Pampulha',
    'Castelo',
    'Sagrada Família',
    'Floresta',
    'Cruzeiro',
    'Gutierrez',
    'Santo Antônio',
    'Serra',
  ],
  'campina-grande-pb': [
    'Centro',
    'Catolé',
    'Liberdade',
    'Malvinas',
    'Bodocongó',
    'Alto Branco',
    'Prata',
    'José Pinheiro',
    'Dinamérica',
    'Cruzeiro',
    'Itararé',
    'São José',
    'Santo Antônio',
    'Monte Castelo',
    'Mirante',
    'Tambor',
    'Três Irmãs',
    'Santa Rosa',
    'Sandra Cavalcante',
    'Presidente Médici',
    'Universitário',
    'Centenário',
    'Palmeira',
    'Quarenta',
    'Bela Vista',
    'Monte Santo',
    'Pedregal',
    'Ramadinha',
    'Serrotão',
    'Santa Cruz',
    'Novo Bodocongó',
    'Estação Velha',
    'Distrito Industrial',
    'Jardim Paulistano',
    'Jardim Quarenta',
    'Jardim Tavares',
    'Jardim Continental',
    'Jardim Itararé',
    'Palmeira Imperial',
    'Araxá',
    'Cuités',
    'Conceição',
    'Jeremias',
    'Lauritzen',
    'Louzeiro',
    'Nações',
    'Castelo Branco',
    'Nova Brasília',
    'Lagoa de Dentro',
    'Catirina',
    'Cidades',
    'Conjunto dos Professores',
    'Bento Figueiredo',
    'Acácio Figueiredo',
    'Aluízio Afonso Campos',
    'Ronaldo Cunha Lima',
    'Santa Teresinha',
    'São Januário',
    'Tropeiros da Borborema',
    'Velame',
    'Vila Cabral',
    'Galante',
    'São José da Mata',
  ],
  'campina-grande-pb-legacy': [
    'Centro',
    'Catolé',
    'Liberdade',
    'Bodocongó',
    'Malvinas',
    'Prata',
    'Palmeira',
    'José Pinheiro',
    'Alto Branco',
    'Cruzeiro',
    'Dinamérica',
    'Mirante',
    'Santa Rosa',
    'Presidente Médici',
    'Três Irmãs',
    'Tambor',
    'Monte Castelo',
    'Santo Antônio',
  ],
};

export function getKnownCityNeighborhoods(cityName: string, state?: string) {
  const cityKey = normalizeExpansionKey(cityName || '');
  const stateKey = normalizeExpansionKey(state || '');
  const keys = stateKey ? [`${cityKey}-${stateKey}`, cityKey] : [cityKey];

  for (const key of keys) {
    const neighborhoods = KNOWN_CITY_NEIGHBORHOODS[key];
    if (neighborhoods?.length) return neighborhoods;
  }

  return [];
}

export function normalizeNeighborhoodList(values: unknown[], limit = 200) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const raw = safeText(value)
      .replace(/^bairro\s+(?:de|do|da)\s+/i, '')
      .replace(/^bairro\s+(?!dos\b|das\b)/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!raw || raw.length < 3 || raw.length > 60) continue;
    if (/^(cidade|munic[ií]pio|estado|brasil|para[ií]ba|pernambuco|s[aã]o paulo|rio de janeiro)$/i.test(raw)) continue;

    const key = normalizeExpansionKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push(raw);
  }

  if (!seen.has('centro')) normalized.unshift('Centro');

  return normalized.slice(0, limit);
}

export function getNeighborhoodCacheKey(cityName: string, state?: string) {
  return `ff_expansion_neighborhoods_${normalizeExpansionKey(cityName || '')}-${normalizeExpansionKey(state || '')}`;
}

function parseNeighborhoodsReply(reply: string) {
  const text = safeText(reply);
  if (!text) return [];

  const jsonCandidate =
    text.match(/```json\s*([\s\S]*?)```/i)?.[1] ||
    text.match(/\{[\s\S]*\}/)?.[0] ||
    text.match(/\[[\s\S]*\]/)?.[0] ||
    '';

  if (!jsonCandidate) return [];

  try {
    const parsed = JSON.parse(jsonCandidate);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.neighborhoods)) return parsed.neighborhoods;
    if (Array.isArray(parsed.bairros)) return parsed.bairros;
  } catch {
    return [];
  }

  return [];
}

async function fetchAiNeighborhoods(cityName: string, state?: string, timeoutMs = 18000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch('/api/local-collector/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      systemContext: [
        'Você planeja coleta de restaurantes no Google Maps para expansão comercial.',
        'Responda SOMENTE JSON válido no formato {"neighborhoods":["bairro 1","bairro 2"]}.',
        'Liste todos os bairros reais da cidade informada que forem úteis para uma varredura ampla no Google Maps, incluindo bairros oficiais, populares e polos comerciais.',
        'Não inclua cidades vizinhas, nomes de estado, CEP, explicações ou markdown.',
      ].join(' '),
      message: JSON.stringify({
        task: 'listar_bairros_para_coleta_google_maps',
        city: cityName,
        state,
        country: 'Brasil',
        maxNeighborhoods: 200,
        mustInclude: ['Centro'],
      }),
    }),
  }).finally(() => window.clearTimeout(timer));

  if (!response.ok) throw new Error(`IA de bairros retornou HTTP ${response.status}`);

  const payload = await response.json();
  return normalizeNeighborhoodList(parseNeighborhoodsReply(String(payload.reply || '')));
}

export async function resolveExpansionNeighborhoods(
  cityName: string,
  state?: string,
  addLog?: (line: string) => void,
) {
  const cacheKey = getNeighborhoodCacheKey(cityName, state);
  const known = normalizeNeighborhoodList(getKnownCityNeighborhoods(cityName, state));

  if (known.length >= 40) {
    localStorage.setItem(cacheKey, JSON.stringify({
      version: NEIGHBORHOOD_CACHE_VERSION,
      city: cityName,
      state,
      source: 'known_city_wide_list',
      neighborhoods: known,
      updatedAt: new Date().toISOString(),
    }));
    addLog?.(`[BAIRROS] Lista local ampla carregada: ${known.length} bairros/distritos para ${cityName}/${state}.`);
    return known;
  }

  try {
    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached?.version !== NEIGHBORHOOD_CACHE_VERSION) {
        localStorage.removeItem(cacheKey);
        throw new Error('cache_version_outdated');
      }
      const cachedNeighborhoods = normalizeNeighborhoodList(cached?.neighborhoods || []);
      if (cachedNeighborhoods.length) {
        addLog?.(`[BAIRROS] Cache carregado: ${cachedNeighborhoods.length} bairros para ${cityName}/${state}.`);
        return cachedNeighborhoods;
      }
    }
  } catch {
    localStorage.removeItem(cacheKey);
  }

  try {
    addLog?.('[BAIRROS] Pedindo à IA a lista de bairros da cidade...');
    const aiNeighborhoods = await fetchAiNeighborhoods(cityName, state);
    const merged = normalizeNeighborhoodList([...aiNeighborhoods, ...known]);

    if (merged.length) {
      localStorage.setItem(cacheKey, JSON.stringify({
        version: NEIGHBORHOOD_CACHE_VERSION,
        city: cityName,
        state,
        source: aiNeighborhoods.length ? 'ai+known_fallback' : 'known_fallback',
        neighborhoods: merged,
        updatedAt: new Date().toISOString(),
      }));
      addLog?.(`[BAIRROS] IA/cache preparado: ${merged.length} bairros (${merged.slice(0, 12).join(', ')}${merged.length > 12 ? '...' : ''}).`);
      return merged;
    }
  } catch (error: any) {
    addLog?.(`[WARN] IA não conseguiu listar bairros: ${error?.message || error}. Usando fallback local.`);
  }

  if (known.length) {
    addLog?.(`[BAIRROS] Fallback local: ${known.length} bairros conhecidos.`);
    return known;
  }

  addLog?.('[BAIRROS] Sem bairros conhecidos. Usando Centro como ponto mínimo.');
  return ['Centro'];
}
