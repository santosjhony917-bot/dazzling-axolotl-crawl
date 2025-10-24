export type RestaurantPlan = 'free' | 'premium';

export interface Restaurant {
  id: string;
  user_id: string;
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
  latitude: number | null;
  longitude: number | null;
  opening_hours: any | null; // JSONB type
  created_at: string;
}

// Tipo usado quando o restaurante é retornado por uma função de proximidade (find_nearby_restaurants)
export interface RestaurantWithDistance extends Restaurant {
  distance_km: number;
}