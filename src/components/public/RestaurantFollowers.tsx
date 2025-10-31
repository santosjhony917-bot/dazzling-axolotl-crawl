import React from 'react';
import { Heart } from 'lucide-react';

interface RestaurantFollowersProps {
  restaurantId: string;
  followersOverride: number;
}

export const RestaurantFollowers: React.FC<RestaurantFollowersProps> = ({ followersOverride }) => {
  // Implementação simples, assumindo que a contagem real viria de um hook ou API
  const displayFollowers = followersOverride > 0 ? followersOverride : 0;

  return (
    <div className="flex items-center justify-center py-4 border-y border-gray-100 mb-8">
      <Heart className="w-5 h-5 text-red-500 fill-red-500 mr-2" />
      <span className="text-lg font-semibold text-gray-700">
        {displayFollowers.toLocaleString('pt-BR')} Seguidores
      </span>
    </div>
  );
};