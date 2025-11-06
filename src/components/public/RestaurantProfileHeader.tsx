"use client";

import React from 'react';
import { Restaurant } from '@/types'; // Importando o tipo Restaurant

interface RestaurantProfileHeaderProps {
  restaurant: Restaurant; // Agora aceita o tipo Restaurant completo
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({ restaurant }) => {
  const coverImageUrl = restaurant.cover_image_url || '/placeholder-cover.jpg'; // Derivando coverImageUrl
  const isPremium = restaurant.plan === 'premium'; // Derivando isPremium

  return (
    <div className="relative h-48 bg-gray-200 overflow-hidden">
      <img src={coverImageUrl} alt={restaurant.name || 'Restaurant cover'} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      <div className="absolute bottom-0 left-0 p-4 text-white">
        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
        {isPremium && <span className="text-sm bg-yellow-500 px-2 py-1 rounded-full mt-1 inline-block">Premium</span>}
      </div>
    </div>
  );
};

export default RestaurantProfileHeader;