import React from 'react';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImageCacheBuster } from '@/hooks/useImageCacheBuster';

interface RestaurantProfileHeaderProps {
  restaurant: {
    id: string;
    name: string;
    coverImageUrl?: string | null;
    isPremium: boolean;
    isCompact?: boolean; // Adicionado
  };
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({ restaurant }) => {
  const { coverImageUrl, isPremium, name, isCompact = false } = restaurant;
  const getBustedUrl = useImageCacheBuster();

  // Este componente agora é responsável APENAS pela imagem de capa (se premium)
  // Os botões de voltar/compartilhar foram movidos para RestaurantPageHeader
  if (!isPremium) {
    return null; // Não renderiza nada se não for premium (sem capa)
  }

  return (
    <div className={cn("relative w-full transition-all duration-200", isCompact ? "h-36" : "h-64")}>
      {coverImageUrl ? (
        <img
          src={getBustedUrl(coverImageUrl)}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <Utensils className="w-20 h-20 text-gray-300" />
        </div>
      )}
    </div>
  );
};

export default RestaurantProfileHeader;