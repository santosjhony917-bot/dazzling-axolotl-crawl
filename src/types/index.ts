export type RestaurantPlan = 'free' | 'basic' | 'premium';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number | null;
  is_active: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  order_index: number | null;
  is_active: boolean;
  is_popular: boolean;
  menu_items: MenuItem[];
}

export interface OpeningHours {
  day: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface PaymentMethod {
  name: string;
  icon?: string; // Assuming an icon URL or name
}

export interface SocialNetwork {
  platform: string;
  url: string;
  icon?: string;
}

export interface PublicRestaurantData {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null; // Logo URL
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
  opening_hours: OpeningHours[] | null;
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: PaymentMethod[] | null;
  social_networks: SocialNetwork[] | null;
  other_url_label: string | null;
  claim_code: string | null;
  visit_status: string | null;
  visit_notes: string | null;
  
  // Custom fields added by the frontend logic
  is_favorite: boolean;
  followers_count: number;
  menu_categories: MenuCategory[];
}