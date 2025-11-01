"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RestaurantWithDistance } from "@/types/supabase"; // Importando o tipo correto
import { useQuery } from "@tanstack/react-query";

interface UseNearbyRestaurantsOptions {
  userLat: number;
  userLng: number;
  maxDistanceKm?: number;
  searchQuery?: string;
  enabled?: boolean;
}

export function useNearbyRestaurants({
  userLat,
  userLng,
  maxDistanceKm = 10,
  searchQuery,
  enabled = true,
}: UseNearbyRestaurantsOptions) {
  const fetchRestaurants = useCallback(async () => {
    if (!userLat || !userLng) {
      return [];
    }

    const { data, error } = await supabase.rpc("find_nearby_restaurants", {
      user_lat: userLat,
      user_lng: userLng,
      max_distance_km: maxDistanceKm,
      search_query: searchQuery,
    });

    if (error) {
      console.error("Error fetching nearby restaurants:", error);
      throw error;
    }
    return data || [];
  }, [userLat, userLng, maxDistanceKm, searchQuery]);

  const {
    data: restaurants,
    isLoading,
    error,
    refetch,
  } = useQuery<RestaurantWithDistance[], Error>({
    queryKey: ["nearbyRestaurants", userLat, userLng, maxDistanceKm, searchQuery],
    queryFn: fetchRestaurants,
    enabled: enabled && userLat !== 0 && userLng !== 0, // Only enable if location is valid
  });

  return { restaurants, isLoading, error, refetch };
}