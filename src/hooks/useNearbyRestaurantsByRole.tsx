import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Extend the base interface
export interface NearbyRestaurantWithRole {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  address: string | null;
  plan: 'free' | 'premium';
  created_at: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  is_premium: boolean; // Added field
}

type AppRole = 'customer' | 'free_restaurant' | 'premium_restaurant';

interface UseNearbyRestaurantsByRoleParams {
  userLat: number | null;
  userLon: number | null;
  maxDistanceKm?: number;
  searchQuery?: string;
  requiredRole?: AppRole;
  enabled: boolean;
}

export function useNearbyRestaurantsByRole({
  userLat,
  userLon,
  maxDistanceKm = 10,
  searchQuery,
  requiredRole,
  enabled,
}: UseNearbyRestaurantsByRoleParams) {
  const { data, isLoading, error, refetch } = useQuery<NearbyRestaurantWithRole[], Error>({
    queryKey: ['nearbyRestaurantsByRole', userLat, userLon, maxDistanceKm, searchQuery, requiredRole],
    queryFn: async () => {
      if (userLat === null || userLon === null) {
        throw new Error("User location is required.");
      }

      const { data, error } = await supabase.rpc('find_nearby_restaurants_by_role', {
        user_lat: userLat,
        user_lng: userLon,
        max_distance_km: maxDistanceKm,
        search_query: searchQuery || null,
        required_role: requiredRole || null,
      });

      if (error) {
        throw new Error(error.message);
      }
      
      return data as NearbyRestaurantWithRole[];
    },
    enabled: enabled && userLat !== null && userLon !== null,
  });

  return {
    restaurants: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  };
}