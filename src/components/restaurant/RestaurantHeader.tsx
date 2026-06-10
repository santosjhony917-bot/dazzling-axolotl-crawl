import React, { memo } from 'react';
import { Utensils, BadgeCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestaurantData {
  name: string;
  isVerified: boolean;
  // Removendo rating e reviewsCount
  followersCount: number;
}

interface RestaurantHeaderProps {
  restaurant: RestaurantData;
}

const RestaurantHeader: React.FC<RestaurantHeaderProps> = memo(({ restaurant }) => {
  // Usando Utensils como ícone padrão, conforme o design original
  const ProfileIcon = Utensils; 
  
  // Determinar se é Free (mock: se followers são 0)
  const isFree = restaurant.followersCount === 0;

  return (
    <div className="flex flex-col items-center justify-start rounded-2xl bg-white shadow-none p-4">
      {/* Ícone do Perfil (Flutuante) */}
      <div className="relative -mt-10 mb-2">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary ring-4 ring-white">
          <ProfileIcon className="w-10 h-10 text-white" />
        </div>
      </div>
      {/* Nome e Estatísticas */}
      <div className="flex w-full flex-col items-center justify-center gap-1 text-center">
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-primary">{restaurant.name}</p>
          {restaurant.isVerified && (
            <BadgeCheck className="w-4 h-4 text-highlight fill-highlight" />
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Removendo Rating */}
          
          {/* Seguidores */}
          <p className="text-sm text-gray-600">
            {isFree ? '0 seguidores' : `${restaurant.followersCount} seguidores`}
          </p>
        </div>
      </div>
    </div>
  );
});

export default RestaurantHeader;