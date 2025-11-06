"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types'; // Importando o tipo PublicRestaurantData

interface RestaurantProfileHeaderProps {
  restaurant: PublicRestaurantData; // Agora aceita PublicRestaurantData
  isCompact?: boolean; // Adicionado
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({ restaurant, isCompact }) => {
  const coverImageUrl = restaurant.coverImageUrl || '/placeholder-cover.jpg';
  const isPremium = restaurant.plan === 'premium';

  return (
    <div className={`relative bg-gray-200 overflow-hidden ${isCompact ? 'h-32' : 'h-48'}`}> {/* Altura ajustável */}
      <img src={coverImageUrl} alt={restaurant.name || 'Restaurant cover'} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      <div className="absolute bottom-0 left-0 p-4 text-white">
        <h1 className={`font-bold ${isCompact ? 'text-xl' : 'text-3xl'}`}>{restaurant.name}</h1> {/* Tamanho do texto ajustável */}
        {isPremium && <span className="text-sm bg-yellow-500 px-2 py-1 rounded-full mt-1 inline-block">Premium</span>}
      </div>
    </div>
  );
};

export default RestaurantProfileHeader;