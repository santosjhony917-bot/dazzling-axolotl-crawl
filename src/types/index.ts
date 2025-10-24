import { Session } from '@supabase/supabase-js';

export type RestaurantPlan = 'free' | 'basic' | 'premium';

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  address: string | null;
  plan: RestaurantPlan;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  category: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  opening_hours: any | null;
  cover_image_url: string | null;
  number: string | null;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
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
  created_at: string;
}

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

export interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  isPremium: boolean;
  restaurant: Restaurant | null;
}