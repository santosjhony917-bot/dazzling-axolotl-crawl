"use client";

import React from 'react';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestaurantProfileHeaderProps {
  coverImageUrl?: string | null;
  restaurantId: string; // Adicionado, embora não usado diretamente no componente
  restaurantName: string;
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({ coverImageUrl, restaurantName }) => {
  // Este componente agora é responsável APENAS pela imagem de capa.
  // A lógica de 'isPremium' foi removida daqui, pois o componente é usado
  // exclusivamente dentro do PremiumProfileLayout, onde o restaurante já é premium.

  return (
    <div className={cn("relative w-full h-64")}>
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={restaurantName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <Utensils className="w-24 h-24 text-gray-300" />
        </div>
      )}
    </div>
  );
};

export default RestaurantProfileHeader;