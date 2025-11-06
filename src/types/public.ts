import { Restaurant, MenuCategory, MenuItem, GalleryImage } from './supabase';
import { WeekSchedule } from './schedule'; // Import WeekSchedule
import { Json } from './supabase'; // Import Json type for explicit casting if needed

// Define SocialNetworkLink here as it's a custom type not directly from Supabase
export interface SocialNetworkLink {
  platform: string;
  url: string;
}

// PublicRestaurantData extends Restaurant, but overrides specific JSONB fields with refined types
export interface PublicRestaurantData extends Omit<Restaurant, 'opening_hours' | 'social_networks' | 'payment_methods' | 'other_url_label'> {
  addressSummary: string;
  logoUrl: string | null;
  coverImageUrl: string | null; // Adicionado para consistência
  followers_count: number;
  menu_categories: (MenuCategory & { menu_items: MenuItem[] })[];
  gallery_images: GalleryImage[];
  payment_methods: string[] | null; // Refined type
  isOpen: boolean;
  statusText: string;
  nextOpenTime: string | null;
  is_favorite: boolean;
  opening_hours: WeekSchedule | null; // Refined type
  social_networks: SocialNetworkLink[] | null; // Refined type
  other_url_label: string | null; // Refined type
  isPremium: boolean; // Adicionado para consistência
  isCompact?: boolean; // Adicionado para controlar o modo compacto
}