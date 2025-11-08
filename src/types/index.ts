export type RestaurantPlan = 'free' | 'basic' | 'premium' | 'premium_gift';
export type BannerTargetAudience = 'user' | 'restaurant_owner' | 'admin';
export type BannerTextPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
export type BannerTextSize = 'sm' | 'md' | 'lg';
export type VisitStatusEnum = 'Pendente' | 'Visitado' | 'Nao Visitado';

export interface RestaurantGalleryItem {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number | null;
  created_at: string | null;
}

export interface PublicRestaurantData {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: RestaurantPlan;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  category: string | null;
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
  opening_hours: any | null; // jsonb
  created_at: string | null;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: any | null; // jsonb
  social_networks: any | null; // jsonb
  other_url_label: string | null;
  claim_code: string | null;
  visit_status: VisitStatusEnum | null;
  visit_notes: string | null;
  is_favorite: boolean; // Adicionado para uso no cliente
  gallery: RestaurantGalleryItem[]; // Adicionado para uso no cliente
}