import { useQuery } from '@tanstack/react-query';
import { fetchRestaurantById } from '@/integrations/supabase/restaurants';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant'; // Usando PublicRestaurantData
import { toast } from 'sonner';

export const useRestaurantProfile = (restaurantId: string) => {
  const { data: userData } = supabase.auth.getSession();
  const userId = userData?.session?.user.id || null;

  return useQuery<PublicRestaurantData | null, Error>({
    queryKey: ['restaurantProfile', restaurantId, userId],
    queryFn: () => fetchRestaurantById(restaurantId, userId),
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    onError: (err) => {
      toast.error(`Erro ao carregar perfil: ${err.message}`);
    },
  });
};