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
  paddingClass?: string; // Nova prop para a classe de padding
}

const RestaurantActionsBar: React.FC<RestaurantActionsBarProps> = ({
  isFavorite,
  onFavoriteToggle,
  isFavoriteMutating,
  onShare,
  onBack,
  paddingClass, // Desestrutura a nova prop
}) => {
  const handleFollowToggle = onFavoriteToggle;

  return (
    <div className={cn("flex items-center justify-between w-full", paddingClass)}>
      {/* Botão Voltar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="text-white"
      >
        <ArrowLeft className="h-6 w-6 text-white drop-shadow-md" />
      </Button>
      
      {/* Ações de Compartilhar/Favoritar */}
      <div className="flex space-x-2">
        {/* Botão de Favoritar/Seguir */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFollowToggle}
          disabled={isFavoriteMutating} 
          className="rounded-full h-10 w-10"
        >
          {isFavoriteMutating ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <Heart 
              className={cn(
                "w-5 h-5 transition-colors drop-shadow-md",
                isFavorite ? "text-red-500 fill-red-500" : "text-white hover:text-red-400"
              )}
            />
          )}
        </Button>
        
        {/* Botão de Compartilhar */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10"
          onClick={onShare}
        >
          <Share2 className="w-5 h-5 text-white drop-shadow-md" />
        </Button>
      </div>
    </div>
  );
};

export default RestaurantActionsBar;