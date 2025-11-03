import { useQuery } from '@tanstack/react-query';
import { RestaurantProfile } from '@/types/restaurant'; // Corrigido para RestaurantProfile
import { fetchPublicRestaurantById } from '@/integrations/supabase/restaurants';

export const usePublicRestaurant = (id: string) => {
  return useQuery<RestaurantProfile | null, Error>({
    queryKey: ['publicRestaurant', id],
    queryFn: () => fetchPublicRestaurantById(id),
    enabled: !!id,
  });
};