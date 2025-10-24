import { Restaurant } from "./restaurant";

// Tipos de Menu
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

// Tipos de Usuário/Auth
export type AppRole = 'admin' | 'premium_restaurant' | 'free_restaurant' | 'customer';

export interface UserRole {
  user_id: string;
  role: AppRole;
}

// Exportando apenas Restaurant (MenuCategory e MenuItem já são exportados acima)
export type { Restaurant };