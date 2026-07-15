import { useQuery } from '@tanstack/react-query';
import { parseMenuSearchIntent } from './parser.ts';
import { supabaseMenuCatalogGateway } from './supabaseGateway.ts';
import type { MenuDiscoveryResult, MenuSearchLocation } from './types.ts';

export interface HomeCatalogRestaurant {
  id: string;
  name: string;
  category: string | null;
  neighborhood: string | null;
  distanceKm: number | null;
  representativeItemImageUrl: string | null;
  publishedItemCount: number;
}

function groupRestaurants(results: MenuDiscoveryResult[]): HomeCatalogRestaurant[] {
  const grouped = new Map<string, HomeCatalogRestaurant>();
  results.forEach((result) => {
    const existing = grouped.get(result.restaurantId);
    if (existing) {
      existing.publishedItemCount += 1;
      if (!existing.representativeItemImageUrl && result.itemImageUrl) {
        existing.representativeItemImageUrl = result.itemImageUrl;
      }
      return;
    }
    grouped.set(result.restaurantId, {
      id: result.restaurantId,
      name: result.restaurantName,
      category: result.restaurantCategory,
      neighborhood: result.restaurantNeighborhood,
      distanceKm: result.distanceKm,
      representativeItemImageUrl: result.itemImageUrl,
      publishedItemCount: 1,
    });
  });
  return [...grouped.values()].sort(
    (a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY),
  );
}

/**
 * Feed ocioso da Home alimentado pelo mesmo gateway elegível usado pela IA.
 * Durante a janela de implantação, o gateway faz fallback somente se a RPC
 * nova ainda não existir; depois da migration, nenhuma tabela privada é lida.
 */
export function useHomeCatalogFeed(location: MenuSearchLocation | null) {
  const locationForRadius = location
    ? { ...location, city: null, state: null, neighborhood: null, regionId: null }
    : null;

  const query = useQuery({
    queryKey: [
      'public-home-catalog-feed',
      locationForRadius?.latitude ?? null,
      locationForRadius?.longitude ?? null,
      locationForRadius?.radiusKm ?? null,
    ],
    queryFn: async ({ signal }) => {
      const intent = parseMenuSearchIntent('', {
        location: locationForRadius,
        sort: locationForRadius ? 'distance' : 'relevance',
      });
      const page = await supabaseMenuCatalogGateway.search({
        intent,
        queries: [],
        limit: 24,
        offset: 0,
        signal,
      });
      return {
        items: page.results,
        restaurants: groupRestaurants(page.results),
        stale: page.stale,
        unappliedCriteria: page.unappliedCriteria,
      };
    },
    enabled: locationForRadius !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const resultState = locationForRadius === null
    ? 'disabled' as const
    : query.isLoading
    ? 'loading' as const
    : query.error
      ? 'error' as const
      : (query.data?.items.length ?? 0) === 0
        ? locationForRadius ? 'no_coverage' as const : 'empty' as const
        : query.data?.unappliedCriteria.some((criterion) => criterion === 'distance' || criterion === 'sort_distance')
          ? 'unverified' as const
          : 'ready' as const;

  return {
    ...query,
    resultState,
  };
}
