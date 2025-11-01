import { Database, Json, Restaurant as SupabaseRestaurant, MenuItem as SupabaseMenuItem, MenuCategory as SupabaseMenuCategory, GalleryImage as SupabaseGalleryImage } from './supabase'; // Import all necessary types

// Define a more specific type for restaurant data that is publicly visible
// This now correctly includes all fields from the base SupabaseRestaurant type.
export type PublicRestaurantData = Database['public']['Tables']['restaurants']['Row'] & {
  distance_km?: number; // For nearby restaurants
};

export type RestaurantMenuItem = SupabaseMenuItem;
export type RestaurantMenuCategory = SupabaseMenuCategory;
export type RestaurantGalleryImage = SupabaseGalleryImage;

export type RestaurantWithSchedule = PublicRestaurantData & {
  schedule: Json; // Use Json for schedule as it's a complex object
};

export type RestaurantWithMenu = PublicRestaurantData & {
  menuCategories: RestaurantMenuCategory[];
};

export type RestaurantWithGallery = PublicRestaurantData & {
  gallery: RestaurantGalleryImage[];
};

export interface SocialNetworkLink {
  platform: string;
  url: string;
}