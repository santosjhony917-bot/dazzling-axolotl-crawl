import type {
  MenuAssistantSurface,
  MenuDiscoveryResult,
  MenuDiscoveryState,
  MenuSearchIntent,
  MenuSearchIntentPatch,
} from './types.ts';

type QueryTrigger = 'text' | 'intent' | 'refinement';
type ResultDestination = 'catalog_item' | 'published_source';
type CountBucket = '0' | '1_2' | '3_5' | '6_10' | '11_20' | '21_plus' | 'unknown';
type QueryLengthBucket = 'empty' | '1_20' | '21_60' | '61_120' | '121_plus';

type MenuAssistantEventName =
  | 'home_view'
  | 'assistant_prompt_started'
  | 'location_resolved'
  | 'query_submitted'
  | 'coverage_checked'
  | 'ai_fallback_used'
  | 'results_returned'
  | 'result_opened'
  | 'refinement_used'
  | 'no_result'
  | 'no_coverage'
  | 'error';

type SafeTelemetryValue = string | number | boolean | null;
type SafeTelemetryProperties = Record<string, SafeTelemetryValue>;

export interface MenuIntentTelemetryShape {
  hasLocation: boolean;
  hasBudget: boolean;
  categoryCount: number;
  restrictionCount: number;
  excludedIngredientCount: number;
  hasPeople: boolean;
  hasOccasion: boolean;
}

export interface MenuTelemetryOperation {
  id: string;
  startedAtMs: number;
  surface: MenuAssistantSurface;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }

  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

const TELEMETRY_NAMESPACE = 'menu_assistant';
const CONTRACT_VERSION = 1;
const RANKING_VERSION = 'public_catalog_v1';
const BOT_PATTERN = /bot|crawler|spider|headless|lighthouse|pagespeed/i;

function clockNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function safeIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^[a-zA-Z0-9_-]{1,96}$/.test(value) ? value : null;
}

function shouldTrack(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return false;
  if (navigator.webdriver || BOT_PATTERN.test(navigator.userAgent)) return false;
  return true;
}

function pushEvent(name: MenuAssistantEventName, properties: SafeTelemetryProperties): void {
  if (!shouldTrack()) return;

  const detail = {
    event: `${TELEMETRY_NAMESPACE}_${name}`,
    feature: TELEMETRY_NAMESPACE,
    route: window.location.pathname,
    contract_version: CONTRACT_VERSION,
    ranking_version: RANKING_VERSION,
    timestamp: new Date().toISOString(),
    ...properties,
  };

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(detail);
  window.dispatchEvent(new CustomEvent('filterfood:menu-assistant-event', { detail }));
}

function queryLengthBucket(length: number): QueryLengthBucket {
  if (length <= 0) return 'empty';
  if (length <= 20) return '1_20';
  if (length <= 60) return '21_60';
  if (length <= 120) return '61_120';
  return '121_plus';
}

function countBucket(value: number | null | undefined): CountBucket {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'unknown';
  if (value <= 0) return '0';
  if (value <= 2) return '1_2';
  if (value <= 5) return '3_5';
  if (value <= 10) return '6_10';
  if (value <= 20) return '11_20';
  return '21_plus';
}

function elapsedMs(startedAtMs: number): number {
  return Math.max(0, Math.round(clockNow() - startedAtMs));
}

function resolveField<T>(patchValue: T | undefined, intentValue: T | undefined, fallback: T): T {
  return patchValue !== undefined ? patchValue : intentValue !== undefined ? intentValue : fallback;
}

/**
 * Converte uma intenção potencialmente sensível somente em flags e contagens.
 * Nenhum texto livre, nome de bairro, coordenada ou termo de busca atravessa
 * esta fronteira de telemetria.
 */
export function describeMenuIntentForTelemetry(
  intent: MenuSearchIntent | null,
  patch?: MenuSearchIntentPatch,
): MenuIntentTelemetryShape {
  const location = resolveField(patch?.location, intent?.location, null);
  const priceMin = resolveField(patch?.priceMin, intent?.priceMin, null);
  const priceMax = resolveField(patch?.priceMax, intent?.priceMax, null);
  const categories = resolveField(patch?.categories, intent?.categories, []);
  const restrictions = resolveField(patch?.restrictions, intent?.restrictions, []);
  const excludedIngredients = resolveField(
    patch?.excludedIngredients,
    intent?.excludedIngredients,
    [],
  );
  const people = resolveField(patch?.people, intent?.people, null);
  const occasion = resolveField(patch?.occasion, intent?.occasion, null);

  return {
    hasLocation: location !== null,
    hasBudget: priceMin !== null || priceMax !== null,
    categoryCount: categories.length,
    restrictionCount: restrictions.length,
    excludedIngredientCount: excludedIngredients.length,
    hasPeople: people !== null,
    hasOccasion: occasion !== null,
  };
}

export function createMenuTelemetryOperation(surface: MenuAssistantSurface): MenuTelemetryOperation {
  const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return { id: randomId, startedAtMs: clockNow(), surface };
}

export function trackMenuHomeViewed(input: {
  hasLocation: boolean;
  demoAvailable: boolean;
}): void {
  pushEvent('home_view', {
    surface: 'home',
    has_location: input.hasLocation,
    demo_available: input.demoAvailable,
  });
}

export function trackMenuPromptStarted(input: {
  surface: MenuAssistantSurface;
  entryPoint: 'composer' | 'illustrative_card' | 'landing_handoff';
}): void {
  pushEvent('assistant_prompt_started', {
    surface: input.surface,
    entry_point: input.entryPoint,
  });
}

export function trackMenuLocationResolved(input: {
  surface: MenuAssistantSurface;
  source: 'gps' | 'profile' | 'manual';
}): void {
  pushEvent('location_resolved', {
    surface: input.surface,
    source: input.source,
  });
}

export function trackMenuQuerySubmitted(input: {
  operation: MenuTelemetryOperation;
  trigger: QueryTrigger;
  queryLength: number;
  intent: MenuIntentTelemetryShape;
}): void {
  const { operation, trigger, queryLength, intent } = input;
  pushEvent('query_submitted', {
    operation_id: safeIdentifier(operation.id),
    surface: operation.surface,
    trigger,
    query_length_bucket: queryLengthBucket(Math.max(0, queryLength)),
    has_location: intent.hasLocation,
    has_budget: intent.hasBudget,
    category_count: intent.categoryCount,
    restriction_count: intent.restrictionCount,
    excluded_ingredient_count: intent.excludedIngredientCount,
    has_people: intent.hasPeople,
    has_occasion: intent.hasOccasion,
  });

  if (trigger === 'refinement') {
    pushEvent('refinement_used', {
      operation_id: safeIdentifier(operation.id),
      surface: operation.surface,
      has_budget: intent.hasBudget,
      category_count: intent.categoryCount,
      restriction_count: intent.restrictionCount,
    });
  }
}

export function trackMenuDiscoveryOutcome(
  state: MenuDiscoveryState,
  operation: MenuTelemetryOperation,
): void {
  const shared: SafeTelemetryProperties = {
    operation_id: safeIdentifier(operation.id),
    trace_id: safeIdentifier(state.traceId),
    surface: operation.surface,
    latency_ms: elapsedMs(operation.startedAtMs),
  };

  if (state.coverage) {
    pushEvent('coverage_checked', {
      ...shared,
      coverage_status: state.coverage.status,
      eligible_restaurant_count_bucket: countBucket(state.coverage.eligibleRestaurantCount),
      searchable_item_count_bucket: countBucket(state.coverage.searchableItemCount),
    });
  }

  if (state.usedAI) {
    pushEvent('ai_fallback_used', {
      ...shared,
      query_variant_count: state.queriesUsed.length,
      result_count: state.results.length,
    });
  }

  if (['success', 'partial', 'stale'].includes(state.status) || (state.status === 'offline' && state.results.length > 0)) {
    pushEvent('results_returned', {
      ...shared,
      outcome_status: state.status,
      result_count: state.results.length,
      result_count_bucket: countBucket(state.results.length),
      has_more: state.hasMore,
      used_ai: state.usedAI,
      from_cache: state.isFromCache,
      unapplied_criteria_count: state.unappliedCriteria.length,
    });
    return;
  }

  if (state.status === 'no_result') {
    pushEvent('no_result', {
      ...shared,
      used_ai: state.usedAI,
      query_variant_count: state.queriesUsed.length,
      coverage_status: state.coverage?.status ?? 'unknown',
    });
    return;
  }

  if (state.status === 'no_coverage') {
    pushEvent('no_coverage', {
      ...shared,
      coverage_status: state.coverage?.status ?? 'unavailable',
      eligible_restaurant_count_bucket: countBucket(state.coverage?.eligibleRestaurantCount),
    });
    return;
  }

  if (state.status === 'error' || (state.status === 'offline' && state.results.length === 0)) {
    pushEvent('error', {
      ...shared,
      error_code: state.status === 'offline' ? 'offline' : state.error?.code ?? 'unknown',
      retryable: state.status === 'offline' || state.error?.retryable === true,
      had_cached_results: state.isFromCache,
    });
  }
}

export function trackGroundedResultOpened(input: {
  result: MenuDiscoveryResult;
  surface: MenuAssistantSurface;
  destination: ResultDestination;
}): void {
  const { result, surface, destination } = input;
  pushEvent('result_opened', {
    surface,
    destination,
    grounding: result.evidence.grounding,
    has_published_source: result.evidence.sourceUrl !== null,
    has_verification_date: result.evidence.verifiedAt !== null,
    has_distance: result.distanceKm !== null,
    has_image: result.itemImageUrl !== null,
  });
}
