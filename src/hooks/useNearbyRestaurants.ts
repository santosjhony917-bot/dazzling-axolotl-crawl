import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantWithDistance } from '@/lib/types';

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

    const mockRestaurants: RestaurantWithDistance[] = [
      {
        id: 'mock-premium-restaurant-id',
        user_id: 'mock-premium-owner-id',
        name: 'Sabor Premium Gourmet',
        description: 'Experiência gastronômica única com ingredientes selecionados e ambiente sofisticado.',
        image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
        cover_image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000',
        plan: 'premium',
        created_at: new Date().toISOString(),
        latitude: userLat,
        longitude: userLon,
        category: 'Italiana',
        city: 'São Paulo',
        state: 'SP',
        distance_km: 1.2,
        neighborhood: 'Bela Vista',
        visit_status: 'Visitado'
      },
      {
        id: 'mock-free-restaurant-id',
        user_id: 'mock-free-owner-id',
        name: 'Lancheira do Zé (Free)',
        description: 'Lanches rápidos e saborosos com aquele tempero caseiro que você adora.',
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
        cover_image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000',
        plan: 'free',
        created_at: new Date().toISOString(),
        latitude: userLat + 0.005,
        longitude: userLon + 0.005,
        category: 'Lanches',
        city: 'São Paulo',
        state: 'SP',
        distance_km: 2.5,
        neighborhood: 'Bela Vista',
        visit_status: 'Visitado'
      }
    ];

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
        console.warn("Supabase RPC failed, returning mock restaurants.", error);
        setData(mockRestaurants);
        setHasMore(false);
      } else {
        const list = restaurants && restaurants.length > 0 ? restaurants : mockRestaurants;
        setData(list.filter((r: any) => !r.visit_status || r.visit_status === 'Visitado'));
        setHasMore((restaurants?.length || 0) === limit);
      }
    } catch (err: any) {
      console.warn("Error calling Supabase, returning mock restaurants.", err);
      setData(mockRestaurants);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [userLat, userLon, enabled, searchQuery, includedCategories, limit, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData, hasMore };
}