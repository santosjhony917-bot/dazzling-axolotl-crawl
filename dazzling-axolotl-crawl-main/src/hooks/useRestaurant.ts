import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';

const fetchRestaurant = async (id: string | undefined): Promise<Restaurant | null> => {
  if (!id) {
    return null;
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching restaurant:', error.message);
    throw new Error(error.message);
  }

  return data;
};

export const useRestaurant = (id: string | undefined) => {
  const { data, error, mutate, isLoading } = useSWR(
    id ? `restaurant-${id}` : null,
    () => fetchRestaurant(id)
  );

  return {
    restaurant: data,
    isLoading,
    error,
    mutate,
  };
};