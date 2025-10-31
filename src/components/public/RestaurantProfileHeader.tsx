import React from 'react';
import { MapPin, Clock, UserPlus, Loader2, Heart } from 'lucide-react';
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
    isPremium: boolean; // Adicionado para controle de estilo
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

  const statusColor = isOpen ? 'text-green-600' : 'text-red-600';
  const isFollowing = isFavorite;
  const handleFollowToggle = onFavoriteToggle;

  return (
    <div className="relative w-full bg-white dark:bg-gray-800 shadow-soft-md">
      
      {/* 1. Imagem de Capa (Banner) - Adicionado z-10 para garantir que fique abaixo do z-30 da barra de ações */}
      <div className="h-40 w-full overflow-hidden bg-gray-300 relative z-10">
        <img
          src={coverImageUrl || PLACEHOLDER_COVER_URL}
          alt={`Capa de ${name}`}
          className="w-full h-full object-cover"
        />
        {/* Overlay sutil para melhor contraste do texto flutuante (se houver) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>

      {/* 2. Bloco de Conteúdo Principal (Logo e Info) */}
      <div className="px-4 pb-4 -mt-12 pt-0 relative z-20"> 
        <div className="flex items-start gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-soft-xl border border-gray-100">
          
          {/* Logo (Ajustado para ficar no topo do card de informações) */}
          <div className="w-24 h-24 rounded-xl border-4 border-white dark:border-gray-800 shadow-soft-lg bg-white dark:bg-gray-700 flex-shrink-0 overflow-hidden">
            <img 
              src={logoUrl || PLACEHOLDER_IMAGE_URL} 
              alt={`Logo de ${name}`} 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Informações */}
          <div className="flex-grow pt-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-primary dark:text-white truncate leading-tight">{name}</h1>
            
            {/* Status de Abertura */}
            {statusText && (
              <p className={cn("text-sm font-bold mt-1 flex items-center gap-1", statusColor)}>
                <Clock className={cn("w-4 h-4", statusColor)} />
                {statusText}
              </p>
            )}
            
            {/* Endereço */}
            {addressSummary && (
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1 truncate mt-1">
                <MapPin className="w-4 h-4 text-highlight shrink-0" />
                {addressSummary}
              </p>
            )}
          </div>
        </div>
        
        {/* 3. Ações (Seguir e Seguidores) - Abaixo do bloco de informações */}
        <div className="mt-4 flex items-center justify-between">
          {/* Contagem de Seguidores - AUMENTADO O TAMANHO */}
          <p className="text-xl font-extrabold text-primary dark:text-white flex items-center gap-1">
            <UserPlus className="w-5 h-5 text-highlight shrink-0" />
            {followersCount.toLocaleString()} <span className="text-base font-medium text-gray-600 dark:text-gray-400">seguidores</span>
          </p>
          
          {/* Botão Seguir */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="w-32"
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
                  <Heart className="w-4 h-4 mr-1 fill-white" /> Seguir
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfileHeader;