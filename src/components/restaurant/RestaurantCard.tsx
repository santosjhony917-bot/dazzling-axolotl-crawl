import React from 'react';
import { Card } from '@/components/ui/card';
import { Utensils, MapPin } from 'lucide-react';
import { useImageCacheBuster } from '@/hooks/useImageCacheBuster';

import { RestaurantWithDistance } from '@/hooks/useNearbyRestaurants';

interface RestaurantCardProps {
  restaurant: RestaurantWithDistance;
  onClick: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick }) => {
  const getBustedUrl = useImageCacheBuster();

  return (
    <div className="horizontal-restaurant-card" onClick={onClick}>
      <div className="restaurant-card-image-wrapper">
        <img
          src={getBustedUrl(restaurant.image_url) || 'https://via.placeholder.com/150'}
          alt={restaurant.name}
        />
      </div>
      <div className="restaurant-card-content">
        <h3 className="restaurant-card-title">{restaurant.name}</h3>
        <p className="restaurant-card-tag mt-1 flex items-center gap-1">
          <Utensils className="h-3.5 w-3.5 text-highlight" /> {restaurant.category || 'Geral'}
        </p>
        <p className="restaurant-card-location mt-1">
          <MapPin className="h-3.5 w-3.5" /> {restaurant.neighborhood || 'Bairro Desconhecido'}
        </p>
      </div>
    </div>
  );
};

export default RestaurantCard;