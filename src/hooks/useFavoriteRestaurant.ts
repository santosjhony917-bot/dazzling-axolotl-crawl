import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useFavoriteRestaurant = (restaurantId: string) => {
  const { session } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId || !restaurantId) {
      setIsLoading(false);
      return;
    }

    const checkFavorite = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error checking favorite:', error);
      }
      
      setIsFavorite(!!data);
      setIsLoading(false);
    };

    checkFavorite();
  }, [userId, restaurantId]);

  const toggleFavorite = async () => {
    if (!userId) {
      toast({
        title: 'Ação não permitida',
        description: 'Você precisa estar logado para favoritar um restaurante.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    if (isFavorite) {
      // Remove favorite
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);

      if (error) {
        console.error('Error removing favorite:', error);
        toast({
          title: 'Erro ao remover favorito',
          description: 'Não foi possível remover o restaurante dos seus favoritos.',
          variant: 'destructive',
        });
      } else {
        setIsFavorite(false);
        toast({
          title: 'Removido!',
          description: 'Restaurante removido dos seus favoritos.',
        });
      }
    } else {
      // Add favorite
      const { error } = await supabase
        .from('user_favorites')
        .insert([{ user_id: userId, restaurant_id: restaurantId }]);

      if (error) {
        console.error('Error adding favorite:', error);
        toast({
          title: 'Erro ao adicionar favorito',
          description: 'Não foi possível adicionar o restaurante aos seus favoritos.',
          variant: 'destructive',
        });
      } else {
        setIsFavorite(true);
        toast({
          title: 'Adicionado!',
          description: 'Restaurante adicionado aos seus favoritos.',
        });
      }
    }
    setIsLoading(false);
  };

  return { isFavorite, toggleFavorite, isLoading };
};