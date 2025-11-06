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
  const { name, coverImageUrl, isPremium, isCompact } = restaurant;

  const headerHeight = isCompact ? 'h-28' : 'h-40'; // Altura menor no modo compacto

  return (
    <div className={cn("relative w-full bg-gray-200", headerHeight)}>
      {isPremium && coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={`Capa de ${name}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-gray-300 to-gray-400" />
      )}
    </div>
  );
};

export default RestaurantProfileHeader;