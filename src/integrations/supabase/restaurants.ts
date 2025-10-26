import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';

export async function fetchRestaurantByUserId(userId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
    console.error('Error fetching restaurant:', error);
    throw error;
  }

  return data as Restaurant | null;
}