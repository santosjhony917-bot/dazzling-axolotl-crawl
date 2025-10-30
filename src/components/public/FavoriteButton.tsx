import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface FavoriteButtonProps {
  restaurantId: string;
  initialIsFavorite: boolean;
  initialFollowersCount: number;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  restaurantId, 
  initialIsFavorite, 
  initialFollowersCount 
}) => {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Você precisa estar logado para favoritar.");
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorite) {
        // Remove favorite
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurantId);

        if (error) throw error;

        setIsFavorite(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        toast.success("Removido dos favoritos.");

      } else {
        // Add favorite
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, restaurant_id: restaurantId });

        if (error) throw error;

        setIsFavorite(true);
        setFollowersCount(prev => prev + 1);
        toast.success("Adicionado aos favoritos!");
      }
    } catch (error) {
      console.error("Erro ao atualizar favoritos:", error);
      toast.error("Falha ao atualizar favoritos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleToggleFavorite} 
      disabled={isLoading}
      className="flex items-center"
    >
      <Heart 
        className={`w-4 h-4 mr-2 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} 
      /> 
      {followersCount} {followersCount === 1 ? 'Seguidor' : 'Seguidores'}
    </Button>
  );
};

export default FavoriteButton;