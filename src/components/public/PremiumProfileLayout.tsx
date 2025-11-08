"use client";

import React from 'react';
import RestaurantLogo, { RestaurantLogoProps } from './RestaurantLogo';
import { cn } from '@/lib/utils';

// Interface minimalista para as props do restaurante que o layout realmente utiliza
interface RestaurantLayoutProps {
  name: string;
  image_url?: string;
  cover_image_url?: string;
}

interface PremiumProfileLayoutProps {
  restaurant: RestaurantLayoutProps; // Usando a nova interface
  children: React.ReactNode;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact: boolean;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ 
  restaurant, 
  children,
  toggleFavorite,
  isFavoriteMutating,
  isCompact
}) => {
  return (
    <div className="relative">
      {/* Imagem de Capa */}
      <div className="relative h-48 w-full bg-gray-200">
        <img
          src={restaurant.cover_image_url || "/placeholder-cover.jpg"}
          alt="Capa do Restaurante"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Logo e Nome do Restaurante */}
      <div className="relative z-10 -mt-28 flex flex-col items-center text-center px-4">
        <RestaurantLogo imageUrl={restaurant.image_url} className="mb-4" />
        <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
        {/* Outros detalhes do restaurante podem vir aqui, como seguidores, descrição, etc. */}
      </div>

      {/* Área de Conteúdo Principal */}
      <div className="px-4 py-4">
        {children}
      </div>
    </div>
  );
};

export default PremiumProfileLayout;