import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';

export const useFavoriteToggle = (restaurantId: string) => {
  const { user, isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  // 1. Fetch initial favorite status
  useEffect(() => {
    if (!isAuthenticated || !restaurantId || !user) {
      setIsFavorite(false);
      return;
    }

    const checkFavorite = async () => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means 'No rows found'
        console.error('Error checking favorite status:', error);
      }
      setIsFavorite(!!data);
    };

    checkFavorite();
  }, [isAuthenticated, restaurantId, user]);

  // 2. Toggle function
  const toggleFavorite = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Você precisa estar logado para favoritar.');
      return;
    }

    setIsMutating(true);

    if (isFavorite) {
      // Remove favorite
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId);

      if (error) {
        toast.error('Erro ao remover dos favoritos.');
        console.error('Error removing favorite:', error);
      } else {
        setIsFavorite(false);
        toast.success('Removido dos favoritos!');
      }
    } else {
      // Add favorite
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, restaurant_id: restaurantId });

      if (error) {
        toast.error('Erro ao adicionar aos favoritos.');
        console.error('Error adding favorite:', error);
      } else {
        setIsFavorite(true);
        toast.success('Adicionado aos favoritos!');
      }
    }

    setIsMutating(false);
  };

  return { isFavorite, toggleFavorite, isMutating };
};