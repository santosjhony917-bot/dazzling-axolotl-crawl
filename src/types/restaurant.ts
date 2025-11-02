import { Json } from './supabase';
import { WeekSchedule } from './schedule'; // Importar WeekSchedule do novo arquivo

export type RestaurantPlan = 'free' | 'basic' | 'premium' | 'premium_gift'; // Adicionado 'premium_gift'

export type SocialNetwork = {
  platform: 'instagram' | 'facebook' | 'website' | string;
  url: string;
};

export type GalleryImage = {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
  created_at: string;
};

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
};

export type MenuCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  is_popular: boolean;
  menu_items: MenuItem[]; // Adicionado para incluir os itens do menu diretamente na categoria
};

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
  opening_hours: WeekSchedule | null;
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: Json | null;
  social_networks: SocialNetwork[] | null;
}

// PublicRestaurantData agora estende Restaurant e adiciona campos específicos para a visualização pública
export interface PublicRestaurantData extends Restaurant {
  addressSummary?: string;
  followers_count?: number;
  is_favorite?: boolean;
  isOpen?: boolean;
  statusText?: string;
  menu_categories?: MenuCategory[]; // Adicionado
  gallery_images?: GalleryImage[]; // Adicionado
}