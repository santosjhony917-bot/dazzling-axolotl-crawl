import { Restaurant, GalleryImage } from './supabase';
import { WeekSchedule } from './schedule'; // Import WeekSchedule

// AdminRestaurant extends Restaurant, but overrides specific JSONB fields with refined types
export interface AdminRestaurant extends Omit<Restaurant, 'opening_hours' | 'social_networks' | 'payment_methods'> {
  restaurant_gallery: GalleryImage[];
  opening_hours: WeekSchedule | null; // Refined type
  social_networks: { platform: string; url: string; }[] | null; // Refined type (usando tipo inline para evitar dependência circular)
  payment_methods: string[] | null; // Refined type
}