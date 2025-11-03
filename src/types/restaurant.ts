import { Json } from './supabase'; // Assumindo que 'Json' é um tipo existente ou será definido

export type RestaurantPlan = 'free' | 'basic' | 'premium';

export type DaySchedule = {
  open: string; // e.g., "09:00"
  close: string; // e.g., "18:00"
}[];

export interface WeekSchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
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

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  is_popular: boolean;
  created_at: string;
  menu_items: MenuItem[];
}

export interface RestaurantGalleryItem {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
  created_at: string;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
}

export interface SocialNetworkLink {
  platform: string;
  url: string;
}

export interface RestaurantProfile {
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
  opening_hours: WeekSchedule | null; // Alterado para WeekSchedule
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: Json | null; // Assuming Json type from Supabase
  social_networks: SocialNetworkLink[] | null; // Alterado para SocialNetworkLink[]
  other_url_label: string | null;

  // Campos adicionados via RPC ou processamento no frontend
  followers_count: number;
  isOpen: boolean;
  statusText: string;
  distance: number | null;
  is_favorite: boolean;
  fullAddress: string;
  addressSummary: string;

  // Relações
  restaurant_gallery: RestaurantGalleryItem[];
  menu_categories: MenuCategory[];
  user_favorites: UserFavorite[];
}

// Alias para compatibilidade, se PublicRestaurantData for o mesmo que RestaurantProfile
export type PublicRestaurantData = RestaurantProfile;
export type AdminRestaurant = RestaurantProfile; // Alias para compatibilidade