import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthContext } from '@/context/AuthContext'; // Usando o novo contexto
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showInfo } from '@/utils/toast';

interface RestaurantData {
  id: string; // Adicionado ID para a funcionalidade de favoritos
  name: string;
  followersCount: number;
  logoUrl: string;
  onFollowToggle: () => void;
}

interface RestaurantPublicHeaderProps {
  restaurant: RestaurantData;
}

const RestaurantPublicHeader: React.FC<RestaurantPublicHeaderProps> = ({ restaurant }) => {
  const { id, name, followersCount, logoUrl, onFollowToggle } = restaurant;
  const { user } = useAuthContext();
  const navigate = useNavigate();
  
  const { isFavorite, toggleFavorite } = useFavorites();
  const isCurrentlyFavorite = isFavorite(id);
  
  // Estado local para simular o 'Seguir' (já que não temos a tabela de seguidores)
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = React.useState(false);

  // Mock: Assumindo que o plano é Free para exibir o badge
  const plan = 'Free'; 
  
  const formattedFollowers = followersCount > 0 ? `${followersCount} seguidores` : '0 seguidores';

  const handleFavoriteClick = async () => {
    if (!user) {
      showInfo("Faça login para adicionar aos favoritos.");
      navigate(createPageUrl('auth'));
      return;
    }
    
    setIsTogglingFavorite(true);
    try {
      await toggleFavorite({ restaurantId: id, isCurrentlyFavorite });
    } catch (e) {
      // Erro tratado no hook
    } finally {
      setIsTogglingFavorite(false);
    }
  };
  
  const handleFollowClick = () => {
    if (!user) {
      showInfo("Faça login para seguir este restaurante.");
      navigate(createPageUrl('auth'));
      return;
    }
    // Simulação de toggle de seguir
    setIsFollowing(prev => !prev);
    onFollowToggle(); // Chama a função do pai para atualizar a contagem mockada
  };

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="flex gap-4">
        {/* Logo */}
        <div 
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-24 w-24" 
          style={{ backgroundImage: `url("${logoUrl}")` }}
          data-alt="restaurant logo"
        />
        
        {/* Info */}
        <div className="flex flex-col justify-center">
          <p className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">{name}</p>
          <p className="text-[#5f728c] dark:text-gray-400 text-base font-normal leading-normal">{formattedFollowers}</p>
          <span className="mt-1 inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-600/20 w-fit">
            {plan}
          </span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex w-full max-w-[480px] gap-3">
        <Button 
          onClick={handleFollowClick}
          className={cn(
            "flex-1 rounded-xl h-10 px-4 text-sm font-bold leading-normal tracking-[0.015em]",
            isFollowing 
              ? "bg-white border border-primary text-primary hover:bg-gray-50"
              : "bg-primary text-white hover:bg-primary/90"
          )}
          disabled={!user}
        >
          <span className="truncate">{isFollowing ? 'Seguindo' : 'Seguir'}</span>
        </Button>
        <Button 
          variant="outline"
          onClick={handleFavoriteClick}
          className={cn(
            "flex-1 rounded-xl h-10 px-4 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/5",
            isCurrentlyFavorite 
              ? "bg-highlight/10 border-highlight text-highlight"
              : "bg-transparent border-primary text-primary"
          )}
          disabled={isTogglingFavorite || !user}
        >
          {isTogglingFavorite ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Heart className={cn("w-4 h-4 mr-1", isCurrentlyFavorite && "fill-highlight")} />
          )}
          <span className="truncate">{isCurrentlyFavorite ? 'Favoritado' : 'Favoritar'}</span>
        </Button>
      </div>
    </div>
  );
};

export default RestaurantPublicHeader;