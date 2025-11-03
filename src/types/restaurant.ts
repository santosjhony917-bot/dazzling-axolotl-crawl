import { WeekSchedule } from './schedule';

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number | null;
  is_active: boolean;
  created_at: string;
};

export type MenuCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number | null;
  is_active: boolean;
  created_at: string;
  is_popular: boolean;
};

export type MenuCategoryWithItems = MenuCategory & {
  menu_items: MenuItem[];
};

export type GalleryImage = {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  order_index: number | null;
  created_at: string;
};

export type SocialNetworkLink = {
  platform: string; // e.g., 'instagram', 'facebook', 'whatsapp'
  url: string;
};

export type Restaurant = {
  id: string; // UUID
  user_id: string | null; // UUID
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'basic' | 'premium' | 'premium_gift'; // USER-DEFINED enum, agora inclui 'premium_gift'
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
  opening_hours: WeekSchedule | null; // Tipo corrigido para WeekSchedule
  created_at: string | null; // TIMESTAMP WITH TIME ZONE
  external_url: string | null;
  followers_override: number | null;
  payment_methods: string[] | null; // Assumindo jsonb array de strings
  social_networks: SocialNetworkLink[] | null; // Usando o novo tipo SocialNetworkLink
  other_url_label: string | null;

  // Campos adicionais para UI/lógica de frontend
  is_favorite?: boolean;
  followers_count?: number;
  statusText?: string;
  isOpen?: boolean;
  addressSummary?: string;
  menu_categories?: MenuCategoryWithItems[]; // Usando o novo tipo MenuCategoryWithItems
  gallery_images?: GalleryImage[]; // Usando o novo tipo GalleryImage
};

// PublicRestaurantData é um alias para Restaurant para simplificar
export type PublicRestaurantData = Restaurant;

// AdminRestaurant pode ser o mesmo que Restaurant ou ter campos adicionais se necessário
export type AdminRestaurant = Restaurant;