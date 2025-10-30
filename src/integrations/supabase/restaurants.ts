import { PublicRestaurantData, PublicMenuCategory } from '@/types/restaurant';
import { supabase } from './client';
import { RestaurantWithDistance } from '@/types/supabase';

/**
 * Fetches public restaurant data by ID, including related computed fields and relationships.
 * This function is used for the public profile view.
 */
export async function fetchPublicRestaurantById(restaurantId: string): Promise<PublicRestaurantData> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      logoUrl:image_url,
      addressSummary:address,
      followers_count:count_restaurant_followers(restaurant_id),
      menu_categories (
        id, name, order_index, is_active,
        menu_items (id, category_id, name, description, price, image_url, order_index, is_active, created_at)
      ),
      gallery_images:restaurant_gallery (id, image_url, caption, order_index)
    `)
    .eq('id', restaurantId)
    .single();

  if (error) {
    console.error('Supabase fetchPublicRestaurantById error:', error);
    throw new Error(error.message);
  }

  // Supabase returns the count function result as an array of objects, 
  // we need to extract the count value.
  const followersCount = Array.isArray(data.followers_count) && data.followers_count.length > 0
    ? data.followers_count[0].count_restaurant_followers
    : (data.followers_override || 0);

  // Map the data to the PublicRestaurantData interface
  const result: PublicRestaurantData = {
    ...data,
    followers_count: followersCount,
    menu_categories: (data.menu_categories || []) as PublicMenuCategory[],
    gallery_images: data.gallery_images || [],
    addressSummary: [data.address, data.number, data.city, data.state]
      .filter(Boolean)
      .join(', '),
    logoUrl: data.image_url,
  };

  return result;
}

/**
 * Fetches nearby restaurants using the find_nearby_restaurants stored procedure.
 */
export async function fetchNearbyRestaurants(
  userLat: number, 
  userLng: number, 
  maxDistanceKm: number = 10, 
  searchQuery: string | null = null
): Promise<RestaurantWithDistance[]> {
  const { data, error } = await supabase.rpc('find_nearby_restaurants', {
    user_lat: userLat,
    user_lng: userLng,
    max_distance_km: maxDistanceKm,
    search_query: searchQuery,
  });

  if (error) {
    console.error('Supabase fetchNearbyRestaurants error:', error);
    throw new Error(error.message);
  }

  return data as RestaurantWithDistance[];
}