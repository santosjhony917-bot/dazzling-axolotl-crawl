import { Database } from './integrations/supabase/database.types';

// Utility types
export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row']; // Tipo Profile adicionado

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