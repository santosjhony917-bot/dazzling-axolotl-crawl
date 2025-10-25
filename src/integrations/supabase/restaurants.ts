import { supabase } from './client';
import { Restaurant } from '@/types/restaurant';

/**
 * Fetches a single restaurant by its ID.
 */
export async function fetchRestaurantById(id: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching restaurant by ID:', error);
    throw new Error(error.message);
  }
  return data as Restaurant | null;
}

/**
 * Calls the PostgreSQL function to find nearby restaurants.
 */
export async function findNearbyRestaurants(
  userLat: number, 
  userLng: number, 
  maxDistanceKm: number, 
  searchQuery: string = ''
): Promise<Restaurant[]> {
  const { data, error } = await supabase.rpc('find_nearby_restaurants', {
    user_lat: userLat,
    user_lng: userLng,
    max_distance_km: maxDistanceKm,
    search_query: searchQuery || null,
  });

  if (error) {
    console.error('Error calling find_nearby_restaurants:', error);
    throw new Error(error.message);
  }
  
  // The RPC returns data matching the Restaurant structure, including distance_km
  return data as Restaurant[];
}