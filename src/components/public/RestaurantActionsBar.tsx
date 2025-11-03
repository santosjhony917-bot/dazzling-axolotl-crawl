"use client";

import React from 'react';
import { Heart, Loader2, Share2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RestaurantActionsBarProps {
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  isFavoriteMutating: boolean;
  onShare: () => void;
  onBack: () => void;
}

const RestaurantActionsBar: React.FC<RestaurantActionsBarProps> = ({ 
  isFavorite, 
  onFavoriteToggle, 
  isFavoriteMutating,
  onShare,
  onBack,
}) => {
  const isFollowing = isFavorite; 
  const handleFollowToggle = onFavoriteToggle;

  return (
    <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4">
      {/* Botão Voltar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="rounded-full h-10 w-10 bg-white/70 hover:bg-gray-100" // Estilo mais simples para FREE
      >
        <ArrowLeft className="h-5 w-5 text-gray-700" /> {/* Cor mais neutra */}
      </Button>
      
      {/* Ações de Compartilhar/Favoritar */}
      <div className="flex space-x-2">
        {/* Botão de Favoritar/Seguir */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFollowToggle}
          disabled={isFavoriteMutating} 
          className="rounded-full h-10 w-10 bg-white/70 hover:bg-gray-100" // Estilo mais simples para FREE
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
          className="rounded-full h-10 w-10 bg-white/70 hover:bg-gray-100" // Estilo mais simples para FREE
          onClick={onShare}
        >
          <Share2 className="w-5 h-5 text-gray-500" />
        </Button>
      </div>
    </div>
  );
};

export default RestaurantActionsBar;