import React from 'react';
import { Heart, MapPin } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RestaurantPublicHeaderProps {
  restaurant: Restaurant;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  followersCount: number;
}

const RestaurantPublicHeader: React.FC<RestaurantPublicHeaderProps> = ({
  restaurant,
  isFavorite,
  onToggleFavorite,
  followersCount,
}) => {
  const { name, category, address, number, neighborhood, city, state, plan } = restaurant;

  const fullAddress = [address, number, neighborhood, city, state]
    .filter(Boolean)
    .join(', ');

  const formattedFollowers = `${followersCount} seguidores`;

  return (
    <div className="p-4 md:p-6 bg-white dark:bg-gray-900 shadow-md rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-1">
            {name}
          </h1>
          {category && (
            <p className="text-lg text-primary font-semibold mb-2">{category}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFavorite}
          className={cn(
            "rounded-full transition-colors",
            isFavorite
              ? "text-red-500 hover:text-red-600"
              : "text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          )}
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart fill={isFavorite ? "currentColor" : "none"} size={28} />
        </Button>
      </div>

      <div className="mt-3 flex flex-col space-y-1">
        {fullAddress && (
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <p className="text-sm font-medium">{fullAddress}</p>
          </div>
        )}
        <div className="flex items-center space-x-3">
          <p className="text-[#5f728c] dark:text-gray-400 text-base font-normal leading-normal">{formattedFollowers}</p>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPublicHeader;