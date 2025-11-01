import { Json } from './supabase';
import { WeekSchedule, DBWeekSchedule } from './schedule';

// --- Menu Types ---
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

// --- Gallery Type ---
export interface GalleryImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
  created_at: string;
}

// --- Social Network Type ---
export interface SocialNetworkLink {
  type: 'instagram' | 'facebook' | 'twitter' | 'website' | 'other';
  url: string;
}

// --- Core Restaurant Types ---
export type RestaurantPlan = 'free' | 'basic' | 'premium' | 'premium_gift';

export interface BaseRestaurant {
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
  opening_hours: DBWeekSchedule | null; // Raw DB structure
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: string[] | null; // Assuming payment methods are stored as an array of strings in JSONB
  social_networks: SocialNetworkLink[] | null;
}

// Type used for public facing data, including computed fields and related data
export interface PublicRestaurantData extends BaseRestaurant {
  // Computed fields added during fetching/processing
  addressSummary: string | null;
  followers_count: number;
  is_favorite: boolean;
  isOpen: boolean;
  statusText: string;
  
  // Related data fetched alongside the restaurant
  menu_categories: MenuCategoryWithItems[] | null;
  gallery_images: GalleryImage[] | null;
}

export type Restaurant = BaseRestaurant;

export { GalleryImage as RestaurantGalleryImage };