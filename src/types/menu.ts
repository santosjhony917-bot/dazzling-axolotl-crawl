import { MenuItem as SupabaseMenuItem, MenuCategory as SupabaseMenuCategory } from './supabase';

// Re-exportando o tipo base do Supabase para uso em formulários de gerenciamento
export type MenuItem = SupabaseMenuItem;
export type MenuCategory = SupabaseMenuCategory;

// Tipo para um item de menu no contexto público
export type PublicMenuItem = Pick<MenuItem, 'id' | 'name' | 'description' | 'price' | 'image_url'> & {
  // Adicione campos extras se necessário, como se é favorito
  is_favorite?: boolean;
};

// Tipo para uma categoria de menu no contexto público
export type PublicMenuCategory = Pick<MenuCategory, 'id' | 'name'> & {
  menu_items: PublicMenuItem[];
};

// Tipo de retorno esperado do hook usePublicMenu
export interface UsePublicMenuResult {
  menu: PublicMenuCategory[];
  isLoading: boolean;
  error: Error | null;
}