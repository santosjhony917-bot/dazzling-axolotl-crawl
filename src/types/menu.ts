import { Database, Tables } from './database';

export type MenuItem = Tables<'menu_items'>;
export type MenuCategory = Tables<'menu_categories'>;

export type CreateCategoryPayload = Pick<MenuCategory, 'restaurant_id' | 'name'>;

export type UpdateCategoryPayload = Partial<Pick<MenuCategory, 'name' | 'is_active'>> & { id: string };

export type PublicMenuItem = {
    item_id: string;
    item_name: string;
    item_description: string | null;
    item_price: number;
    item_image_url: string | null;
    restaurant_id: string;
    restaurant_name: string;
    restaurant_category: string | null;
    item_category_id: string;
    item_category_name: string;
};