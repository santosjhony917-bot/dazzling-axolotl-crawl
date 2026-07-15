import { supabase } from '@/integrations/supabase/client';

import { normalizeMenuSearchText } from './parser.ts';
import { QueryRewriteResponseSchema } from './schema.ts';
import { createMenuDiscoveryService } from './service.ts';
import type {
  MenuCatalogGateway,
  MenuCatalogSearchPage,
  MenuDiscoveryResult,
  MenuSearchIntent,
  QueryRewriteGateway,
  QueryRewriteResponse,
  UnappliedCriterion,
} from './types.ts';

interface RawSearchMenuItem {
  result_id?: unknown;
  item_id?: unknown;
  item_name?: unknown;
  item_description?: unknown;
  item_price?: unknown;
  item_price_type?: unknown;
  item_display_price?: unknown;
  item_price_min?: unknown;
  item_price_max?: unknown;
  item_image_url?: unknown;
  item_category_id?: unknown;
  item_category_name?: unknown;
  restaurant_id?: unknown;
  restaurant_name?: unknown;
  restaurant_category?: unknown;
  restaurant_neighborhood?: unknown;
  restaurant_city?: unknown;
  restaurant_state?: unknown;
  restaurant_opening_hours?: unknown;
  distance_km?: unknown;
  match_reason?: unknown;
  source_url?: unknown;
  item_source_url?: unknown;
  verified_at?: unknown;
  item_verified_at?: unknown;
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function absoluteUrlOrNull(value: unknown): string | null {
  const text = textOrNull(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function isoDateOrNull(value: unknown): string | null {
  const text = textOrNull(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function finiteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalize(value: unknown): string {
  return normalizeMenuSearchText(String(value ?? '')).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function categoryTerms(category: string): string[] {
  const normalized = normalize(category);
  const families: Record<string, string[]> = {
    hamburgueria: ['hamburguer', 'hamburgueria', 'burger', 'burguer', 'lanche', 'sanduiche'],
    pizzaria: ['pizza', 'pizzaria'],
    japonesa: ['japonesa', 'sushi', 'temaki'],
    cafeteria: ['cafe', 'cafeteria'],
    churrascaria: ['churrasco', 'churrascaria'],
    italiana: ['italiana', 'massa', 'macarrao'],
    brasileira: ['brasileira', 'marmita'],
    'acai sorveteria': ['acai', 'sorvete', 'sorveteria'],
    'doceria sobremesas': ['doce', 'doceria', 'sobremesa'],
    'saudavel fit': ['saudavel', 'fit', 'salada', 'vegano', 'vegetariano'],
  };
  return families[normalized] ?? normalized.split(' ');
}

function matchesCategory(raw: RawSearchMenuItem, intent: MenuSearchIntent): boolean {
  if (intent.categories.length === 0) return true;
  const haystack = normalize(`${raw.item_category_name ?? ''} ${raw.restaurant_category ?? ''}`);
  return intent.categories.some((category) => categoryTerms(category).some((term) => haystack.includes(term)));
}

function matchesNeighborhood(raw: RawSearchMenuItem, intent: MenuSearchIntent): boolean {
  const neighborhood = intent.location?.neighborhood;
  if (!neighborhood) return true;
  return normalize(raw.restaurant_neighborhood) === normalize(neighborhood);
}

function rawResultIdentity(raw: RawSearchMenuItem): string {
  return `${String(raw.item_id ?? '')}:${normalize(raw.item_name)}:${String(raw.item_price ?? '')}`;
}

function mapRawResult(raw: RawSearchMenuItem): MenuDiscoveryResult | null {
  const itemId = textOrNull(raw.item_id);
  const restaurantId = textOrNull(raw.restaurant_id);
  const itemCategoryId = textOrNull(raw.item_category_id);
  const itemName = textOrNull(raw.item_name);
  const restaurantName = textOrNull(raw.restaurant_name);
  const itemCategoryName = textOrNull(raw.item_category_name);
  const value =
    finiteNumberOrNull(raw.item_display_price) ??
    finiteNumberOrNull(raw.item_price_min) ??
    finiteNumberOrNull(raw.item_price);

  if (!itemId || !restaurantId || !itemCategoryId || !itemName || !restaurantName || !itemCategoryName || value === null) {
    return null;
  }

  const sourceUrl = absoluteUrlOrNull(raw.item_source_url ?? raw.source_url);
  const verifiedAt = isoDateOrNull(raw.item_verified_at ?? raw.verified_at);
  return {
    id: rawResultIdentity(raw),
    itemId,
    itemName,
    itemDescription: textOrNull(raw.item_description),
    itemImageUrl: absoluteUrlOrNull(raw.item_image_url),
    itemCategoryId,
    itemCategoryName,
    restaurantId,
    restaurantName,
    restaurantCategory: textOrNull(raw.restaurant_category),
    restaurantNeighborhood: textOrNull(raw.restaurant_neighborhood),
    restaurantCity: textOrNull(raw.restaurant_city),
    restaurantState: textOrNull(raw.restaurant_state),
    distanceKm: finiteNumberOrNull(raw.distance_km),
    restaurantOpeningHours: raw.restaurant_opening_hours ?? null,
    price: {
      currency: 'BRL',
      value,
      min: finiteNumberOrNull(raw.item_price_min),
      max: finiteNumberOrNull(raw.item_price_max),
      type: textOrNull(raw.item_price_type),
    },
    matchReason: describeMatchReason(textOrNull(raw.match_reason)),
    evidence: {
      kind: 'published_catalog',
      itemId,
      restaurantId,
      sourceUrl,
      verifiedAt,
      grounding: sourceUrl ? 'source_verified' : 'catalog_record',
    },
  };
}

function describeMatchReason(reason: string | null): string {
  const labels: Record<string, string> = {
    exact_item_name: 'Nome exato encontrado no cardápio publicado.',
    item_name_prefix: 'O prato começa com os termos que você procurou.',
    item_name: 'O nome do prato corresponde à sua pergunta.',
    category: 'A categoria do cardápio corresponde à sua pergunta.',
    description: 'A descrição publicada contém os termos procurados.',
    restaurant: 'O restaurante corresponde ao nome procurado.',
    catalog_featured: 'Opção disponível no catálogo publicado desta região.',
  };
  return reason && labels[reason] ? labels[reason] : 'Correspondência encontrada no cardápio publicado.';
}

function applyIntentFilters(rawResults: RawSearchMenuItem[], intent: MenuSearchIntent): RawSearchMenuItem[] {
  return rawResults.filter((raw) => {
    const price =
      finiteNumberOrNull(raw.item_display_price) ??
      finiteNumberOrNull(raw.item_price_min) ??
      finiteNumberOrNull(raw.item_price);
    if (price === null) return false;
    if (intent.priceMin !== null && price < intent.priceMin) return false;
    if (intent.priceMax !== null && price > intent.priceMax) return false;
    if (!matchesCategory(raw, intent)) return false;
    if (!matchesNeighborhood(raw, intent)) return false;
    return true;
  });
}

function collectUnappliedCriteria(intent: MenuSearchIntent): UnappliedCriterion[] {
  const criteria: UnappliedCriterion[] = [];
  if (intent.people !== null) criteria.push('people');
  if (intent.restrictions.length > 0) criteria.push('restriction');
  if (intent.excludedIngredients.length > 0) criteria.push('excluded_ingredient');
  if (intent.occasion !== null) criteria.push('occasion');
  if (intent.location?.latitude !== null && intent.location?.latitude !== undefined) criteria.push('distance');
  if (intent.location?.city) criteria.push('city');
  if (intent.location?.regionId) criteria.push('region');
  if (intent.sort === 'distance') criteria.push('sort_distance');
  return [...new Set(criteria)];
}

function sortResults(results: MenuDiscoveryResult[], intent: MenuSearchIntent): MenuDiscoveryResult[] {
  if (intent.sort === 'price_asc') return [...results].sort((a, b) => a.price.value - b.price.value);
  if (intent.sort === 'price_desc') return [...results].sort((a, b) => b.price.value - a.price.value);
  if (intent.sort === 'distance') {
    return [...results].sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
  }
  return results;
}

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || error.code === '42883' || /function .* does not exist/i.test(error.message ?? '');
}

async function legacySearch(
  queries: string[],
  intent: MenuSearchIntent,
  limit: number,
  offset: number,
  signal: AbortSignal,
): Promise<MenuCatalogSearchPage> {
  const responses = await Promise.all(
    (queries.length > 0 ? queries : ['']).map(async (query) => {
      const response = await supabase
        .rpc('search_menu_items', {
          search_query: query,
          p_limit: limit,
          p_offset: offset,
          excluded_category_ids: undefined,
        })
        .abortSignal(signal);
      if (response.error) throw response.error;
      return Array.isArray(response.data) ? (response.data as RawSearchMenuItem[]) : [];
    }),
  );
  const raw = responses.flat();
  const mapped = applyIntentFilters(raw, intent).map(mapRawResult).filter((item): item is MenuDiscoveryResult => item !== null);
  return {
    results: sortResults(mapped, intent).slice(0, limit),
    hasMore: responses.some((result) => result.length === limit),
    unappliedCriteria: collectUnappliedCriteria(intent),
    stale: false,
  };
}

/**
 * Adaptador temporário para a RPC pública atual. A RPC já restringe a
 * `restaurants.is_published = true`; filtros que ela ainda não consegue provar
 * são declarados em `unappliedCriteria` e forçam estado `partial`.
 */
export const supabaseMenuCatalogGateway: MenuCatalogGateway = {
  async checkCoverage(intent, signal) {
    if (signal.aborted) throw new DOMException('A busca foi cancelada.', 'AbortError');
    const location = intent.location;
    if (!location) {
      return {
        status: 'unknown',
        regionLabel: null,
        eligibleRestaurantCount: null,
        searchableItemCount: null,
        checkedAt: new Date().toISOString(),
        reason: 'Localização não informada.',
      };
    }

    if (!location.city && !location.state && !location.neighborhood) {
      return {
        status: 'unknown',
        regionLabel: location.label,
        eligibleRestaurantCount: null,
        searchableItemCount: null,
        checkedAt: new Date().toISOString(),
        reason: 'A busca usará o raio informado; a cobertura textual da região ainda não foi identificada.',
      };
    }

    const response = await supabase
      .rpc('get_public_catalog_coverage', {
        p_city: location.city,
        p_state: location.state,
        p_neighborhood: location.neighborhood,
        p_limit: 200,
      })
      .abortSignal(signal);

    if (response.error) {
      if (isMissingRpc(response.error)) {
        return {
          status: 'unknown',
          regionLabel: location.label ?? location.city,
          eligibleRestaurantCount: null,
          searchableItemCount: null,
          checkedAt: new Date().toISOString(),
          reason: 'A verificação de cobertura aguarda a migration segura do catálogo.',
        };
      }
      throw response.error;
    }

    const rows = Array.isArray(response.data) ? response.data as Array<Record<string, unknown>> : [];
    const restaurantCount = rows.reduce((total, row) => total + (finiteNumberOrNull(row.restaurant_count) ?? 0), 0);
    const itemCount = rows.reduce((total, row) => total + (finiteNumberOrNull(row.searchable_result_count) ?? 0), 0);
    return {
      status: restaurantCount === 0 ? 'unavailable' : restaurantCount < 5 ? 'limited' : 'covered',
      regionLabel: location.label ?? location.neighborhood ?? location.city,
      eligibleRestaurantCount: restaurantCount,
      searchableItemCount: itemCount,
      checkedAt: new Date().toISOString(),
      reason: restaurantCount === 0 ? 'Nenhum cardápio auditado e publicado nesta região.' : null,
    };
  },

  async search({ intent, queries, limit, offset, signal }): Promise<MenuCatalogSearchPage> {
    const safeQueries = [...new Set(queries.map(normalize).filter(Boolean))].slice(0, 5);
    const location = intent.location;
    const response = await supabase
      .rpc('search_public_catalog', {
        p_queries: safeQueries,
        p_limit: limit,
        p_offset: offset,
        p_category: intent.categories[0] ?? null,
        p_city: location?.city ?? null,
        p_state: location?.state ?? null,
        p_neighborhood: location?.neighborhood ?? null,
        p_min_price: intent.priceMin,
        p_max_price: intent.priceMax,
        p_lat: location?.latitude ?? null,
        p_lng: location?.longitude ?? null,
        p_max_distance_km: location?.radiusKm ?? null,
      })
      .abortSignal(signal);

    if (response.error) {
      if (isMissingRpc(response.error)) return legacySearch(safeQueries, intent, limit, offset, signal);
      throw response.error;
    }

    const raw = Array.isArray(response.data) ? response.data as RawSearchMenuItem[] : [];
    const filtered = applyIntentFilters(raw, intent);
    const seen = new Set<string>();
    const mapped = filtered
      .filter((item) => {
        const identity = rawResultIdentity(item);
        if (seen.has(identity)) return false;
        seen.add(identity);
        return true;
      })
      .map(mapRawResult)
      .filter((item): item is MenuDiscoveryResult => item !== null);

    return {
      results: sortResults(mapped, intent).slice(0, limit),
      hasMore: raw.length === limit || mapped.length > limit,
      unappliedCriteria: collectUnappliedCriteria(intent).filter((criterion) => !['price', 'city', 'neighborhood', 'distance', 'sort_distance'].includes(criterion)),
      stale: false,
    };
  },
};

export const supabaseQueryRewriteGateway: QueryRewriteGateway = {
  async rewrite(request, signal) {
    const { data, error } = await supabase.functions.invoke('rewrite-search-query-ai', {
      body: request,
      signal,
      timeout: 5_000,
    });
    if (error) throw error;
    return QueryRewriteResponseSchema.parse(data) as QueryRewriteResponse;
  },
};

export function createSupabaseMenuDiscoveryService() {
  return createMenuDiscoveryService({
    catalog: supabaseMenuCatalogGateway,
    rewriter: supabaseQueryRewriteGateway,
  });
}
