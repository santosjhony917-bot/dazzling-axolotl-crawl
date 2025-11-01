import { MenuItem as SupabaseMenuItem, MenuCategory as SupabaseMenuCategory } from './supabase';

export type MenuItem = SupabaseMenuItem;
export type MenuCategory = SupabaseMenuCategory;

export type MenuCategoryWithItems = SupabaseMenuCategory & {
  menu_items: SupabaseMenuItem[];
};

// Payloads for category mutations
export interface CreateCategoryPayload {
  name: string;
  is_active?: boolean;
  restaurant_id: string;
}

export interface UpdateCategoryPayload {
  id: string;
  name?: string;
  is_active?: boolean;
  order_index?: number;
}

// Payloads for item mutations
export interface CreateItemPayload {
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category_id: string;
  is_active?: boolean;
}

export interface UpdateItemPayload {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  image_url?: string;
  category_id?: string;
  is_active?: boolean;
  order_index?: number;
}