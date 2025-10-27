import { Database } from './database.types';

// Tipos base extraídos do schema do Supabase
export type RestaurantPlan = Database['public']['Enums']['restaurant_plan'];
export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserFavorite = Database['public']['Tables']['user_favorites']['Row'];
export type MenuItemFavorite = Database['public']['Tables']['menu_item_favorites']['Row'];
export type RestaurantGallery = Database['public']['Tables']['restaurant_gallery']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];

// Tipos compostos
export type MenuCategoryWithItems = MenuCategory & {
  items: MenuItem[];
};

export type PublicGalleryImage = RestaurantGallery;

// Tipos de dados para hooks e contextos
export interface ProfileWithRestaurant extends Profile {
  restaurant: Restaurant | null;
}