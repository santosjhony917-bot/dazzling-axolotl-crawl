export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RestaurantPlan = 'free' | 'premium' | 'premium_gift';
export type VisitStatus = 'Pendente' | 'Visitado' | 'Agendado' | 'Contatado' | 'Interessado' | 'Não Interessado' | 'Não Localizado';

export interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
  phone?: string | null;
}

export interface Restaurant {
  id: string;
  user_id?: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  plan: RestaurantPlan;
  phone?: string | null;
  email?: string | null;
  cnpj?: string | null;
  category?: string | null;
  whatsapp_url?: string | null;
  ifood_url?: string | null;
  other_url?: string | null;
  google_maps_url?: string | null;
  google_place_id?: string | null;
  google_maps_name?: string | null;
  ai_normalized_name?: string | null;
  name_cleanup_notes?: string | null;
  address?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: Json | null;
  created_at?: string;
  external_url?: string | null;
  followers_override?: number | null;
  payment_methods?: Json | null;
  social_networks?: Json | null;
  other_url_label?: string | null;
  claim_code?: string | null;
  is_published?: VisitStatus | boolean | null;
  visit_notes?: string | null;
  coleta_logs?: string | null;
  ai_validated?: boolean | null;
  ai_log?: string | null;
  is_deleted?: boolean | null;
  menu_status?: 'unknown' | 'found' | 'not_found' | 'unavailable' | 'manual_required' | 'blocked' | 'invalid_source' | 'failed' | null;
  menu_status_reason?: string | null;
  menu_last_checked_at?: string | null;
}

export interface ExpansionProject {
  id: string;
  name: string;
  state: string;
  slug: string;
  status: string;
  manager_name?: string | null;
  progress?: number | null;
  health_score?: number | null;
  created_at?: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index?: number | null;
  is_active?: boolean | null;
  created_at?: string;
  is_popular?: boolean | null;
  section_id?: string | null;
}

export interface MenuSection {
  id: string;
  restaurant_id: string;
  name: string;
  order_index?: number | null;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  display_name?: string | null;
  description?: string | null;
  price: number;
  display_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_type?: string | null;
  commercial_type?: string | null;
  is_configurable?: boolean | null;
  search_keywords?: string | null;
  image_url?: string | null;
  order_index?: number | null;
  is_active?: boolean | null;
  created_at?: string;
  is_illustrative?: boolean | null;
}

export interface GalleryImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption?: string | null;
  order_index: number | null;
  created_at?: string;
}

export interface MenuCategoryWithItems extends MenuCategory {
  menu_items: MenuItem[];
}

export interface RestaurantWithDistance extends Restaurant {
    distance_km: number;
    neighborhood?: string | null;
}

export interface FavoriteRestaurant {
    id: string;
    user_id: string;
    restaurant_id: string;
    restaurants: Restaurant;
}

export interface CommercialLead {
  id: string;
  restaurant_id: string;
  score: number;
  pipeline_stage: 'Uncontacted' | 'Qualified' | 'Negotiating' | 'Won' | 'Lost' | 'Nurturing';
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Objection' | 'Ready';
  assigned_agent_id?: string | null;
  is_ai_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'Physical_Letter' | 'WhatsApp' | 'Email';
  status: 'Draft' | 'Active' | 'Completed';
  budget_tracking?: Json;
  created_at?: string;
  updated_at?: string;
}

export interface CommercialEvent {
  id: string;
  lead_id: string;
  campaign_id?: string | null;
  event_type: string;
  payload?: Json;
  actor_type: 'System' | 'AI' | 'Human' | 'Lead';
  created_at?: string;
}

export interface QRTracker {
  id: string;
  lead_id: string;
  campaign_id: string;
  short_code: string;
  created_at?: string;
}

export interface AIInsightLog {
  id: string;
  lead_id: string;
  insight_type: 'Objection_Identified' | 'Success_Pattern' | 'Risk_Identified';
  description: string;
  confidence_score?: number;
  action_taken?: string | null;
  created_at?: string;
}
