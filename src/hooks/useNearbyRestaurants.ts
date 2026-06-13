import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RestaurantWithDistance {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'premium' | 'premium_gift';
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  city: string | null;
  state: string | null;
  distance_km: number;
  neighborhood?: string | null;
  visit_status?: string | null;
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
  const queryClient = useQueryClient();

  const queryInfo = useQuery<RestaurantWithDistance[], Error>({
    queryKey: ['nearbyRestaurants', userLat, userLon, maxDistanceKm, searchQuery, includedCategories, limit, offset],
    queryFn: async () => {
      if (userLat === null || userLon === null) {
        return [];
      }

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
          console.warn("Supabase RPC failed, returning mock restaurants.", error);
          return mockRestaurants;
        }

        const list = data && data.length > 0 ? data : mockRestaurants;
        return list.filter((r: any) => !r.visit_status || r.visit_status === 'Visitado');
      } catch (err) {
        console.warn("Error calling Supabase, returning mock restaurants.", err);
        return mockRestaurants;
      }
    },
    enabled: enabled && userLat !== null && userLon !== null,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  useEffect(() => {
    const handleSync = () => {
      queryClient.invalidateQueries({ queryKey: ['nearbyRestaurants'] });
    };
    window.addEventListener('local-sync-restaurants', handleSync);
    return () => {
      window.removeEventListener('local-sync-restaurants', handleSync);
    };
  }, [queryClient]);

  const hasMore = (queryInfo.data?.length || 0) === limit;

  return {
    data: queryInfo.data,
    isLoading: queryInfo.isLoading,
    error: queryInfo.error,
    refetch: queryInfo.refetch,
    hasMore
  };
};