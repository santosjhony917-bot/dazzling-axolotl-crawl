"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface RestaurantProfileHeaderProps {
  restaurant: {
    cover_image_url?: string | null;
    image_url?: string | null; // Logo do restaurante, pode ser usada para sobreposição
    name?: string | null;
  };
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({ restaurant }) => {
  return (
    <div className="relative w-full h-48 bg-gray-200 overflow-hidden">
      {restaurant.cover_image_url ? (
        <img
          src={restaurant.cover_image_url}
          alt={`Capa de ${restaurant.name}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">{restaurant.name?.charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10"></div>
    </div>
  );
};

export default RestaurantProfileHeader;