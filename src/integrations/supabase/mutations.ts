import { supabase } from './client';
import { UpdateRestaurantPayload } from '@/types/payloads';

export async function updateRestaurant(restaurantId: string, payload: UpdateRestaurantPayload) {
  const { data, error } = await supabase
    .from('restaurants')
    .update(payload)
    .eq('id', restaurantId)
    .select()
    .single();

  if (error) {
    console.error('Supabase updateRestaurant error:', error);
    throw new Error(error.message);
  }
  return data;
}