import { Database, Json, Restaurant as SupabaseRestaurant, MenuItem as SupabaseMenuItem, MenuCategory as SupabaseMenuCategory, GalleryImage as SupabaseGalleryImage } from './supabase'; // Import all necessary types

// Define a more specific type for restaurant data that is publicly visible
// Instead of Omit, we explicitly list the fields that are part of the public view
// and make sensitive ones optional or remove them if truly not public.
export type PublicRestaurantData = SupabaseRestaurant & {
  distance_km?: number; // For nearby restaurants
  // All fields from SupabaseRestaurant are included, but some might be null/undefined
  // based on RLS policies or if they are not set.
  // We ensure that fields used in public layouts are present here.
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