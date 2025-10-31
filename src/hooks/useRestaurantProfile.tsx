import { useQuery } from '@tanstack/react-query';
import { fetchRestaurantById } from '@/integrations/supabase/restaurants';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';
import { toast } from 'sonner';
import { useAuthData } from '@/context/AuthContext'; // Import useAuthData

// Fix Error 3: Get user ID from useAuthData instead of synchronous getSession()
export const useRestaurantProfile = (restaurantId: string) => {
  const { user } = useAuthData(); // Get user from context
  const userId = user?.id || null;

  return useQuery<PublicRestaurantData | null, Error>({
    queryKey: ['restaurantProfile', restaurantId, userId],
    queryFn: () => fetchRestaurantById(restaurantId, userId),
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Removed onError to fix Error 4 (TanStack Query v5 compatibility)
  });
};