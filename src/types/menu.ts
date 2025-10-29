import { Database } from './supabase';

export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];

// Payloads for mutations
export type CreateItemPayload = {
  category_id: string;
  name: string;
  price: number;
  is_active: boolean;
  description: string | null;
  image_url: string | null;
};

export type UpdateItemPayload = {
  id: string;
  updates: Partial<CreateItemPayload>;
};

export type CreateCategoryPayload = {
  restaurant_id: string;
  name: string;
  is_active: boolean;
};

export type UpdateCategoryPayload = {
  id: string;
  updates: Partial<CreateCategoryPayload>;
};