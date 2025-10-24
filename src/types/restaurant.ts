import { WeekSchedule } from "./schedule";

export type RestaurantPlan = 'free' | 'premium';

export interface Restaurant {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  address: string | null;
  number: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  category: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  plan: RestaurantPlan;
  opening_hours: WeekSchedule | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  
  // Adicionado para resultados de busca baseados em localização
  distance_km?: number; 
}