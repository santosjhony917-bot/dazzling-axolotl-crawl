export type RestaurantPlan = 'free' | 'premium' | 'enterprise';

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null; // Logo
  cover_image_url?: string | null; // Capa
  address?: string | null;
  plan: RestaurantPlan;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  neighborhood?: string | null;
  phone?: string | null;
  email?: string | null;
  cnpj?: string | null;
  category?: string | null;
  whatsapp_url?: string | null;
  ifood_url?: string | null;
  other_url?: string | null;
  opening_hours?: any | null;
}