import {
  Restaurant as SupabaseRestaurant,
  MenuCategory as SupabaseMenuCategory,
  MenuItem as SupabaseMenuItem,
  Profile as SupabaseProfile,
  MenuSection as SupabaseMenuSection
} from '@/types/supabase';

export * from './types/menu';

// Utility types
export type Restaurant = SupabaseRestaurant;
export type MenuCategory = SupabaseMenuCategory;
export type MenuItem = SupabaseMenuItem;
export type Profile = SupabaseProfile;
export type MenuSection = SupabaseMenuSection;

// Form types
export interface RestaurantFormValues {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  category?: string;
  whatsapp_url?: string;
  ifood_url?: string;
  other_url?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  opening_hours?: any;
  external_url?: string;
}
