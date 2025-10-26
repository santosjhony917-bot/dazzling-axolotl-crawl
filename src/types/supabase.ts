// Baseado no esquema do Supabase fornecido

export type RestaurantPlan = 'free' | 'basic' | 'premium' | 'premium_gift';

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
  opening_hours: any | null; // jsonb
  created_at: string | null;
  external_url: string | null;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  // Adicionando campo derivado para consistência com useAuthProfile
  is_admin?: boolean; 
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number | null;
  is_active: boolean | null;
  created_at: string | null;
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
  created_at: string | null;
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export interface GalleryImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number | null;
  created_at: string | null;
}

export interface UserSession {
  id: string;
  email: string;
  role: 'authenticated' | 'restaurant_owner' | 'admin';
  profile: Profile | null;
  restaurant: Restaurant | null;
}