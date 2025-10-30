export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number | null;
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
  order_index: number | null;
  is_active: boolean;
  created_at: string;
}

export type RestaurantPlan = 'free' | 'basic' | 'premium' | 'premium_gift';

export interface Restaurant {
  id: string;
  user_id: string;
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
  opening_hours: any | null; // Use a more specific type if known
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
}

// Novo tipo para dados públicos do restaurante (Erros 1, 2, 3, 4, 5, 11, 12)
export interface PublicRestaurantData extends Omit<Restaurant, 'user_id' | 'cnpj' | 'email' | 'followers_override'> {
  distance_km?: number;
  is_favorite: boolean;
  followers_count: number;
  gallery: { id: string; image_url: string; caption: string | null }[];
  menu_categories: Category[];
}