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
  neighborhood?: string | null;
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
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<RestaurantWithDistance[], Error>({
    queryKey: ['nearbyRestaurants', userLat, userLon, maxDistanceKm, searchQuery, includedCategories, limit, offset],
    queryFn: async () => {
      if (userLat === null || userLon === null) {
        throw new Error('User location is not available.');
      }

      const { data, error } = await supabase
        .rpc('find_nearby_restaurants', {
          user_lat: userLat,
          user_lng: userLon,
          max_distance_km: maxDistanceKm,
          search_query: searchQuery || null,
          included_categories: includedCategories.length > 0 ? includedCategories : null,
          p_limit: limit,
          p_offset: offset,
        });

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled: enabled && userLat !== null && userLon !== null,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Determine if there might be more items based on the fetched data length
  const hasMore = (data?.length || 0) === limit;

  return { data, isLoading, error, refetch, hasMore };
};