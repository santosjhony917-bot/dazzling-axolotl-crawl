export const MENU_DISCOVERY_STATUSES = [
  'idle',
  'checking_coverage',
  'parsing',
  'searching',
  'rewriting',
  'partial',
  'success',
  'no_result',
  'no_coverage',
  'stale',
  'offline',
  'cancelled',
  'error',
] as const;

export type MenuDiscoveryStatus = (typeof MENU_DISCOVERY_STATUSES)[number];

export type MenuAssistantSurface = 'home' | 'search' | 'chat';

export type MenuSearchSort = 'relevance' | 'price_asc' | 'price_desc' | 'distance';

export type MenuSearchRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'lactose_free'
  | 'sugar_free';

export type MenuSearchOccasion =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'date'
  | 'family'
  | 'friends'
  | 'party'
  | 'work';

export type MenuLocationSource = 'gps' | 'manual' | 'profile' | 'url';

export interface MenuSearchLocation {
  latitude: number | null;
  longitude: number | null;
  label: string | null;
  neighborhood: string | null;
  regionId: string | null;
  city: string | null;
  state: string | null;
  radiusKm: number | null;
  source: MenuLocationSource | null;
}

/**
 * Contrato canônico compartilhado por home, busca e chat.
 * Ausência de informação é sempre representada por null/array vazio — nunca
 * por uma suposição silenciosa.
 */
export interface MenuSearchIntent {
  version: 1;
  rawText: string;
  normalizedText: string;
  searchText: string;
  dishTerms: string[];
  ingredients: string[];
  excludedIngredients: string[];
  priceMin: number | null;
  priceMax: number | null;
  people: number | null;
  categories: string[];
  restrictions: MenuSearchRestriction[];
  occasion: MenuSearchOccasion | null;
  location: MenuSearchLocation | null;
  sort: MenuSearchSort;
}

export type MenuSearchIntentPatch = Partial<
  Pick<
    MenuSearchIntent,
    | 'searchText'
    | 'dishTerms'
    | 'ingredients'
    | 'excludedIngredients'
    | 'priceMin'
    | 'priceMax'
    | 'people'
    | 'categories'
    | 'restrictions'
    | 'occasion'
    | 'location'
    | 'sort'
  >
>;

export interface GroundingEvidence {
  kind: 'published_catalog';
  itemId: string;
  restaurantId: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
  grounding: 'catalog_record' | 'source_verified';
}

export interface MenuDiscoveryPrice {
  currency: 'BRL';
  value: number;
  min: number | null;
  max: number | null;
  type: string | null;
}

/**
 * A resposta factual é deliberadamente fechada. Não existe campo para fatos
 * gerados por modelo; tudo precisa apontar para IDs do catálogo publicado.
 */
export interface MenuDiscoveryResult {
  id: string;
  itemId: string;
  itemName: string;
  itemDescription: string | null;
  itemImageUrl: string | null;
  itemCategoryId: string;
  itemCategoryName: string;
  restaurantId: string;
  restaurantName: string;
  restaurantCategory: string | null;
  restaurantNeighborhood: string | null;
  restaurantCity: string | null;
  restaurantState: string | null;
  distanceKm: number | null;
  restaurantOpeningHours: unknown | null;
  price: MenuDiscoveryPrice;
  matchReason: string;
  evidence: GroundingEvidence;
}

export type MenuCoverageStatus = 'covered' | 'limited' | 'unavailable' | 'unknown';

export interface MenuCoverage {
  status: MenuCoverageStatus;
  regionLabel: string | null;
  eligibleRestaurantCount: number | null;
  searchableItemCount: number | null;
  checkedAt: string;
  reason: string | null;
}

export type UnappliedCriterion =
  | 'query'
  | 'category'
  | 'price'
  | 'people'
  | 'restriction'
  | 'excluded_ingredient'
  | 'distance'
  | 'city'
  | 'region'
  | 'neighborhood'
  | 'occasion'
  | 'sort_distance';

export interface MenuCatalogSearchRequest {
  intent: MenuSearchIntent;
  queries: string[];
  limit: number;
  offset: number;
  signal: AbortSignal;
}

export interface MenuCatalogSearchPage {
  results: MenuDiscoveryResult[];
  hasMore: boolean;
  unappliedCriteria: UnappliedCriterion[];
  stale: boolean;
}

export interface MenuCatalogGateway {
  checkCoverage(intent: MenuSearchIntent, signal: AbortSignal): Promise<MenuCoverage>;
  search(request: MenuCatalogSearchRequest): Promise<MenuCatalogSearchPage>;
}

export interface QueryRewriteRequest {
  rawQuery: string;
  dbQuery: string;
  existingResultCount: number;
  localFallbacks: string[];
}

export interface QueryRewriteResponse {
  expandedQueries: string[];
  usedAI: boolean;
}

export interface QueryRewriteGateway {
  rewrite(request: QueryRewriteRequest, signal: AbortSignal): Promise<QueryRewriteResponse>;
}

export interface MenuDiscoveryError {
  code: 'invalid_intent' | 'network' | 'catalog' | 'unknown';
  message: string;
  retryable: boolean;
}

export interface MenuDiscoveryOutcome {
  status: Exclude<MenuDiscoveryStatus, 'idle' | 'parsing'>;
  intent: MenuSearchIntent;
  results: MenuDiscoveryResult[];
  coverage: MenuCoverage | null;
  usedAI: boolean;
  queriesUsed: string[];
  unappliedCriteria: UnappliedCriterion[];
  hasMore: boolean;
  traceId: string;
  completedAt: string;
  error: MenuDiscoveryError | null;
}

export interface MenuDiscoveryState {
  status: MenuDiscoveryStatus;
  surface: MenuAssistantSurface;
  rawText: string;
  intent: MenuSearchIntent | null;
  results: MenuDiscoveryResult[];
  coverage: MenuCoverage | null;
  usedAI: boolean;
  queriesUsed: string[];
  unappliedCriteria: UnappliedCriterion[];
  hasMore: boolean;
  traceId: string | null;
  error: MenuDiscoveryError | null;
  requestId: number;
  isFromCache: boolean;
  cacheSavedAt: string | null;
}

export interface MenuDiscoverySubmitInput {
  text: string;
  surface: MenuAssistantSurface;
  intentPatch?: MenuSearchIntentPatch;
  limit?: number;
  offset?: number;
}
