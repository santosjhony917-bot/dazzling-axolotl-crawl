"use client";

import React from 'react';
import { Heart, MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DEFAULT_RESTAURANT_LOGO_URL } from '@/constants/assets';

interface RestaurantMainInfoCardProps {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string | null;
    addressSummary: string;
    followersCount: number;
    isFavorite: boolean;
    isOpen: boolean;
    statusText: string;
  };
  onFavoriteToggle: () => void;
  isFavoriteMutating: boolean;
}

const RestaurantMainInfoCard: React.FC<RestaurantMainInfoCardProps> = ({
  restaurant,
  onFavoriteToggle,
  isFavoriteMutating,
}) => {
  const {
    name,
    logoUrl,
    addressSummary,
    followersCount,
    isFavorite,
    isOpen,
    statusText,
  } = restaurant;

  return (
    <div className="relative -mt-16 z-20 px-4"> {/* Ajusta a posição para sobrepor a capa */}
      {/* Logo do Restaurante */}
      <img
        src={logoUrl || DEFAULT_RESTAURANT_LOGO_URL}
        alt={`Logo de ${name}`}
        className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-white shadow-sm object-cover z-30" // Sombra e borda mais simples
      />

      <Card className="pt-16 pb-4 px-4 shadow-sm rounded-lg bg-white border border-gray-200 text-left"> {/* Sombra, borda e arredondamento mais simples */}
        <CardContent className="p-0 space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold leading-tight text-gray-900"> {/* Tipografia mais genérica */}
            {name}
          </h1>
          
          {/* Endereço e Status de Abertura alinhados */}
          <div className="flex items-center gap-2">
            {addressSummary && (
              <p className="flex items-center text-sm md:text-base text-gray-600">
                <MapPin className="w-4 h-4 mr-1 text-gray-500" /> {addressSummary} {/* Ícone mais neutro */}
              </p>
            )}
            {/* Status de Abertura */}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold",
                isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}
            >
              {statusText}
            </span>
          </div>

          {/* Grupo de Seguidores e Botão Seguir */}
          <div className="flex items-center justify-between pt-4">
            <span className="flex items-center text-sm text-gray-500">
              <Heart className="w-4 h-4 mr-1 fill-gray-400 text-gray-400" /> {followersCount} Seguidores {/* Ícone mais neutro */}
            </span>
            <Button
              variant="default" // Usar variante padrão para ser mais genérico
              size="sm"
              onClick={onFavoriteToggle}
              disabled={isFavoriteMutating}
              className="px-4 py-2 text-sm"
            >
              {isFavoriteMutating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isFavorite ? 'Seguindo' : 'Seguir'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestaurantMainInfoCard;