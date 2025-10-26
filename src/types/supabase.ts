// Tipos de planos de restaurante
export type RestaurantPlan = 'free' | 'premium' | 'premium_gift';

// Tipos de dados para a tabela 'restaurants'
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
  opening_hours: any | null; // Usar 'any' ou definir um tipo JSONB mais específico
  created_at: string;
  external_url: string | null;
}

// Tipos de dados para a tabela 'menu_categories'
export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

// Tipos de dados para a tabela 'menu_items'
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

// Tipos de dados para a tabela 'profiles'
export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

// Tipos de dados para a tabela 'restaurant_gallery'
export interface GalleryImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
  created_at: string;
}

// Tipos de dados para a tabela 'user_favorites'
export interface UserFavorite {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
}

// Tipos de dados para a tabela 'user_search_locations'
export interface UserSearchLocation {
  id: string;
  user_id: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
  cep: string | null;
}