import { supabase } from './client';
import { Profile, Restaurant } from '@/types/restaurant';

/**
 * Fetches the user profile data.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
    throw new Error(error.message);
  }
  return data as Profile | null;
}

/**
 * Fetches the restaurant associated with a user ID.
 */
export async function getRestaurantByUserId(userId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  return data as Restaurant | null;
}