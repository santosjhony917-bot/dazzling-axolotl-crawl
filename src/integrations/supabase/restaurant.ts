import { supabase } from './client';
import { MenuCategory, MenuItem, Restaurant, GalleryImage, RestaurantWithDistance, PublicRestaurantData } from '@/types'; // Importando de '@/types'

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

export const fetchMenuItemById = async (itemId: string): Promise<MenuItem | null> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', itemId)
    .single();
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