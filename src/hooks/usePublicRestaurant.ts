import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicRestaurantData } from '@/types/restaurant';
import { fetchPublicRestaurantById } from '@/integrations/supabase/restaurants';

export const usePublicRestaurant = (restaurantId: string | undefined) => {
  const { data, isLoading, error, refetch } = useQuery<PublicRestaurantData | null, Error>({
    queryKey: ['publicRestaurant', restaurantId],
    queryFn: () => {
      if (!restaurantId) return Promise.resolve(null);
      return fetchPublicRestaurantById(restaurantId);
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    restaurant: data,
    isLoading,
    error: error ? error.message : null,
    refetch, // Expondo a função refetch
  };
};