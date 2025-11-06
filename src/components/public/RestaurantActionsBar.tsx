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
  const handleFollowToggle = onFavoriteToggle;

  return (
    <div className={cn("flex items-center justify-between w-full")}>
      {/* Botão Voltar (Movido para cá) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="text-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      {/* Ações de Compartilhar/Favoritar */}
      <div className="flex space-x-2">
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
                isFavorite ? "text-red-500 fill-red-500" : "text-primary hover:text-red-500"
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
          <Share2 className="w-5 h-5 text-primary" />
        </Button>
      </div>
    </div>
  );
};

export default RestaurantActionsBar;