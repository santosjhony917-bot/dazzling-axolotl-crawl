import React from 'react';
import { Heart, Loader2, Share2, UserPlus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { motion } from 'framer-motion';

interface RestaurantPublicHeaderProps {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string;
    addressSummary: string | null;
    followersCount: number; // Adicionado followersCount
    isFavorite: boolean; // Usado para o botão de seguir/favoritar
  };
  // Funções de ação
  onFavoriteToggle: () => void;
  isFavoriteMutating: boolean;
  onShare: () => void;
}

const RestaurantPublicHeader: React.FC<RestaurantPublicHeaderProps> = ({ 
  restaurant, 
  onFavoriteToggle, 
  isFavoriteMutating,
  onShare,
}) => {
  const { 
    name, 
    logoUrl, 
    addressSummary, 
    followersCount, 
    isFavorite, 
  } = restaurant;

  // O botão de "Seguir" usará a lógica de "Favoritar" (isFavorite)
  const isFollowing = isFavorite; 
  const handleFollowToggle = onFavoriteToggle;

  return (
    <div className="relative w-full">
      {/* Ações de Compartilhar/Favoritar (Posicionadas no topo da Capa) */}
      <div className="absolute top-4 right-4 z-20 flex space-x-2">
        {/* Botão de Favoritar/Seguir */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFollowToggle}
          disabled={isFavoriteMutating}
          className="rounded-full h-10 w-10 shadow-soft-md bg-white/80 backdrop-blur-sm hover:bg-white"
        >
          {isFavoriteMutating ? (
            <Loader2 className="w-5 h-5 animate-spin text-red-500" />
          ) : (
            <Heart 
              className={cn(
                "w-5 h-5 transition-colors",
                isFollowing ? "text-red-500 fill-red-500" : "text-gray-500 hover:text-red-500"
              )}
            />
          )}
        </Button>
        
        {/* Botão de Compartilhar */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10 shadow-soft-md bg-white/80 backdrop-blur-sm hover:bg-white"
          onClick={onShare}
        >
          <Share2 className="w-5 h-5 text-gray-500" />
        </Button>
      </div>
      
      {/* Conteúdo Principal (Logo, Nome, Botão Seguir) */}
      <div className="flex items-start justify-between px-4">
        {/* Logo (Posicionamento ajustado para ficar mais alto) */}
        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-soft-lg -mt-12 bg-white dark:bg-gray-700 flex-shrink-0">
          <img 
            src={logoUrl || PLACEHOLDER_IMAGE_URL} 
            alt={`Logo de ${name}`} 
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        
        {/* Botão Seguir (Posicionado à direita do nome) */}
        <div className="flex-grow ml-4 mt-1 min-w-0 flex flex-col items-start">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white truncate max-w-full">{name}</h1>
          
          {/* Contagem de Seguidores */}
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
            {followersCount.toLocaleString()} seguidores
          </p>
          
          {/* Botão Seguir */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="mt-3 w-full max-w-[150px]"
          >
            <Button
              variant={isFollowing ? "outline" : "highlight"}
              size="sm"
              onClick={handleFollowToggle}
              disabled={isFavoriteMutating}
              className={cn(
                "w-full h-9 rounded-xl text-sm font-bold transition-all",
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
      
      {/* Endereço (Movido para baixo do botão Seguir) */}
      {addressSummary && (
        <div className="px-4 mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1 truncate">
            <MapPin className="w-4 h-4 text-highlight shrink-0" />
            {addressSummary}
          </p>
        </div>
      )}
    </div>
  );
};

export default RestaurantPublicHeader;