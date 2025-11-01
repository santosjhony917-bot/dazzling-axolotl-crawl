import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantWithDistance, MenuCategory, MenuItem, GalleryImage } from '@/types/supabase';
import { PublicRestaurantData } from '@/types/restaurant';

// Fetch a single restaurant by ID for public view
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

// Fetch all menu categories for a restaurant, including their items
export const fetchRestaurantMenu = async (restaurantId: string): Promise<MenuCategory[] | null> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select(`
      *,
      menu_items (
        *
      )
    `)
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'menu_items', ascending: true });

  if (error) {
    console.error('Error fetching restaurant menu:', error);
    return null;
  }
  return data;
};

// Fetch gallery images for a restaurant
export const fetchRestaurantGallery = async (restaurantId: string): Promise<GalleryImage[] | null> => {
  const { data, error } = await supabase
    .from('restaurant_gallery')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching restaurant gallery:', error);
    return null;
  }
  return data;
};

// Fetch a single menu item by ID
export const fetchMenuItemById = async (itemId: string): Promise<MenuItem | null> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) {
    console.error('Error fetching menu item:', error);
    return null;
  }
  return data;
};

// Fetch nearby restaurants using RPC function
export const fetchNearbyRestaurants = async (userLat: number, userLng: number, maxDistanceKm: number = 10, searchQuery: string | null = null): Promise<RestaurantWithDistance[] | null> => {
  const { data, error } = await supabase.rpc('find_nearby_restaurants', {
    user_lat: userLat,
    user_lng: userLng,
    max_distance_km: maxDistanceKm,
    search_query: searchQuery,
  });

  if (error) {
    console.error('Error fetching nearby restaurants:', error);
    return null;
  }
  return data;
};

// Fetch a single restaurant by ID for owner view
export const fetchRestaurantById = async (id: string): Promise<Restaurant | null> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching restaurant:', error);
    return null;
  }
  return data;
};