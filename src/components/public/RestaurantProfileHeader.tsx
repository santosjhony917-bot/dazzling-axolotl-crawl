import React from 'react';
import { Heart, MapPin, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestaurantProfileHeaderProps {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string;
    coverImageUrl: string;
    addressSummary: string;
    followersCount: number;
    isFavorite: boolean;
    isOpen: boolean;
    statusText: string;
    isPremium: boolean; // Crucial para renderização condicional
  };
  onFavoriteToggle: () => void; // Mantido para compatibilidade, mas o botão de favorito está na barra de ações
  isFavoriteMutating: boolean; // Mantido para compatibilidade
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({
  restaurant,
}) => {
  const {
    name,
    logoUrl,
    coverImageUrl,
    addressSummary,
    followersCount,
    isOpen,
    statusText,
    isPremium,
  } = restaurant;

  return (
    <div className="relative w-full h-64 md:h-80 bg-gray-200 overflow-hidden">
      {/* Imagem de Capa - Apenas para Premium */}
      {isPremium && coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={`Capa de ${name}`}
          className="w-full h-full object-cover object-center"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-primary to-highlight flex items-center justify-center">
          <Utensils className="w-24 h-24 text-white opacity-30" />
        </div>
      )}

      {/* Overlay para escurecer a imagem e melhorar a legibilidade do texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>

      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <div className="flex items-end justify-between">
          {/* Logo e Nome do Restaurante */}
          <div className="flex items-end">
            {/* Logo - Apenas para Premium */}
            {isPremium && logoUrl && (
              <img
                src={logoUrl}
                alt={`Logo de ${name}`}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-lg -mb-10 mr-4 object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight drop-shadow-md">{name}</h1>
              {addressSummary && (
                <p className="flex items-center text-sm md:text-base text-gray-200 mt-1">
                  <MapPin className="w-4 h-4 mr-1" /> {addressSummary}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status de Abertura e Seguidores */}
        <div className="flex items-center justify-between mt-4 pt-2 border-t border-white/20">
          <div className="flex items-center space-x-4">
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold",
                isOpen ? "bg-green-500" : "bg-red-500"
              )}
            >
              {statusText}
            </span>
            <span className="flex items-center text-sm text-gray-200">
              <Heart className="w-4 h-4 mr-1 fill-current text-red-400" /> {followersCount} Seguidores
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfileHeader;