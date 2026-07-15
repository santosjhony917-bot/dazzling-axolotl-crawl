import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEMO_LABEL, IS_DEMO_MODE } from '@/lib/runtimeMode';
import { fetchNearbyPublicCatalogRestaurants } from '@/integrations/supabase/publicCatalog';

export type NearbyRestaurantsResultState =
  | 'disabled'
  | 'location_required'
  | 'loading'
  | 'error'
  | 'empty'
  | 'no_coverage'
  | 'ready';

export interface RestaurantWithDistance {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'premium' | 'premium_gift';
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  city: string | null;
  state: string | null;
  distance_km: number;
  neighborhood?: string | null;
  is_published?: boolean;
  menu_status?: string | null;
  opening_hours?: any;
  /** True only for fixtures enabled with VITE_DEMO_MODE=true. */
  is_demo?: boolean;
  data_source?: 'live' | 'demo';
}

interface UseNearbyRestaurantsOptions {
  userLat: number | null;
  userLon: number | null;
  maxDistanceKm?: number;
  searchQuery?: string;
  enabled?: boolean;
  includedCategories?: string[];
  limit?: number;
  offset?: number;
}

const createDemoRestaurants = (userLat: number, userLon: number): RestaurantWithDistance[] => [
  {
    id: 'demo-premium-restaurant-id',
    user_id: 'demo-premium-owner-id',
    name: `${DEMO_LABEL} Restaurante Gourmet`,
    description: `${DEMO_LABEL} Dado fictício exibido apenas para demonstração.`,
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
    cover_image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000',
    plan: 'premium',
    created_at: '2000-01-01T00:00:00.000Z',
    latitude: userLat,
    longitude: userLon,
    category: 'Demonstração',
    city: 'Cidade demonstrativa',
    state: 'DM',
    distance_km: 1.2,
    neighborhood: 'Área demonstrativa',
    is_published: true,
    menu_status: 'found',
    is_demo: true,
    data_source: 'demo',
  },
  {
    id: 'demo-casual-restaurant-id',
    user_id: 'demo-casual-owner-id',
    name: `${DEMO_LABEL} Lanchonete Exemplo`,
    description: `${DEMO_LABEL} Dado fictício exibido apenas para demonstração.`,
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    cover_image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000',
    plan: 'free',
    created_at: '2000-01-01T00:00:00.000Z',
    latitude: userLat + 0.005,
    longitude: userLon + 0.005,
    category: 'Demonstração',
    city: 'Cidade demonstrativa',
    state: 'DM',
    distance_km: 2.5,
    neighborhood: 'Área demonstrativa',
    is_published: true,
    menu_status: 'found',
    is_demo: true,
    data_source: 'demo',
  },
];

export const useNearbyRestaurants = ({
  userLat,
  userLon,
  maxDistanceKm = 10,
  searchQuery,
  enabled = true,
  includedCategories = [],
  limit = 50,
  offset = 0,
}: UseNearbyRestaurantsOptions) => {
  const queryClient = useQueryClient();
  const canQuery = enabled && userLat !== null && userLon !== null;

  const queryInfo = useQuery<RestaurantWithDistance[], Error>({
    queryKey: ['nearbyRestaurants', IS_DEMO_MODE ? 'demo' : 'live', userLat, userLon, maxDistanceKm, searchQuery, includedCategories, limit, offset],
    queryFn: async () => {
      if (userLat === null || userLon === null) {
        return [];
      }

      if (IS_DEMO_MODE) {
        const normalizedSearch = searchQuery?.trim().toLocaleLowerCase('pt-BR') || '';
        const normalizedCategories = new Set(includedCategories.map(category => category.toLocaleLowerCase('pt-BR')));

        return createDemoRestaurants(userLat, userLon)
          .filter(restaurant => restaurant.distance_km <= maxDistanceKm)
          .filter(restaurant => !normalizedSearch || `${restaurant.name} ${restaurant.category || ''}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
          .filter(restaurant => normalizedCategories.size === 0 || normalizedCategories.has((restaurant.category || '').toLocaleLowerCase('pt-BR')))
          .slice(offset, offset + limit);
      }

      try {
        const list = await fetchNearbyPublicCatalogRestaurants({
          latitude: userLat,
          longitude: userLon,
          maxDistanceKm,
          searchQuery: searchQuery || null,
          includedCategories,
          limit,
          offset,
        });
        return list.map((restaurant) => ({
          ...restaurant,
          user_id: null,
          created_at: restaurant.created_at || '',
          is_published: true,
          menu_status: 'found',
          is_demo: false,
          data_source: 'live' as const,
        })) as RestaurantWithDistance[];
      } catch (err) {
        if (err instanceof Error) throw err;
        console.error('Unexpected nearby restaurants error.', err);
        throw new Error('Não foi possível consultar os restaurantes próximos.');
      }
    },
    enabled: canQuery,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  useEffect(() => {
    const handleSync = () => {
      queryClient.invalidateQueries({ queryKey: ['nearbyRestaurants'] });
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'local-sync-restaurants-trigger') {
        queryClient.invalidateQueries({ queryKey: ['nearbyRestaurants'] });
      }
    };
    window.addEventListener('local-sync-restaurants', handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('local-sync-restaurants', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [queryClient]);

  const hasMore = (queryInfo.data?.length || 0) === limit;
  const hasFilters = Boolean(searchQuery?.trim()) || includedCategories.length > 0;
  const resultState: NearbyRestaurantsResultState = !enabled
    ? 'disabled'
    : userLat === null || userLon === null
      ? 'location_required'
      : queryInfo.isLoading
        ? 'loading'
        : queryInfo.error
          ? 'error'
          : (queryInfo.data?.length || 0) === 0
            ? hasFilters ? 'empty' : 'no_coverage'
            : 'ready';

  return {
    data: queryInfo.data,
    isLoading: queryInfo.isLoading,
    error: queryInfo.error,
    refetch: queryInfo.refetch,
    hasMore,
    resultState,
    isDemoMode: IS_DEMO_MODE,
  };
};
