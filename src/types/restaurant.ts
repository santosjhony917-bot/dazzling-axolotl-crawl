import { WeekSchedule } from './schedule';

export type RestaurantPlan = 'free' | 'basic' | 'premium';

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

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  items?: MenuItem[]; // Opcional para carregar itens aninhados
}

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  address: string | null;
  number: string | null;
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
  plan: RestaurantPlan;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  opening_hours: WeekSchedule | null;
  
  // Propriedade adicionada pela função RPC find_nearby_restaurants
  distance_km?: number; 
}