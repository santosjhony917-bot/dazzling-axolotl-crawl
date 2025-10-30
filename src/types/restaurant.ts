import { Database, Json, Restaurant as SupabaseRestaurant, MenuItem as SupabaseMenuItem, MenuCategory as SupabaseMenuCategory, GalleryImage as SupabaseGalleryImage } from './supabase';
import { WeekSchedule as ScheduleWeekSchedule } from './schedule'; // Import the correct schedule type

export type Restaurant = SupabaseRestaurant;
// Use the correct schedule type
export type WeekSchedule = ScheduleWeekSchedule; 

export type MenuItem = SupabaseMenuItem;
export type MenuCategory = SupabaseMenuCategory;
export type GalleryImage = SupabaseGalleryImage;

// Type for public restaurant profile data, including menu and gallery
export interface PublicRestaurantData extends Omit<Restaurant, 'opening_hours'> {
  // CORREÇÃO 1: Sobrescrevendo opening_hours para usar o tipo WeekSchedule
  opening_hours: WeekSchedule | null; 
  
  // Computed fields from the view/query
  is_favorite: boolean;
  followers_count: number; 
  addressSummary: string; 
  logoUrl: string | null; 
  
  // NOVO: Status de abertura
  isOpen: boolean;
  statusText: string;
  nextOpenTime: string | null;

  // Aggregated relations (CORREÇÃO 2: menu_categories deve incluir menu_items)
  menu_categories: (MenuCategory & {
    menu_items: MenuItem[];
  })[];
  gallery_images: GalleryImage[];
}