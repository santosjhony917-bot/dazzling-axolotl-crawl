import React, { memo } from 'react';
import { Utensils, BadgeCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestaurantData {
  name: string;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  followersCount: number;
}

interface RestaurantHeaderProps {
  restaurant: RestaurantData;
}

const RestaurantHeader: React.FC<RestaurantHeaderProps> = memo(({ restaurant }) => {
  // Usando Utensils como ícone padrão, conforme o design original
  const ProfileIcon = Utensils; 
  
  // Determinar se é Free (mock: se rating e followers são 0)
  const isFree = restaurant.rating === 0 && restaurant.followersCount === 0;

  return (
    <div className="flex flex-col items-center justify-start rounded-xl bg-white shadow-lg p-4">
      {/* Ícone do Perfil (Flutuante) */}
      <div className="relative -mt-10 mb-2">
        <div className="flex size-20 items-center justify-center rounded-full bg-[#022D68] ring-4 ring-white">
          <ProfileIcon className="w-10 h-10 text-white" />
        </div>
      </div>
      {/* Nome e Estatísticas */}
      <div className="flex w-full flex-col items-center justify-center gap-1 text-center">
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-[#022D68]">{restaurant.name}</p>
          {restaurant.isVerified && (
            <BadgeCheck className="w-4 h-4 text-[#E47948] fill-[#E47948]" />
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Rating (Oculto ou simplificado no Free) */}
          {!isFree ? (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-[#E47948] fill-[#E47948]" />
              <p className="text-sm text-gray-600">{restaurant.rating.toFixed(1)} ({Math.round(restaurant.reviewsCount / 100) / 10}k avaliações)</p>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">-- (0 avaliações)</p>
            </div>
          )}
          
          <p className="text-sm text-gray-600">•</p>
          
          {/* Seguidores (Oculto ou simplificado no Free) */}
          <p className="text-sm text-gray-600">
            {isFree ? '0 seguidores' : `${restaurant.followersCount} seguidores`}
          </p>
        </div>
      </div>
    </div>
  );
});

export default RestaurantHeader;