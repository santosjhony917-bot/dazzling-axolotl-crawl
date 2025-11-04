import { SocialNetworkLink } from './types/restaurant';
import { Database, Json, Restaurant as SupabaseRestaurant, MenuItem as SupabaseMenuItem, MenuCategory as SupabaseMenuCategory, GalleryImage as SupabaseGalleryImage } from './types/supabase';

export * from './types/restaurant';

export type PaymentMethod = 'credit_card' | 'debit_card' | 'cash' | 'pix';
export type SocialNetwork = SocialNetworkLink;

export type Restaurant = SupabaseRestaurant;