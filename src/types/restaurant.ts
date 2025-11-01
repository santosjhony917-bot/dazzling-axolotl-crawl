import { Restaurant as SupabaseRestaurant, MenuItem as SupabaseMenuItem, MenuCategory as SupabaseMenuCategory, GalleryImage as SupabaseGalleryImage, WeekSchedule, Json } from './supabase';

export type Restaurant = SupabaseRestaurant;
export type MenuItem = SupabaseMenuItem;
export type MenuCategory = SupabaseMenuCategory;
export type GalleryImage = SupabaseGalleryImage;

export interface SocialNetworkLink {
  platform: string;
  url: string;
}

export interface PublicRestaurantData extends Omit<Restaurant, 'opening_hours' | 'social_networks' | 'image_url' | 'cover_image_url' | 'whatsapp_url' | 'ifood_url' | 'other_url'> {
  opening_hours: WeekSchedule | null; 
  payment_methods: string[] | null; 
  social_networks: SocialNetworkLink[] | null;
  is_favorite: boolean;
  followers_count: number; 
  addressSummary: string; 
  logoUrl: string | null; 
  coverImageUrl: string | null;
  whatsappUrl: string | null;
  ifoodUrl: string | null;
  otherUrl: string | null;
  isOpen: boolean;
  statusText: string;
  nextOpenTime: string | null;

  menu_categories: (MenuCategory & {
    menu_items: MenuItem[];
  })[];
  gallery_images: GalleryImage[];
}