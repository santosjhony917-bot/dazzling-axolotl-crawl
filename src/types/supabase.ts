import { Database as DB, Json as DBJson } from "@/lib/database.types";
import { WeekSchedule as ScheduleWeekSchedule } from './schedule';

export type Json = DBJson;
export type Database = DB;

export type Restaurant = DB['public']['Tables']['restaurants']['Row'] & {
  followers_override?: number | null;
  payment_methods?: string[] | null;
  social_networks?: Json | null; // Assuming social_networks is stored as JSONB
};
export type Profile = DB['public']['Tables']['profiles']['Row'] & {
  phone?: string | null;
};
export type MenuItem = DB['public']['Tables']['menu_items']['Row'];
export type MenuCategory = DB['public']['Tables']['menu_categories']['Row'];
export type GalleryImage = DB['public']['Tables']['restaurant_gallery']['Row'];
export type ScheduledMetric = DB['public']['Tables']['scheduled_metrics']['Row'];
export type UserFavorite = DB['public']['Tables']['user_favorites']['Row'];

export type RestaurantWithDistance = Restaurant & {
  distance_km: number;
};

export type RestaurantPlan = DB['public']['Enums']['restaurant_plan'];

export type MenuCategoryWithItems = MenuCategory & {
  menu_items: MenuItem[];
};

export type FavoriteRestaurant = UserFavorite & {
  restaurant: Restaurant;
};

export type WeekSchedule = ScheduleWeekSchedule;