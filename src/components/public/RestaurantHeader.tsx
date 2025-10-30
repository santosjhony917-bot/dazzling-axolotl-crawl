import React from 'react';
import { Heart, Loader2, Share2, UserPlus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { motion } from 'framer-motion';

interface RestaurantPublicHeaderProps {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string;
    addressSummary: string | null;
    followersCount: number;
    isFavorite: boolean;
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

  const isFollowing = isFavorite; 
  const handleFollowToggle = onFavoriteToggle;

  return (
    <Card className="p-6 pt-0 shadow-soft-xl rounded-2xl bg-white relative -mt-12">
      <CardContent className="p-0">
        
        {/* Top Section: Logo, Name, Followers, Actions */}
        <div className="flex items-start pt-4">
          
          {/* Logo (Posicionamento ajustado para ficar mais alto) */}
          <div className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 shadow-soft-lg -mt-10 bg-white dark:bg-gray-700 flex-shrink-0 overflow-hidden">
            <img 
              src={logoUrl || PLACEHOLDER_IMAGE_URL} 
              alt={`Logo de ${name}`} 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          
          {/* Name, Followers, Button */}
          <div className="flex-grow ml-4 mt-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight truncate max-w-full">{name}</h1>
            
            {/* Contagem de Seguidores */}
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
              {followersCount.toLocaleString()} seguidores
            </p>
            
            {/* Botão Seguir */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="mt-3 w-full max-w-[200px]"
            >
              <Button
                variant={isFollowing ? "outline" : "highlight"}
                size="lg" // Usando size lg para ser mais proeminente
                onClick={handleFollowToggle}
                disabled={isFavoriteMutating}
                className={cn(
                  "w-full h-10 rounded-xl text-base font-bold transition-all",
                  isFollowing 
                    ? "border-primary text-primary hover:bg-primary/5" 
                    : "shadow-highlight-glow hover:bg-highlight/90"
                )}
              >
                {isFavoriteMutulating ? (
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
          
          {/* Ações (Coração e Compartilhar) - Posicionadas no canto superior direito do CARD */}
          <div className="flex space-x-2 absolute top-4 right-4">
            {/* Botão de Favoritar/Seguir (Coração) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFollowToggle}
              disabled={isFavoriteMutating}
              className="rounded-full h-8 w-8 text-gray-500 hover:bg-gray-100"
            >
              {isFavoriteMutating ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
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
              className="rounded-full h-8 w-8 text-gray-500 hover:bg-gray-100"
              onClick={onShare}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Endereço (Abaixo do botão Seguir, alinhado à esquerda) */}
        {addressSummary && (
          <div className="px-0 pt-4 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-highlight shrink-0" />
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium truncate">
              {addressSummary}
            </p>
          </div>
        )}
        
      </CardContent>
    </Card>
  );
};

export default RestaurantPublicHeader;