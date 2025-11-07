import React from 'react';
import { cn } from '@/lib/utils';

interface RestaurantProfileHeaderProps {
  restaurant: {
    id: string;
    name: string;
    coverImageUrl: string;
    isPremium: boolean;
    isCompact?: boolean;
  };
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({ restaurant }) => {
  // Ajusta a altura do cabeçalho com base na propriedade isCompact
  const headerHeightClass = restaurant.isCompact ? "h-24" : "h-48 md:h-64";

  return (
    <div className={cn("relative w-full overflow-hidden", headerHeightClass)}>
      {restaurant.coverImageUrl ? (
        <img
          src={restaurant.coverImageUrl}
          alt={`Capa de ${restaurant.name}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        // Placeholder se não houver imagem de capa
        <div className="absolute inset-0 bg-gradient-to-r from-highlight to-orange-400 flex items-center justify-center">
          <span className="text-white text-lg font-semibold">Sem Imagem de Capa</span>
        </div>
      )}
      {/* Overlay para melhorar a legibilidade de elementos sobre a imagem, se houver */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
};

export default RestaurantProfileHeader;