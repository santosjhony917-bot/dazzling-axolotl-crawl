import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RestaurantWithDistance {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'basic' | 'premium';
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  city: string | null;
  state: string | null;
  distance_km: number;
}

interface UseNearbyRestaurantsOptions {
  userLat: number | null;
  userLon: number | null;
  maxDistanceKm?: number;
  searchQuery?: string;
  enabled?: boolean;
  includedCategories?: string[]; // Esta propriedade é crucial e está sendo adicionada/confirmada aqui.
}

export const useNearbyRestaurants = ({
  userLat,
  userLon,
  maxDistanceKm = 10,
  searchQuery,
  enabled = true,
  includedCategories = [],
}: UseNearbyRestaurantsOptions) => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<RestaurantWithDistance[], Error>({
    queryKey: ['nearbyRestaurants', userLat, userLon, maxDistanceKm, searchQuery, includedCategories],
    queryFn: async () => {
      if (userLat === null || userLon === null) {
        throw new Error('User location is not available.');
      }

      let query = supabase
        .rpc('find_nearby_restaurants', {
          user_lat: userLat,
          user_lng: userLon,
          max_distance_km: maxDistanceKm,
          search_query: searchQuery || null,
        });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      let filteredData = data;
      // Agora filtra para categorias INCLUÍDAS
      if (includedCategories.length > 0) {
        filteredData = data.filter(restaurant => 
          restaurant.category && includedCategories.includes(restaurant.category)
        );
      }

      return filteredData || [];
    },
    enabled: enabled && userLat !== null && userLon !== null,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { data, isLoading, error, refetch };
};