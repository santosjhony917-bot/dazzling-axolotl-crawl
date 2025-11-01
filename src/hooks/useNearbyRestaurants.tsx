import { useQuery } from '@tanstack/react-query';
import { fetchNearbyRestaurants } from '@/integrations/supabase/restaurants';
import { RestaurantWithDistance } from '@/types/supabase';

interface UseNearbyRestaurantsProps {
  userLat: number | null;
  userLon: number | null;
  enabled?: boolean;
  searchQuery?: string | null;
  maxDistance?: number;
}

export const useNearbyRestaurants = ({
  userLat,
  userLon,
  enabled = true,
  searchQuery = null,
  maxDistance = 10,
}: UseNearbyRestaurantsProps) => {
  const {
    data: restaurants,
    isLoading: loading,
    error,
    refetch,
  } = useQuery<RestaurantWithDistance[], Error>({
    queryKey: ['nearbyRestaurants', userLat, userLon, searchQuery, maxDistance],
    queryFn: () => {
      if (userLat === null || userLon === null) {
        return Promise.resolve([]);
      }
      return fetchNearbyRestaurants(userLat, userLon, maxDistance, searchQuery);
    },
    enabled: enabled && userLat !== null && userLon !== null,
  });

  return { restaurants: restaurants || [], loading, error: error?.message || null, refetch };
};