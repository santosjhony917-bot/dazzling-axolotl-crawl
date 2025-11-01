import { MenuItem as SupabaseMenuItem, MenuCategory as SupabaseMenuCategory } from './supabase';

export type MenuItem = SupabaseMenuItem;
export type MenuCategory = SupabaseMenuCategory;

// --- Public Menu Types ---

// Item de menu simplificado para visualização pública
export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_favorite?: boolean; // Adicionado para contexto de cliente
}

// Categoria de menu para visualização pública (contém apenas itens ativos)
export interface PublicMenuCategory extends MenuCategory {
  menu_items: PublicMenuItem[];
}

// Resultado do hook usePublicMenu
export interface UsePublicMenuResult {
  menu: PublicMenuCategory[];
  isLoading: boolean;
  error: Error | null;
}

// --- Management Payloads ---

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
  order_index?: number; // Adicionado order_index
};

export type UpdateCategoryPayload = {
  id: string;
  updates: Partial<CreateCategoryPayload>;
};