"use client";

import React from 'react';
import RestaurantLogo from './RestaurantLogo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Heart, Share2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Interface minimalista para as props do restaurante que o layout realmente utiliza
interface RestaurantLayoutProps {
  name: string;
  image_url?: string;
  cover_image_url?: string;
}

interface FreeProfileLayoutProps {
  restaurant: RestaurantLayoutProps; // Usando a nova interface
  children: React.ReactNode;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact: boolean;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant, children, toggleFavorite, isFavoriteMutating, isCompact }) => {
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
      <div className={cn(
        "relative z-10 mt-[-70px]"
      )}>
        <div className="flex flex-col items-center text-center px-4 pb-4 pt-20">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;