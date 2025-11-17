import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantWithDistance } from '@/types/supabase';

export type { RestaurantWithDistance };

interface UseNearbyRestaurantsProps {
  userLat: number | null;
  userLon: number | null;
  enabled: boolean;
  searchQuery?: string;
  includedCategories?: string[];
  limit: number;
  offset: number;
}

export function useNearbyRestaurants({
  userLat,
  userLon,
  enabled,
  searchQuery,
  includedCategories,
  limit,
  offset,
}: UseNearbyRestaurantsProps) {
  const [data, setData] = useState<RestaurantWithDistance[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true); // Inicializa como true para permitir a primeira carga

  const fetchData = useCallback(async () => {
    if (!enabled || userLat === null || userLon === null) {
      setData([]);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: restaurants, error } = await supabase.rpc('find_nearby_restaurants', {
        user_lat: userLat,
        user_lng: userLon,
        search_query: searchQuery,
        included_categories: includedCategories,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        throw error;
      }

      setData(restaurants || []);
      // AQUI ESTÁ A MUDANÇA: hasMore é true se o número de resultados for igual ao limite
      setHasMore((restaurants?.length || 0) === limit);
    } catch (err: any) {
      console.error("Error fetching nearby restaurants:", err);
      setError(err);
      setHasMore(false); // Em caso de erro, assume que não há mais
    } finally {
      setIsLoading(false);
    }
  }, [userLat, userLon, enabled, searchQuery, includedCategories, limit, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData, hasMore };
}