import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PublicRestaurantData } from '@/types/restaurant';
import { fetchPublicRestaurantById } from '@/integrations/supabase/restaurants';

export const usePublicRestaurant = (restaurantId: string | undefined) => {
  const queryClient = useQueryClient();

  const queryInfo = useQuery<PublicRestaurantData | null, Error>({
    queryKey: ['publicRestaurant', restaurantId],
    queryFn: () => {
      if (!restaurantId) return Promise.resolve(null);
      return fetchPublicRestaurantById(restaurantId);
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    const handleSync = () => {
      queryClient.invalidateQueries({ queryKey: ['publicRestaurant', restaurantId] });
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'local-sync-restaurants-trigger') {
        queryClient.invalidateQueries({ queryKey: ['publicRestaurant', restaurantId] });
      }
    };
    window.addEventListener('local-sync-restaurants', handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('local-sync-restaurants', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [queryClient, restaurantId]);

  return {
    restaurant: queryInfo.data,
    isLoading: queryInfo.isLoading,
    error: queryInfo.error, // Retorna o objeto Error completo, não apenas a mensagem
    refetch: queryInfo.refetch, // Expondo a função refetch
  };
};