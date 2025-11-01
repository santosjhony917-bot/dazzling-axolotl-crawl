import React, { memo } from 'react';
import { Utensils, BadgeCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Restaurant } from '@/types/supabase'; // Importando o tipo Restaurant

interface RestaurantHeaderProps {
  restaurant: Restaurant; // Usando o tipo Restaurant diretamente
  isPremium: boolean; // Adicionando isPremium para determinar se é premium
}

const RestaurantHeader: React.FC<RestaurantHeaderProps> = memo(({ restaurant, isPremium }) => {
  // Usando Utensils como ícone padrão, conforme o design original
  const ProfileIcon = Utensils; 
  
  // Determinar se é Free (mock: se followers são 0)
  // isVerified e followersCount não são campos diretos da tabela 'restaurants'
  // Se 'isVerified' for um campo da tabela, ele deve ser adicionado ao tipo Restaurant
  // Se 'followersCount' for uma contagem, ela deve ser passada como prop ou calculada
  // Por enquanto, vamos mockar isVerified e usar followers_override se existir
  const isVerified = isPremium; // Mocking isVerified based on premium status
  const followersCount = restaurant.followers_override || 0; // Usando followers_override

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
          {isVerified && (
            <BadgeCheck className="w-4 h-4 text-[#E47948] fill-[#E47948]" />
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Removendo Rating */}
          
          {/* Seguidores */}
          <p className="text-sm text-gray-600">
            {followersCount === 0 ? '0 seguidores' : `${followersCount} seguidores`}
          </p>
        </div>
      </div>
    </div>
  );
});

export default RestaurantHeader;