export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RestaurantPlan = 'free' | 'basic' | 'premium' | 'premium_gift';
export type VisitStatus = 'Pendente' | 'Visitado' | 'Agendado' | 'Contatado' | 'Interessado' | 'Não Interessado' | 'Não Localizado';

export interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
  phone?: string | null;
}

export interface Restaurant {
  id: string;
  user_id?: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  plan: RestaurantPlan;
  phone?: string | null;
  email?: string | null;
  cnpj?: string | null;
  category?: string | null;
  whatsapp_url?: string | null;
  ifood_url?: string | null;
  other_url?: string | null;
  address?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: Json | null;
  created_at?: string;
  external_url?: string | null;
  followers_override?: number | null;
  payment_methods?: Json | null;
  social_networks?: Json | null;
  other_url_label?: string | null;
  claim_code?: string | null;
  visit_status?: VisitStatus | null;
  visit_notes?: string | null;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index?: number | null;
  is_active?: boolean | null;
  created_at?: string;
  is_popular?: boolean | null;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  order_index?: number | null;
  is_active?: boolean | null;
  created_at?: string;
}

export interface GalleryImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption?: string | null;
  order_index: number | null;
  created_at?: string;
}

export interface MenuCategoryWithItems extends MenuCategory {
  menu_items: MenuItem[];
}

export interface RestaurantWithDistance extends Restaurant {
    distance_km: number;
    neighborhood?: string | null;
}

export interface FavoriteRestaurant {
    id: string;
    user_id: string;
    restaurant_id: string;
    created_at?: string;
    restaurants: Restaurant;
}