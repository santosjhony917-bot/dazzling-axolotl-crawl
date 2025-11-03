"use client";

import React from 'react';
import { Utensils } from 'lucide-react'; // Mantendo Utensils caso seja necessário para o premium, mas não para o free
import { cn } from '@/lib/utils';

interface RestaurantProfileHeaderProps {
  restaurant: {
    id: string;
    name: string;
    coverImageUrl: string;
    isPremium: boolean; // Usar esta prop para diferenciar
  };
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({
  restaurant,
}) => {
  const {
    name,
    coverImageUrl,
    isPremium,
  } = restaurant;

  return (
    <div className="relative w-full h-64 md:h-80 overflow-hidden">
      {/* Imagem de Capa - Apenas para Premium. Para Free, um fundo sólido e neutro. */}
      {isPremium && coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={`Capa de ${name}`}
          className="w-full h-full object-cover object-center"
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center"> {/* Fundo cinza claro para FREE */}
          {/* Ícone de talheres removido para FREE para despriorizar */}
        </div>
      )}
    </div>
  );
};

export default RestaurantProfileHeader;