// Define o tipo enum baseado no contexto do schema
export type RestaurantPlan = 'free' | 'premium' | 'premium_gift';

export interface Restaurant {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  address: string | null;
  plan: RestaurantPlan;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  cover_image_url: string | null;
  number: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  category: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  opening_hours: any | null; // Usando 'any' para jsonb complexo
  external_url: string | null; // NOVO CAMPO
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

export type MenuCategoryWithItems = MenuCategory & {
  items: MenuItem[];
};