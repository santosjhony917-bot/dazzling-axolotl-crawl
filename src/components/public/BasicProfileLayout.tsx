import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { MapPin, Clock } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import { formatOpeningHours } from '@/utils/formatters';

interface BasicProfileLayoutProps {
  restaurant: PublicRestaurantData;
  isOwner: boolean;
}

const BasicProfileLayout: React.FC<BasicProfileLayoutProps> = ({ restaurant, isOwner }) => {
  const {
    name,
    description,
    addressSummary,
    opening_hours,
    menu_categories,
    id: restaurantId,
  } = restaurant;

  const formattedHours = formatOpeningHours(opening_hours);

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{name} (Plano Básico)</h1>
        <p className="text-gray-600 mb-4">{description}</p>
        
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{addressSummary}</span>
        </div>

        {formattedHours && (
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <Clock className="w-4 h-4 mr-2" />
            <span>{formattedHours}</span>
          </div>
        )}
        
        {isOwner && (
            <p className="text-sm text-blue-500 mt-4">Você está visualizando o perfil básico. Faça upgrade para o Premium!</p>
        )}
      </div>

      {/* Menu Section */}
      {menu_categories && menu_categories.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Cardápio</h2>
          <RestaurantMenu 
            menuCategories={menu_categories} 
            restaurantId={restaurantId}
            isPremium={false}
            id={restaurantId}
          />
        </div>
      )}
    </div>
  );
};

export default BasicProfileLayout;