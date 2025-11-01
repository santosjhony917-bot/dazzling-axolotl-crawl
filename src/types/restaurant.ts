import { Database } from './supabase';

export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];
export type RestaurantGalleryItem = Database['public']['Tables']['restaurant_gallery']['Row'];

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  open: string; // e.g., "08:00"
  close: string; // e.g., "18:00"
}

export type WeekSchedule = Record<WeekDay, TimeSlot[] | null>;

export interface SocialNetworkLink {
  type: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  url: string;
}

export interface MenuItemWithFavorites extends MenuItem {
  is_favorite: boolean;
}

export interface MenuCategoryWithItems extends MenuCategory {
  menu_items: MenuItemWithFavorites[];
}

export interface PublicRestaurantData extends Restaurant {
  menu_categories: MenuCategoryWithItems[];
  gallery: RestaurantGalleryItem[];
}