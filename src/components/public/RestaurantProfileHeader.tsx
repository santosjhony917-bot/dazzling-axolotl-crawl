"use client";

import React from 'react';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestaurantProfileHeaderProps {
  restaurant: {
    id: string;
    name: string;
    coverImageUrl?: string | null;
    isPremium: boolean;
  };
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({ restaurant }) => {
  const { coverImageUrl, isPremium, name } = restaurant;

  // Este componente agora é responsável APENAS pela imagem de capa (se premium)
  // Os botões de voltar/compartilhar foram movidos para RestaurantPageHeader
  if (!isPremium) {
    return null; // Não renderiza nada se não for premium (sem capa)
  }

  return (
    <div className={cn("relative w-full h-48")}>
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={name}
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