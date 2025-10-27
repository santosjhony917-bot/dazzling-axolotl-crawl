import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';

const fetchRestaurantById = async (id: string | undefined): Promise<Restaurant | null> => {
  if (!id) return null;

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data || null;
};

export function useRestaurantById(id: string | undefined) {
  return useQuery<Restaurant | null, Error>({
    queryKey: ['restaurant', id],
    queryFn: () => fetchRestaurantById(id),
    enabled: !!id,
  });
}