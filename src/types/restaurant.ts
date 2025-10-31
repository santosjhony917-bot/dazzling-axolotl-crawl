import { Json } from './supabase';
import { OpeningHours } from './schedule'; // Importando OpeningHours do novo arquivo

export type RestaurantPlan = 'free' | 'basic' | 'premium';

// O tipo OpeningHours agora é importado de schedule.ts
export { OpeningHours };

export interface RestaurantGalleryImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number;
  is_active: boolean;
  is_favorite: boolean;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  menu_items: MenuItem[];
}

// Tipo base para dados de restaurante (usado em hooks e settings)
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
  opening_hours: OpeningHours[] | null; // Array de OpeningHours (formato DB)
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
}


export interface PublicRestaurantData extends Restaurant {
  // Computed fields
  followers_count: number;
  is_favorite: boolean;
  distance_km?: number;
  addressSummary: string;
  isOpen: boolean;
  statusText: string;
  
  // Relations
  menu_categories: MenuCategory[];
  gallery_images: RestaurantGalleryImage[];
}

export interface UserSearchLocation {
  id: string;
  user_id: string;
  address: string;
  latitude: number;
  longitude: number;
  cep: string | null;
  created_at: string;
}