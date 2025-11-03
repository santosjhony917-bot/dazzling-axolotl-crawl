import React from 'react';
import { Heart, MapPin, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
    isPremium: boolean;
  };
  onFavoriteToggle: () => void;
  isFavoriteMutating: boolean;
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({
  restaurant,
  onFavoriteToggle,
  isFavoriteMutating,
}) => {
  const {
    name,
    logoUrl,
    coverImageUrl,
    addressSummary,
    followersCount,
    isFavorite,
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
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Logo do Restaurante (posicionada no canto superior esquerdo) */}
      {isPremium && logoUrl && (
        <img
          src={logoUrl}
          alt={`Logo de ${name}`}
          className="absolute top-4 left-4 w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white shadow-lg object-cover z-10"
        />
      )}

      {/* Conteúdo Central (Nome, Endereço, Status, Seguidores/Botão Seguir) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-md mb-2">{name}</h1>
        {addressSummary && (
          <p className="flex items-center text-base md:text-lg text-gray-200 mb-2">
            <MapPin className="w-5 h-5 mr-2" /> {addressSummary}
          </p>
        )}

        {/* Status de Abertura (movido para abaixo do endereço) */}
        <span
          className={cn(
            "px-3 py-1 rounded-full text-sm font-semibold mb-4",
            isOpen ? "bg-green-500" : "bg-red-500"
          )}
        >
          {statusText}
        </span>

        {/* Grupo de Seguidores e Botão Seguir */}
        <div className="flex items-center space-x-3">
          <span className="flex items-center text-lg text-gray-200">
            <Heart className="w-5 h-5 mr-1 fill-current text-red-400" /> {followersCount} Seguidores
          </span>
          <Button
            variant="highlight"
            size="sm"
            onClick={onFavoriteToggle}
            disabled={isFavoriteMutating}
            className="px-5 py-2"
          >
            {isFavorite ? 'Seguindo' : 'Seguir'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfileHeader;