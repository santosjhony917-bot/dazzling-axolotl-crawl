"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RestaurantWithDistance } from "@/types/supabase"; // Importando o tipo correto
import { useQuery } from "@tanstack/react-query";

interface UseNearbyCompetitorsOptions {
  restaurantId: string;
  userLat: number;
  userLng: number;
  maxDistanceKm?: number;
  enabled?: boolean;
}

export function useNearbyCompetitors({
  restaurantId,
  userLat,
  userLng,
  maxDistanceKm = 10,
  enabled = true,
}: UseNearbyCompetitorsOptions) {
  const fetchCompetitors = useCallback(async () => {
    if (!userLat || !userLng || !restaurantId) {
      return [];
    }

    const { data, error } = await supabase.rpc("find_nearby_restaurants", {
      user_lat: userLat,
      user_lng: userLng,
      max_distance_km: maxDistanceKm,
      search_query: null, // Not searching by query for competitors
    });

    if (error) {
      console.error("Error fetching nearby competitors:", error);
      throw error;
    }

    // Filter out the current restaurant itself
    return (data || []).filter(r => r.id !== restaurantId);
  }, [restaurantId, userLat, userLng, maxDistanceKm]);

  const {
    data: competitors,
    isLoading,
    error,
    refetch,
  } = useQuery<RestaurantWithDistance[], Error>({
    queryKey: ["nearbyCompetitors", restaurantId, userLat, userLng, maxDistanceKm],
    queryFn: fetchCompetitors,
    enabled: enabled && userLat !== 0 && userLng !== 0 && !!restaurantId,
  });

  return { competitors, isLoading, error, refetch };
}