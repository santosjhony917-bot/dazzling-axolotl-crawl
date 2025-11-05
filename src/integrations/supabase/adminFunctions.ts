import { supabase } from '@/integrations/supabase/client';
import { TablesInsert } from '@/types/supabase';

export type RestaurantInsertPayload = TablesInsert<'restaurants'>;

export const bulkInsertRestaurants = async (restaurants: RestaurantInsertPayload[]) => {
  const { data, error } = await supabase
    .from('restaurants')
    .insert(restaurants)
    .select();

  if (error) {
    console.error('Error bulk inserting restaurants:', error);
    throw new Error(error.message);
  }

  return data;
};