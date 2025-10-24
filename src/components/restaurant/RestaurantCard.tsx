import React from 'react';
import { MapPin, Utensils } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RestaurantWithDistance } from '@/types/restaurant';

interface RestaurantCardProps {
  restaurant: RestaurantWithDistance;
  onClick: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick }) => {
  const distance = restaurant.distance_km ? restaurant.distance_km.toFixed(1) : null;

  return (
    <Card 
      className="w-full overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer border-none rounded-xl"
      onClick={onClick}
    >
      <div className="relative h-32 bg-gray-100">
        {restaurant.cover_image_url ? (
          <img 
            src={restaurant.cover_image_url} 
            alt={restaurant.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Utensils className="w-8 h-8" />
          </div>
        )}
        {distance && (
          <div className="absolute top-2 right-2 bg-[#022D68] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            {distance} km
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-[#022D68] truncate">{restaurant.name}</h3>
        <div className="flex items-center text-sm text-gray-600 mt-1">
          <MapPin className="w-4 h-4 mr-1 text-[#E47948]" />
          <p className="truncate">{restaurant.address || 'Endereço não informado'}</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {restaurant.description ? restaurant.description.substring(0, 70) + (restaurant.description.length > 70 ? '...' : '') : 'Sem descrição.'}
        </p>
      </div>
    </Card>
  );
};

export default RestaurantCard;