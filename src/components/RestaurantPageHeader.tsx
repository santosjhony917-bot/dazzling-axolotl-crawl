import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Define a interface para um restaurante, baseada no esquema do Supabase
interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  description: string;
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
  opening_hours: any | null;
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: any | null;
  social_networks: any | null;
  other_url_label: string | null;
  claim_code: string | null;
  visit_status: string | null;
  visit_notes: string | null;
}

interface RestaurantPageHeaderProps {
  restaurant: Restaurant;
  isCompact?: boolean;
}

export const RestaurantPageHeader: React.FC<RestaurantPageHeaderProps> = ({ restaurant, isCompact }) => {
  if (!restaurant) return null;

  return (
    <header className={`sticky top-0 z-10 bg-white shadow-sm ${isCompact ? 'p-2' : 'p-4'}`}>
      <div className="container mx-auto flex items-center justify-between">
        {!isCompact && (
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft size={24} />
          </Link>
        )}
        <div className="flex items-center space-x-3">
          {restaurant.image_url && (
            <img
              src={restaurant.image_url}
              alt={restaurant.name}
              className={`rounded-full object-cover ${isCompact ? 'w-8 h-8' : 'w-10 h-10'}`}
            />
          )}
          <h2 className={`font-semibold ${isCompact ? 'text-lg' : 'text-xl'}`}>{restaurant.name}</h2>
          {restaurant.plan === 'premium' && (
            <span className="ml-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
              Premium
            </span>
          )}
        </div>
        <div className="w-6"></div>
      </div>
    </header>
  );
};