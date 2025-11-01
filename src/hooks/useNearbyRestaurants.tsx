import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import { RestaurantWithDistance } from "@/types/supabase"; // Importando o tipo correto

// Define the structure of the restaurant data returned by the RPC
// NOTE: The RPC returns a structure that is essentially RestaurantWithDistance
export interface NearbyRestaurant extends RestaurantWithDistance {
  // The RPC returns all columns of 'restaurants' plus 'distance_km'
  // We extend RestaurantWithDistance to ensure compatibility.
}

interface UseNearbyRestaurantsParams {
  userLat: number | null;
  userLon: number | null;
  maxDistanceKm?: number;
  searchQuery?: string;
  enabled: boolean;
}

export function useNearbyRestaurants({
  userLat,
  userLon,
  maxDistanceKm = 10,
  searchQuery,
  enabled,
}: UseNearbyRestaurantsParams) {
  const fetchNearbyRestaurants = useCallback(async () => {
    if (userLat === null || userLon === null) {
      throw new Error("User location is required.");
    }

    const { data, error } = await supabase.rpc('find_nearby_restaurants', {
      user_lat: userLat,
      user_lng: userLon,
      max_distance_km: maxDistanceKm,
      search_query: searchQuery || null,
    });

    if (error) {
      throw new Error(error.message);
    }
    
    // Casting the result to the correct type
    return data as NearbyRestaurant[];
  }, [userLat, userLon, maxDistanceKm, searchQuery]);

  const { data, isLoading, error, refetch } = useQuery<NearbyRestaurant[], Error>({
    queryKey: ['nearbyRestaurants', userLat, userLon, maxDistanceKm, searchQuery],
    queryFn: fetchNearbyRestaurants,
    enabled: enabled && userLat !== null && userLon !== null,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (substitui cacheTime)
  });

  return {
    restaurants: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  };
}