import { Database } from '../lib/database.types';

// Tipos base do Supabase
export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserFavorite = Database['public']['Tables']['user_favorites']['Row'];
export type UserSearchLocation = Database['public']['Tables']['user_search_locations']['Row'];
export type RestaurantGallery = Database['public']['Tables']['restaurant_gallery']['Row'];

// Tipos de Menu
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];

// Tipos de Relação
export type MenuCategoryWithItems = MenuCategory & {
  menu_items: MenuItem[];
};

// Tipos de Relação Complexa
export type RestaurantWithGallery = Restaurant & {
  restaurant_gallery: RestaurantGallery[];
};

export type RestaurantWithMenu = Restaurant & {
  menu_categories: MenuCategoryWithItems[];
};