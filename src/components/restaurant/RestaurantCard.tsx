import React from 'react';
import { MapPin, Utensils, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { RestaurantWithDistance } from '@/types/supabase';

interface RestaurantCardProps {
  restaurant: RestaurantWithDistance;
  onClick: () => void;
  isFavorite?: boolean;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick, isFavorite = false }) => {
  // distance_km agora existe no tipo RestaurantWithDistance
  const distance = restaurant.distance_km ? restaurant.distance_km.toFixed(1) : null; 

  return (
    <Card 
      className="flex overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative border-none shadow-soft-md rounded-xl"
      onClick={onClick}
    >
      <div className="w-28 h-28 flex-shrink-0">
        <img 
          src={restaurant.image_url || PLACEHOLDER_IMAGE_URL} 
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold truncate text-primary">{restaurant.name}</h3>
          
          {restaurant.category && (
            <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
              <Utensils className="w-4 h-4 text-highlight" /> {restaurant.category}
            </p>
          )}

          {/* Acessando city diretamente do objeto, que agora está no tipo RestaurantWithDistance */}
          {(restaurant.city || distance) && ( 
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4 text-highlight" /> 
              {distance ? `${distance} km` : restaurant.city}
            </p>
          )}
        </div>
        
        {/* Plano de destaque */}
        {restaurant.plan !== 'free' && (
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full mt-2 self-start",
            restaurant.plan === 'premium' ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"
          )}>
            {restaurant.plan === 'premium' ? 'Premium' : 'Básico'}
          </span>
        )}
      </CardContent>

      {isFavorite && (
        <div className="absolute top-2 right-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
        </div>
      )}
    </Card>
  );
};

export default RestaurantCard;