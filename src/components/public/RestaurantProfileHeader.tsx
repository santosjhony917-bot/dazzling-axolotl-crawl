"use client";

import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RestaurantProfileHeaderProps {
  restaurant: any;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({
  restaurant,
  isFavorite,
  onFavoriteToggle,
}) => {
  return (
    <div className="relative h-64 bg-cover bg-center" style={{ backgroundImage: `url(${restaurant.cover_image_url || '/placeholder-cover.jpg'})` }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      <div className="absolute bottom-0 left-0 p-4 text-white flex items-end w-full">
        <img
          src={restaurant.image_url || '/placeholder-restaurant.jpg'}
          alt={restaurant.name}
          className="w-24 h-24 rounded-full border-4 border-white shadow-lg -mb-12"
        />
        <div className="ml-4 flex-grow">
          <h1 className="text-3xl font-bold">{restaurant.name}</h1>
          <p className="text-sm text-gray-200">{restaurant.category} - {restaurant.city}, {restaurant.state}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onFavoriteToggle}
          className="text-white hover:text-red-500"
        >
          <Heart fill={isFavorite ? "red" : "none"} />
        </Button>
      </div>
    </div>
  );
};

export default RestaurantProfileHeader;