import {
  Database,
  Json,
  Restaurant as SupabaseRestaurant,
  MenuItem as SupabaseMenuItem,
  MenuCategory as SupabaseMenuCategory,
  GalleryImage as SupabaseGalleryImage,
  RestaurantPlan, // Importar RestaurantPlan se for usado aqui
} from './supabase';
import { WeekSchedule as ScheduleWeekSchedule } from './schedule';

// Define SocialNetworkLink com base em como é usado no SalesChannelsSection.tsx
export type SocialNetworkLink = {
  platform: string;
  url: string;
};

// PublicRestaurantData agora é um alias para o tipo Restaurant completo do Supabase,
// garantindo que todas as propriedades, como 'phone', estejam disponíveis.
export type PublicRestaurantData = SupabaseRestaurant;

// Re-exportando tipos que podem ser importados de '@/types/restaurant' em outros lugares
export type MenuItem = SupabaseMenuItem;
export type MenuCategory = SupabaseMenuCategory;
export type GalleryImage = SupabaseGalleryImage;
export type Restaurant = SupabaseRestaurant;
export type WeekSchedule = ScheduleWeekSchedule;