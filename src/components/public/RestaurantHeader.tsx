"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';

interface RestaurantHeaderProps {
  restaurant: PublicRestaurantData;
}

const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({ restaurant }) => {
  return (
    <div className="relative h-48 bg-gray-200 overflow-hidden">
      {restaurant.cover_image_url ? (
        <img 
          src={restaurant.cover_image_url} 
          alt={`Capa de ${restaurant.name}`} 
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
          <span className="text-white text-xl font-bold">Capa do Restaurante</span>
        </div>
      )}
    </div>
  );
};

export default RestaurantHeader;