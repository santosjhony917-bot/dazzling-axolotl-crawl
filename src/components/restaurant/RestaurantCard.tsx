import React from 'react';
import { Restaurant } from '@/types';
import { MapPin, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Estende o tipo Restaurant para incluir o campo distance_km retornado pela RPC de busca
interface DisplayRestaurant extends Restaurant {
  distance_km: number | null;
}

interface RestaurantCardProps {
  restaurant: DisplayRestaurant;
  onClick: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick }) => {
  const distance = restaurant.distance_km ? restaurant.distance_km.toFixed(1) : null;

  return (
    <Card 
      className="w-full overflow-hidden rounded-xl shadow-lg cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] border-none"
      onClick={onClick}
    >
      <div className="relative h-40 bg-gray-100">
        {restaurant.cover_image_url ? (
          <img
            src={restaurant.cover_image_url}
            alt={`Capa de ${restaurant.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <MapPin className="w-8 h-8 text-primary/50" />
          </div>
        )}
        
        {/* Plan Tag (Optional) */}
        {restaurant.plan !== 'free' && (
          <div className="absolute top-3 left-3 bg-highlight text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center">
            <Star className="w-3 h-3 mr-1 fill-white" />
            {restaurant.plan === 'premium' ? 'Premium' : 'Basic'}
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-2">
        <h3 className="text-xl font-extrabold text-primary tracking-tight truncate">
          {restaurant.name}
        </h3>
        
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-1 text-highlight" />
          {distance ? (
            <span className="font-semibold text-primary">{distance} km</span>
          ) : (
            <span>{restaurant.city || 'Localização Desconhecida'}</span>
          )}
        </div>
        
        {restaurant.category && (
          <p className="text-xs text-gray-500 mt-1">
            {restaurant.category}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantCard;