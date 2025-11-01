import { Database, Json } from './supabase'; // Import all necessary types

// Define a more specific type for restaurant data that is publicly visible
// This now correctly includes all fields from the base SupabaseRestaurant type.
export type PublicRestaurantData = Database['public']['Tables']['restaurants']['Row'] & {
  distance_km?: number; // For nearby restaurants
  addressSummary?: string; // Calculated field
  followersCount?: number; // Calculated field
  // Manually adding properties that might be missing from stale supabase types
  whatsapp_url?: string | null;
  ifood_url?: string | null;
  other_url?: string | null;
  external_url?: string | null;
};

export type RestaurantMenuItem = Database['public']['Tables']['menu_items']['Row'];
export type RestaurantMenuCategory = Database['public']['Tables']['menu_categories']['Row'];
export type RestaurantGalleryImage = Database['public']['Tables']['restaurant_gallery']['Row'];

export type RestaurantWithSchedule = PublicRestaurantData & {
  schedule: Json; // Use Json for schedule as it's a complex object
};

export type RestaurantWithMenu = PublicRestaurantData & {
  menuCategories: (RestaurantMenuCategory & { menu_items: RestaurantMenuItem[] })[];
};

export type RestaurantWithGallery = PublicRestaurantData & {
  gallery: RestaurantGalleryImage[];
};

export interface SocialNetworkLink {
  platform: string;
  url: string;
}