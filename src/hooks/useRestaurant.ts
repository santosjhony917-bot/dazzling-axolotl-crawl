import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Restaurant } from '@/types/supabase';

const fetchRestaurant = async (userId: string | undefined): Promise<Restaurant | null> => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
    throw new Error(error.message);
  }

  return data as Restaurant | null;
};

export const useRestaurant = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;

  return useQuery<Restaurant | null, Error>({
    queryKey: ['restaurant', userId],
    queryFn: () => fetchRestaurant(userId),
    enabled: !!userId && !isAuthLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};