import React from 'react';
import { MapPin, Clock, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL, PLACEHOLDER_COVER_URL } from '@/constants/assets';
import { motion } from 'framer-motion';

interface RestaurantProfileHeaderProps {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string | null;
    coverImageUrl: string | null;
    addressSummary: string | null;
    followersCount: number;
    isFavorite: boolean;
    isOpen: boolean;
    statusText: string;
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
  } = restaurant;

  const statusColor = isOpen ? 'text-green-600' : 'text-red-600';
  const isFollowing = isFavorite;
  const handleFollowToggle = onFavoriteToggle;

  return (
    <div className="relative w-full bg-white dark:bg-gray-800 shadow-soft-md">
      
      {/* 1. Imagem de Capa */}
      <div className="h-48 w-full overflow-hidden bg-gray-300 relative">
        <img
          src={coverImageUrl || PLACEHOLDER_COVER_URL}
          alt={`Capa de ${name}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
      </div>

      <div className="px-4 pb-4">
        {/* 2. Logo e Informações Principais */}
        <div className="flex items-end -mt-12">
          {/* Logo */}
          <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-soft-lg bg-white dark:bg-gray-700 flex-shrink-0 overflow-hidden">
            <img 
              src={logoUrl || PLACEHOLDER_IMAGE_URL} 
              alt={`Logo de ${name}`} 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Nome e Status */}
          <div className="flex-grow ml-4 pt-4 min-w-0">
            <h1 className="text-2xl font-extrabold text-primary dark:text-white truncate leading-tight">{name}</h1>
            
            {/* Status de Abertura */}
            {statusText && (
              <p className={cn("text-sm font-bold mt-1 flex items-center gap-1", statusColor)}>
                <Clock className={cn("w-4 h-4", statusColor)} />
                {statusText}
              </p>
            )}
          </div>
        </div>
        
        {/* 3. Seguidores e Endereço */}
        <div className="mt-4 space-y-2">
          {/* Contagem de Seguidores */}
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
            <UserPlus className="w-4 h-4 text-highlight shrink-0" />
            {followersCount.toLocaleString()} seguidores
          </p>
          
          {/* Endereço */}
          {addressSummary && (
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1 truncate">
              <MapPin className="w-4 h-4 text-highlight shrink-0" />
              {addressSummary}
            </p>
          )}
        </div>
        
        {/* 4. Botão Seguir (Movido para baixo para melhor destaque) */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          className="mt-4 w-full max-w-[200px]"
        >
          <Button
            variant={isFollowing ? "outline" : "highlight"}
            size="sm"
            onClick={handleFollowToggle}
            disabled={isFavoriteMutating}
            className={cn(
              "w-full h-10 rounded-xl text-base font-bold transition-all",
              isFollowing 
                ? "border-primary text-primary hover:bg-primary/5" 
                : "shadow-highlight-glow hover:bg-highlight/90"
            )}
          >
            {isFavoriteMutating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
              "Seguindo"
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1" /> Seguir
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default RestaurantProfileHeader;