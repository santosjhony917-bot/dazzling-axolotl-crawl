import React from 'react';
import { Card } from '@/components/ui/card';
import { Utensils, MapPin, Star, Heart } from 'lucide-react';
import { RestaurantWithDistance } from '@/hooks/useNearbyRestaurants';
import { Button } from '@/components/ui/button'; // Importar Button

interface RestaurantCardProps {
  restaurant: RestaurantWithDistance;
  onClick: () => void;
  isFavorite?: boolean; // Adicionado a prop isFavorite
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick, isFavorite = false }) => {
  return (
    <Card
      className="flex overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative border-none shadow-soft-md rounded-xl h-28"
      onClick={onClick}
    >
      <div className="relative w-1/3 h-full">
        <img
          src={restaurant.image_url || 'https://via.placeholder.com/150'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-white/80 rounded-full"
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            // Handle favorite toggle
            console.log(`Toggle favorite for restaurant ${restaurant.id}`);
          }}
        >
          <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
        </Button>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-lg text-[#022D68] leading-tight">{restaurant.name}</h3>
          <p className="text-sm text-gray-600 flex items-center mt-1">
            <Utensils className="h-4 w-4 mr-1 text-highlight" /> {restaurant.category || 'Geral'}
          </p>
          <p className="text-sm text-gray-600 flex items-center mt-1">
            <MapPin className="h-4 w-4 mr-1 text-highlight" /> {restaurant.city || 'Cidade Desconhecida'}
          </p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-semibold text-highlight">
            {restaurant.distance_km ? `${restaurant.distance_km.toFixed(1)} km` : 'N/A'}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default RestaurantCard;