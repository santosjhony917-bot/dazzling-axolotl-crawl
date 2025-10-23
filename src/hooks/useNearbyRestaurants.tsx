import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

// Define the structure of the restaurant data returned by the RPC
export interface NearbyRestaurant {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  address: string | null;
  plan: 'free' | 'premium'; // Assuming restaurant_plan maps to these strings
  created_at: string;
  latitude: number;
  longitude: number;
  distance_km: number;
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
    
    return data as NearbyRestaurant[];
  }, [userLat, userLon, maxDistanceKm, searchQuery]);

  const { data, isLoading, error, refetch } = useQuery<NearbyRestaurant[], Error>({
    queryKey: ['nearbyRestaurants', userLat, userLon, maxDistanceKm, searchQuery],
    queryFn: fetchNearbyRestaurants,
    enabled: enabled && userLat !== null && userLon !== null,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });

  return {
    restaurants: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  };
}