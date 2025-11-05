import React from 'react';
import { Heart, MapPin, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestaurantProfileHeaderProps {
  restaurant: {
    id: string;
    name: string;
    coverImageUrl: string;
    isPremium: boolean;
    isCompact?: boolean; // NOVO: Prop para modo compacto
  };
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({
  restaurant,
}) => {
  const {
    name,
    coverImageUrl,
    isPremium,
    isCompact = false, // Valor padrão
  } = restaurant;

  // Classes condicionais para altura da capa
  const coverHeightClasses = isCompact ? "h-44 md:h-52" : "h-52 md:h-64"; // Reduzido em ~20%

  return (
    <div className={cn("relative w-full bg-gray-200 overflow-hidden", coverHeightClasses)}>
      {/* Imagem de Capa - Apenas para Premium */}
      {isPremium && coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={`Capa de ${name}`}
          className="w-full h-full object-cover object-center"
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <Utensils className="w-24 h-24 text-gray-300" />
        </div>
      )}
    </div>
  );
};

export default RestaurantProfileHeader;