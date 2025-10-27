import React from 'react';
import { Heart, Loader2, Share2, UserPlus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface RestaurantPublicHeaderProps {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string;
    addressSummary: string | null; // NOVO CAMPO
    // Props específicas do Free
    isFavorite?: boolean;
    onFavoriteToggle?: () => void;
    isMutating?: boolean;
    // Props específicas do Premium
    followersCount?: number;
    onFollowToggle?: () => void;
  };
}

const RestaurantPublicHeader: React.FC<RestaurantPublicHeaderProps> = ({ restaurant }) => {
  const { 
    name, 
    logoUrl, 
    addressSummary, // NOVO
    isFavorite, 
    onFavoriteToggle, 
    isMutating, 
    followersCount, 
    onFollowToggle 
  } = restaurant;

  // Determina se estamos no modo Premium (se tiver followersCount)
  const isPremiumMode = followersCount !== undefined;

  return (
    <div className="flex items-start justify-between px-4">
      {/* Logo */}
      <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-soft-lg -mt-12 bg-white dark:bg-gray-700 flex-shrink-0">
        <img 
          src={logoUrl || PLACEHOLDER_IMAGE_URL} 
          alt={`Logo de ${name}`} 
          className="w-full h-full object-cover rounded-full"
        />
      </div>
      
      {/* Nome e Info */}
      <div className="flex-grow ml-4 mt-1">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white truncate">{name}</h1>
        
        {/* Exibição do Endereço */}
        {addressSummary && (
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1 flex items-center gap-1 truncate">
            <MapPin className="w-4 h-4 text-highlight shrink-0" />
            {addressSummary}
          </p>
        )}
        
        {isPremiumMode && followersCount !== undefined && (
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
            {followersCount.toLocaleString()} seguidores
          </p>
        )}
      </div>
      
      {/* Ações (Favoritar/Compartilhar) */}
      <div className="flex space-x-2 mt-1 flex-shrink-0">
        
        {/* Botão de Favoritar (Apenas no modo Free) */}
        {!isPremiumMode && onFavoriteToggle && (
          <Button
            variant="outline"
            size="icon"
            onClick={onFavoriteToggle}
            disabled={isMutating}
            className="rounded-full h-10 w-10 shadow-soft-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
          >
            {isMutating ? (
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
            ) : (
              <Heart 
                className={cn(
                  "w-5 h-5 transition-colors",
                  isFavorite ? "text-red-500 fill-red-500" : "text-gray-500 hover:text-red-500"
                )}
              />
            )}
          </Button>
        )}
        
        {/* Botão de Compartilhar (Comum) */}
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-10 w-10 shadow-soft-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
          onClick={() => {
            // Lógica de compartilhamento
            navigator.clipboard.writeText(window.location.href);
            alert('Link copiado!');
          }}
        >
          <Share2 className="w-5 h-5 text-gray-500" />
        </Button>
      </div>
    </div>
  );
};

export default RestaurantPublicHeader;