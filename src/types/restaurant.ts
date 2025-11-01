import { Database, Json, Restaurant as SupabaseRestaurant, MenuItem as SupabaseMenuItem, MenuCategory as SupabaseMenuCategory, GalleryImage as SupabaseGalleryImage } from './supabase';
import { WeekSchedule as ScheduleWeekSchedule } from './schedule'; // Import the correct schedule type

export type Restaurant = SupabaseRestaurant;
// Use the correct schedule type
export type WeekSchedule = ScheduleWeekSchedule; 

export type MenuItem = SupabaseMenuItem;
export type MenuCategory = SupabaseMenuCategory;
export type GalleryImage = SupabaseGalleryImage;

// Tipo para um link de rede social
export interface SocialNetworkLink {
  platform: string; // Ex: 'Instagram', 'Facebook', 'Website'
  url: string;
}

// Type for public restaurant profile data, including menu and gallery
export interface PublicRestaurantData extends Omit<Restaurant, 'opening_hours' | 'social_networks'> {
  // CORREÇÃO 1: Sobrescrevendo opening_hours para usar o tipo WeekSchedule
  opening_hours: WeekSchedule | null; 
  
  // NOVO: Formas de pagamento (Assumindo que o JSONB armazena string[])
  payment_methods: string[] | null; 
  
  // NOVO: Redes sociais (Assumindo que o JSONB armazena SocialNetworkLink[])
  social_networks: SocialNetworkLink[] | null;
  
  // Computed fields from the view/query
  is_favorite: boolean;
  followers_count: number; 
  addressSummary: string; 
  logoUrl: string | null; 
  
  // NOVO: Status de abertura
  isOpen: boolean;
  statusText: string;
  nextOpenTime: string | null;

  // Aggregated relations (CORREÇÃO 2: menu_categories deve incluir menu_items)
  menu_categories: (MenuCategory & {
    menu_items: MenuItem[];
  })[];
  gallery_images: GalleryImage[];
}