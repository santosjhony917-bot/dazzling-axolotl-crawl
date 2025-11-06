export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DaySchedule = {
  start: string;
  end: string;
}[];

export type WeekSchedule = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

export type Restaurant = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null; // Logo do restaurante
  cover_image_url: string | null; // Imagem de capa
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
  opening_hours: WeekSchedule | null; // Tipo corrigido para WeekSchedule
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: Json | null;
  social_networks: Json | null;
  other_url_label: string | null;
  claim_code: string | null;
  visit_status: 'Pendente' | 'Visitado' | 'Aprovado' | 'Rejeitado' | null;
  visit_notes: string | null;
};

// Tipo para dados de restaurante exibidos publicamente, com campos derivados
export type PublicRestaurantData = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null; // Mapeado de image_url
  coverImageUrl: string | null; // Mapeado de cover_image_url
  plan: 'free' | 'basic' | 'premium';
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: WeekSchedule | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  other_url_label: string | null;
  payment_methods: Json | null;
  social_networks: Json | null;
  addressSummary: string; // Ex: "Rua X, 123 - Cidade, Estado"
  followers_count: number;
  menu_categories: any[]; // Pode ser mais específico se o tipo de categoria for definido
  isPremium: boolean;
  isCompact?: boolean;
};