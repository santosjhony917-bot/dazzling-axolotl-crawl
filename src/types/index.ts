import { Json } from "./supabase";

export type DaySchedule = {
  open: string; // e.g., "09:00"
  close: string; // e.g., "18:00"
  is_closed: boolean;
};

export type WeekSchedule = {
  monday: DaySchedule[];
  tuesday: DaySchedule[];
  wednesday: DaySchedule[];
  thursday: DaySchedule[];
  friday: DaySchedule[];
  saturday: DaySchedule[];
  sunday: DaySchedule[];
};

export type RestaurantPlan = "free" | "basic" | "premium";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  phone: string | null;
};

export type Restaurant = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: RestaurantPlan;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  category: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  other_url_label: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: WeekSchedule | null;
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: Json | null;
  social_networks: Json | null;
};

export type RestaurantWithDistance = Restaurant & {
  distance_km: number;
};

export type MenuCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number | null;
  is_active: boolean | null;
  created_at: string;
  is_popular: boolean | null;
};

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number | null;
  is_active: boolean | null;
  created_at: string;
};

export type MenuCategoryWithItems = MenuCategory & {
  menu_items: MenuItem[];
};

export type GalleryImage = {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number | null;
  created_at: string;
};

export type FavoriteRestaurant = {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
  restaurants: Restaurant; // Assuming join with restaurant details
};

export type MenuItemFavorite = {
  id: string;
  user_id: string | null;
  menu_item_id: string | null;
  created_at: string;
  menu_items: MenuItem; // Assuming join with menu item details
};

// Para dados de perfil público, é essencialmente o tipo Restaurant
export type PublicRestaurantData = Restaurant;

// Tipos para payloads de gerenciamento de menu
export type CreateCategoryPayload = Omit<MenuCategory, 'id' | 'created_at'>;
export type UpdateCategoryPayload = Partial<Omit<MenuCategory, 'id' | 'restaurant_id' | 'created_at'>>;

export type CreateItemPayload = Omit<MenuItem, 'id' | 'created_at'>;
export type UpdateItemPayload = Partial<Omit<MenuItem, 'id' | 'category_id' | 'created_at'>>;

// Tipo para Redes Sociais
export type SocialNetwork = {
  platform: string;
  url: string;
};

export type TimeSlot = {
  start: string;
  end: string;
};