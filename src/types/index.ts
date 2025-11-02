export type RestaurantGalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  order_index: number | null;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number | null;
  is_active: boolean | null;
};

export type MenuCategory = {
  id: string;
  name: string;
  order_index: number | null;
  is_active: boolean | null;
  is_popular: boolean | null;
  menu_items: MenuItem[];
};

// Base type for restaurant data directly from the 'restaurants' table
export type RestaurantBase = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'basic' | 'premium';
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
  opening_hours: any | null; // jsonb type
  created_at: string | null;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: any | null; // jsonb type
  social_networks: any | null; // jsonb type
};

// Type for the data returned directly from the Supabase query (before mapping)
export type SupabaseRestaurantData = RestaurantBase & {
  restaurant_gallery: RestaurantGalleryItem[];
  menu_categories: MenuCategory[];
};

// Final type for PublicRestaurantData after mapping and adding computed properties
export type PublicRestaurantData = SupabaseRestaurantData & {
  gallery_images: RestaurantGalleryItem[]; // Mapped from restaurant_gallery
  is_favorite: boolean;
  followers_count: number;
  addressSummary: string;
  logoUrl: string | null;
  isOpen: boolean;
  statusText: string;
  nextOpenTime: string | null;
};