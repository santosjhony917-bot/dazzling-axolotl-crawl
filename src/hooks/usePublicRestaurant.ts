import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicRestaurantData } from '@/types/restaurant';
import { fetchRestaurantById } from '@/integrations/supabase/restaurants'; // Corrected import

export const usePublicRestaurant = (restaurantId: string | undefined) => {
  const { data, isLoading, error } = useQuery<PublicRestaurantData | null, Error>({
    queryKey: ['publicRestaurant', restaurantId],
    queryFn: () => {
      if (!restaurantId) return Promise.resolve(null);
      return fetchRestaurantById(restaurantId, null); // Pass null for userId since this is public
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    restaurant: data,
    isLoading,
    error: error ? error.message : null,
  };
};