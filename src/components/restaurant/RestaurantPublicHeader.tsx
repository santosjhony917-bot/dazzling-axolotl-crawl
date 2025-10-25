import React from 'react';
import { Heart, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showInfo } from '@/utils/toast';

interface RestaurantPublicHeaderProps {
  restaurant: {
    id: string;
    name: string;
    followersCount: number;
    logoUrl: string;
    onFollowToggle: () => void;
    isFavorite?: boolean;
    isFavoriteLoading?: boolean;
  };
}

const RestaurantPublicHeader: React.FC<RestaurantPublicHeaderProps> = ({ restaurant }) => {
  const { id, name, followersCount, logoUrl } = restaurant;
  const { user } = useAuthContext();
  const navigate = useNavigate();
  
  const { isFavorite, toggleFavorite, isLoading: isFavoriteLoading } = useFavorites(id);

  const handleFavoriteClick = () => {
    if (!user) {
      showInfo("Faça login para favoritar este restaurante.");
      navigate(createPageUrl('login'));
      return;
    }
    toggleFavorite();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: name,
        text: `Confira o perfil de ${name} no nosso app!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      showInfo("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="px-4">
      
      {/* Contêiner da Logo Centralizada */}
      <div className="flex justify-center">
        <div className="w-24 h-24 -mt-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-white dark:bg-gray-800">
          <img 
            src={logoUrl || PLACEHOLDER_IMAGE_URL} 
            alt={`Logo de ${name}`} 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Botões de Ação (Posicionados no canto superior direito do contêiner pai) */}
      {/* Ajustamos a posição dos botões para que fiquem no canto superior direito do contêiner principal (que é o div com rounded-t-3xl) */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full w-10 h-10 bg-white shadow-md hover:bg-gray-50"
          onClick={handleShare}
        >
          <Share2 className="w-5 h-5 text-primary" />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full w-10 h-10 bg-white shadow-md hover:bg-gray-50"
          onClick={handleFavoriteClick}
          disabled={isFavoriteLoading}
        >
          {isFavoriteLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-red-500" />
          ) : (
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
          )}
        </Button>
      </div>
      
      {/* Nome e Seguidores (Centralizados) */}
      <div className="mt-2 pb-4 border-b border-gray-100 text-center">
        <h1 className="text-2xl font-extrabold text-gray-900">{name}</h1>
        <p className="text-sm text-gray-500 mt-1">{followersCount} seguidores</p>
      </div>
    </div>
  );
};

export default RestaurantPublicHeader;