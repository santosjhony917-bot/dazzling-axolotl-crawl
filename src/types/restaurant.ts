import { Restaurant, MenuCategory, MenuItem } from './supabase';

// Tipo para o objeto retornado pelo usePublicRestaurant (inclui campos computados)
export type PublicRestaurantData = Restaurant & {
  addressSummary: string | null;
  logoUrl: string | null;
  followersCount: number;
};

// Tipos de Menu
export type MenuCategoryWithItems = MenuCategory & {
  menu_items: MenuItem[];
};