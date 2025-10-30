import { Database, Json } from './supabase';

export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
// WeekSchedule must be compatible with Json, but we know its structure
export type WeekSchedule = {
  [key in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']: {
    open: string;
    close: string;
  }[];
} & Json; // Keep Json intersection for safety with Supabase Json type

export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];
export type GalleryImage = Database['public']['Tables']['restaurant_gallery']['Row'];

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