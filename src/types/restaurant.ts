import {
  Database,
  Json,
  Restaurant as SupabaseRestaurant,
  MenuItem as SupabaseMenuItem,
  MenuCategory as SupabaseMenuCategory,
  GalleryImage as SupabaseGalleryImage,
  RestaurantPlan,
} from './supabase';
import { WeekSchedule as ScheduleWeekSchedule } from './schedule';

// Define SocialNetworkLink com base em como é usado no SalesChannelsSection.tsx
export type SocialNetworkLink = {
  platform: string;
  url: string;
};

// Estende SupabaseRestaurant com propriedades derivadas/computadas para a visualização pública
export type PublicRestaurantData = SupabaseRestaurant & {
  addressSummary: string | null; // Calculado a partir de address, city, state
  logoUrl: string | null; // Alias para image_url
  followers_count: number; // Calculado a partir de user_favorites + followers_override
  is_favorite: boolean; // Derivado de user_favorites para o usuário atual
  isOpen: boolean; // Calculado a partir de opening_hours
  statusText: string; // Calculado a partir de opening_hours
  nextOpenTime: string | null; // Calculado a partir de opening_hours
  menu_categories: (MenuCategory & { menu_items: MenuItem[] })[]; // Dados unidos
  gallery_images: GalleryImage[]; // Dados unidos
  payment_methods: string[] | null; // Convertido de Json
  social_networks: SocialNetworkLink[] | null; // Convertido de Json
};

// Re-exportando tipos que podem ser importados de '@/types/restaurant' em outros lugares
export type MenuItem = SupabaseMenuItem;
export type MenuCategory = SupabaseMenuCategory;
export type GalleryImage = SupabaseGalleryImage;
export type Restaurant = SupabaseRestaurant; // Mantém o tipo original SupabaseRestaurant como Restaurant
export type WeekSchedule = ScheduleWeekSchedule;