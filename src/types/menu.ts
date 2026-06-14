import { MenuCategory as SupabaseMenuCategory, MenuItem as SupabaseMenuItem } from '@/types/supabase';

// Type for menu categories with associated restaurant name for admin view
export type MenuCategoryWithRestaurant = SupabaseMenuCategory & {
  restaurants: {
    name: string;
  };
};

// Base type for category creation/update
interface CategoryBase {
  name: string;
  is_active: boolean;
  order_index?: number;
  is_popular?: boolean;
}

export type CreateCategoryPayload = CategoryBase & {
  restaurant_id: string;
};

export type UpdateCategoryPayload = {
  id: string;
  updates: Partial<CategoryBase>;
};

// Base type for menu item creation/update
interface MenuItemBase {
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_active: boolean;
  order_index?: number;
  is_illustrative?: boolean;
}

export type CreateItemPayload = MenuItemBase & {
  category_id: string;
};

export type UpdateItemPayload = {
  id: string;
  updates: Partial<MenuItemBase>;
};

// Type for public menu items (might include favorite status)
export type PublicMenuItem = SupabaseMenuItem & {
  is_favorite?: boolean;
};