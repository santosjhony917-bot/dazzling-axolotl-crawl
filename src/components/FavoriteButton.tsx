import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  restaurantId: string;
  isFavorite?: boolean;
  toggleFavorite?: () => void;
  isMutating?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite = false,
  toggleFavorite = () => {},
  isMutating = false,
}) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFavorite}
      disabled={isMutating}
      className={cn(
        "rounded-full transition-colors",
        isFavorite ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-gray-500"
      )}
    >
      <Heart className={cn("w-6 h-6 fill-current", isFavorite ? "animate-pulse" : "fill-none")} />
    </Button>
  );
};

export default FavoriteButton;