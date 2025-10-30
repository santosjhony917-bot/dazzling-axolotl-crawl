import { Database, Json, Restaurant as SupabaseRestaurant, MenuItem as SupabaseMenuItem, MenuCategory as SupabaseMenuCategory, GalleryImage as SupabaseGalleryImage } from './supabase';
import { WeekSchedule as ScheduleWeekSchedule } from './schedule'; // Import the correct schedule type

export type Restaurant = SupabaseRestaurant;
// Use the correct schedule type
export type WeekSchedule = ScheduleWeekSchedule; 

export type MenuItem = SupabaseMenuItem;
export type MenuCategory = SupabaseMenuCategory;
export type GalleryImage = SupabaseGalleryImage;

// Type for public restaurant profile data, including menu and gallery
export interface PublicRestaurantData extends Restaurant {
  // Computed fields from the view/query
  is_favorite: boolean;
  followers_count: number; // Corrected property name (was followersCount in error)
  addressSummary: string; // Computed field used in layouts

  // Aggregated relations
  menu_categories: (MenuCategory & {
    menu_items: MenuItem[];
  })[];
  gallery_images: GalleryImage[];
}