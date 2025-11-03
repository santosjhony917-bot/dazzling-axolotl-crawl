import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantWithDistance, MenuCategory, MenuItem, GalleryImage, PublicRestaurantData } from '@/types'; // Importando de '@/types'

export const fetchPublicRestaurantById = async (id: string): Promise<PublicRestaurantData | null> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching public restaurant:', error);
    return null;
  }
  return data;
};

export const fetchRestaurants = async (): Promise<Restaurant[]> => {
  const { data, error } = await supabase.from('restaurants').select('*');
  if (error) throw error;
  return data;
};

export const fetchRestaurantById = async (id: string): Promise<Restaurant | null> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const createRestaurant = async (restaurant: Omit<Restaurant, 'id' | 'created_at'>): Promise<Restaurant> => {
  const { data, error } = await supabase
    .from('restaurants')
    .insert(restaurant)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateRestaurant = async (id: string, updates: Partial<Restaurant>): Promise<Restaurant> => {
  const { data, error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteRestaurant = async (id: string): Promise<void> => {
  const { error } = await supabase.from('restaurants').delete().eq('id', id);
  if (error) throw error;
};

export const findNearbyRestaurants = async (
  user_lat: number,
  user_lng: number,
  max_distance_km: number = 10,
  search_query: string | null = null
): Promise<RestaurantWithDistance[]> => {
  const { data, error } = await supabase.rpc('find_nearby_restaurants', {
    user_lat,
    user_lng,
    max_distance_km,
    search_query,
  });

  if (error) {
    console.error('Error calling find_nearby_restaurants:', error);
    throw error;
  }

  return data || [];
};

export const fetchRestaurantCategories = async (restaurantId: string): Promise<MenuCategory[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
};

export const fetchCategoryItems = async (categoryId: string): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
};

export const fetchRestaurantGallery = async (restaurantId: string): Promise<GalleryImage[]> => {
  const { data, error } = await supabase
    .from('restaurant_gallery')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
};