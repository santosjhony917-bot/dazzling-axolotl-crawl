import { Database, Json } from './supabase';

export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type WeekSchedule = Database['public']['Tables']['restaurants']['Row']['opening_hours'] & { [key: string]: Json };

// Type for the form used in ProfileSettingsPage
export interface RestaurantProfileFormValues {
  name: string;
  description: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: WeekSchedule;
  image_url: string | null;
  cover_image_url: string | null;
  image_file?: FileList;
  cover_image_file?: FileList;
  external_url: string | null;
}

export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];
export type GalleryImage = Database['public']['Tables']['restaurant_gallery']['Row'];

// Type for public restaurant profile data, including menu and gallery
export interface PublicRestaurantData extends Restaurant {
  is_favorite: boolean;
  followers_count: number;
  menu_categories: (MenuCategory & {
    menu_items: MenuItem[];
  })[];
  gallery_images: GalleryImage[];
}