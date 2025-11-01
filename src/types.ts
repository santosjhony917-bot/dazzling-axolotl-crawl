import { Restaurant as SupabaseRestaurant, MenuCategory as SupabaseMenuCategory, MenuItem as SupabaseMenuItem, Profile as SupabaseProfile } from '@/types/supabase';

export type Restaurant = SupabaseRestaurant;
export type MenuCategory = SupabaseMenuCategory;
export type MenuItem = SupabaseMenuItem;
export type Profile = SupabaseProfile;

// Example of a combined type if needed
export type RestaurantWithCategories = Restaurant & {
  menu_categories: MenuCategory[];
};