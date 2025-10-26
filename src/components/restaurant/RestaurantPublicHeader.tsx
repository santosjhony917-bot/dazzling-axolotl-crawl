import React from 'react';
import { Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/formatters';

interface RestaurantPublicHeaderProps {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string;
    followersCount: number;
    onFollowToggle: () => void;
  };
}

export default function RestaurantPublicHeader({ restaurant }: RestaurantPublicHeaderProps) {
  const formattedFollowers = formatNumber(restaurant.followersCount);

  return (
    <div className="relative flex flex-col items-center justify-center px-4">
      
      {/* Logo do Restaurante */}
      <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 overflow-hidden shadow-soft-lg mb-3">
        <img 
          src={restaurant.logoUrl} 
          alt={`Logo de ${restaurant.name}`} 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Nome do Restaurante */}
      <h1 className="text-2xl font-bold text-primary dark:text-white text-center leading-tight">
        {restaurant.name}
      </h1>

      {/* Contagem de Seguidores (NOVO) */}
      <p className="text-sm text-text-secondary dark:text-gray-400 mt-1 mb-4">
        {formattedFollowers} seguidores
      </p>

      {/* Botões de Ação (Favoritar e Compartilhar) */}
      <div className="absolute top-0 right-4 flex gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full w-8 h-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 shadow-soft-sm"
          onClick={restaurant.onFollowToggle}
        >
          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full w-8 h-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 shadow-soft-sm"
          onClick={() => navigator.share ? navigator.share({ title: restaurant.name, url: window.location.href }) : alert('Link copiado!')}
        >
          <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </Button>
      </div>
    </div>
  );
}