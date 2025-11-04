import { Restaurant as SupabaseRestaurant, MenuCategory as SupabaseMenuCategory, MenuItem as SupabaseMenuItem, Profile as SupabaseProfile } from '@/types/supabase';

// Utility types
export type Restaurant = SupabaseRestaurant;
export type MenuCategory = SupabaseMenuCategory;
export type MenuItem = SupabaseMenuItem;
export type Profile = SupabaseProfile; // Tipo Profile adicionado
export type PaymentMethod = 'credit_card' | 'debit_card' | 'cash' | 'pix';
export interface SocialNetwork {
  platform: string;
  url: string;
}

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
  opening_hours?: any; // Use a more specific type if known, e.g., Jsonb
  external_url?: string;
}