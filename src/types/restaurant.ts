export type RestaurantPlan = 'free' | 'basic' | 'premium' | 'premium_gift';

export interface SocialNetwork {
  platform: string;
  url: string;
}

export interface PublicRestaurantData {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  image_url?: string;
  cover_image_url?: string;
  plan: RestaurantPlan;
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
  opening_hours?: any; // Pode ser mais específico se tivermos um tipo para isso
  created_at: string;
  external_url?: string;
  followers_override?: number;
  payment_methods?: any; // Pode ser mais específico se tivermos um tipo para isso
  social_networks?: SocialNetwork[];
  
  // Propriedades adicionadas pela lógica da aplicação ou funções Supabase
  is_favorite?: boolean;
  average_rating?: number; // Adicionado para resolver o erro
  followers_count?: number; // Assumindo que pode ser usado
}