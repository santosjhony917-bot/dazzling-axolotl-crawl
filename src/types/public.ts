import { Restaurant } from './supabase';

// Tipo de dados que o layout público espera, incluindo dados calculados
export interface PublicRestaurantData extends Restaurant {
  addressSummary: string;
  followersCount: number;
}