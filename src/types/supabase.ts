export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// --- Enums ---
export type RestaurantPlan = 'free' | 'basic' | 'premium' | 'premium_gift';

// --- Tables Types ---

export interface Restaurant {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: RestaurantPlan;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  category: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: Json | null; // Assuming JSONB structure
  created_at: string;
  external_url: string | null;
  followers_override: number | null; // NOVO CAMPO ADICIONADO
  // Note: followersCount is added by RPC/select query, not a direct column
}

export interface RestaurantWithDistance extends Restaurant {
  distance_km: number;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  updated_at: string | null;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number | null;
  is_active: boolean | null;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number | null;
  is_active: boolean | null;
  created_at: string;
}

export interface MenuCategoryWithItems extends MenuCategory {
  menu_items: MenuItem[];
}

export interface GalleryImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number | null;
  created_at: string;
}

// Placeholder for FavoriteRestaurant if needed, based on user_favorites table structure
export interface FavoriteRestaurant {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
}