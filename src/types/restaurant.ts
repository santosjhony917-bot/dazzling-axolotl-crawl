import { Database } from '@/types/supabase';

export type RestaurantPlan = Database['public']['Enums']['restaurant_plan'];

export interface PublicMenuItem {
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

export interface PublicMenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number | null;
  is_active: boolean | null;
  created_at: string;
  menu_items: PublicMenuItem[]; // Adicionado para resolver erros 1 e 2
}

export interface RestaurantGalleryImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number | null;
  created_at: string;
}

export interface PublicRestaurantData {
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
  opening_hours: any | null;
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  logoUrl: string | null;
  
  addressSummary: string | null;
  followers_count: number;
  menu_categories: PublicMenuCategory[]; // Tipo atualizado
  gallery_images: RestaurantGalleryImage[];
}

export type Restaurant = Database['public']['Tables']['restaurants']['Row'];