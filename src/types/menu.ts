import { RestaurantPlan } from "./restaurant";

export type RestaurantMenuItem = {
    item_id: string;
    item_name: string;
    item_description: string | null;
    item_price: number;
    item_image_url: string | null;
    restaurant_id: string;
    restaurant_name: string;
    restaurant_category: string | null;
};

export type MenuCategory = {
    id: string;
    restaurant_id: string;
    name: string;
    order_index: number;
    is_active: boolean;
    created_at: string;
};

export type MenuItem = {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    order_index: number;
    is_active: boolean;
    created_at: string;
};