import { Tables } from './supabase';

// Define the schedule types
export interface DaySchedule {
  open: string;
  close: string;
}

export interface WeekSchedule {
  monday?: DaySchedule[];
  tuesday?: DaySchedule[];
  wednesday?: DaySchedule[];
  thursday?: DaySchedule[];
  friday?: DaySchedule[];
  saturday?: DaySchedule[];
  sunday?: DaySchedule[];
  [key: string]: DaySchedule[] | undefined; // Add index signature for broader compatibility
}

// Define MenuCategory and MenuItem types
export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number;
  is_active: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  menu_items: MenuItem[];
  is_popular: boolean;
}

export interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
}

// Extend the base restaurant type from Supabase with the correct opening_hours type
// and other derived properties.
export type Restaurant = Tables<'restaurants'> & {
  is_favorite: boolean;
  followers_count: number;
  statusText: string;
  isOpen: boolean;
  menu_categories: MenuCategory[];
  gallery_images: GalleryImage[];
  addressSummary: string | null;
  // Override the 'opening_hours' property from Tables<'restaurants'>
  opening_hours: WeekSchedule | null;
};

// PublicRestaurantData is likely an alias or the specific type used for fetched restaurant data
export type PublicRestaurantData = Restaurant;