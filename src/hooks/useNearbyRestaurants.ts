import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define o tipo para o restaurante retornado pela função find_nearby_restaurants
export type RestaurantWithDistance = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'basic' | 'premium' | 'premium_gift'; // Adicionado 'premium_gift'
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  city: string | null;
  state: string | null;
  distance_km: number;
};

interface UseNearbyRestaurantsOptions {
  userLat: number | null;
  userLon: number | null;
  enabled: boolean;
  searchQuery?: string;
}

export const useNearbyRestaurants = ({ userLat, userLon, enabled, searchQuery }: UseNearbyRestaurantsOptions) => {
  return useQuery<RestaurantWithDistance[], Error>({
    queryKey: ['nearbyRestaurants', userLat, userLon, searchQuery],
    queryFn: async () => {
      if (userLat === null || userLon === null) {
        throw new Error('User location is not available.');
      }

      const { data, error } = await supabase.rpc('find_nearby_restaurants', {
        user_lat: userLat,
        user_lng: userLon,
        max_distance_km: 10, // Default distance
        search_query: searchQuery || null,
      });

      if (error) {
        throw error;
      }
      return data;
    },
    enabled: enabled && userLat !== null && userLon !== null,
  });
};