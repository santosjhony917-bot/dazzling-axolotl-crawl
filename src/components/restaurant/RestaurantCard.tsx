import React from 'react';
import { Card } from '@/components/ui/card';
import { Utensils, MapPin } from 'lucide-react';

import { RestaurantWithDistance } from '@/hooks/useNearbyRestaurants';

interface RestaurantCardProps {
  restaurant: RestaurantWithDistance;
  onClick: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick }) => {
  return (
    <Card
      className="flex overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative border-none shadow-soft-md rounded-xl h-28"
      onClick={onClick}
    >
      <div className="relative w-1/4 h-full">
        <img
          src={restaurant.image_url || 'https://via.placeholder.com/150'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3 flex-1 flex flex-col justify-center"> {/* Alterado para justify-center */}
        <div>
          <h3 className="font-bold text-lg text-[#022D68] leading-tight">{restaurant.name}</h3>
          <p className="text-sm text-gray-600 flex items-center mt-1">
            <Utensils className="h-4 w-4 mr-1 text-highlight" /> {restaurant.category || 'Geral'}
          </p>
          <p className="text-sm text-gray-600 flex items-center mt-1">
            <MapPin className="h-4 w-4 mr-1 text-highlight" /> {restaurant.neighborhood || 'Bairro Desconhecido'}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default RestaurantCard;