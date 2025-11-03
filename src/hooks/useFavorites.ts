import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from "@/utils/toast";
import { Restaurant, FavoriteRestaurant } from "@/types"; // Importando de "@/types"

export const useFavorites = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: favoriteRestaurants, isLoading } = useQuery<FavoriteRestaurant[]>({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*, restaurants(*)')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      const { data, error } = await supabase
        .from('user_favorites')
        .insert({ user_id: userId!, restaurant_id: restaurantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
      showSuccess('Restaurante adicionado aos favoritos!');
    },
    onError: (error) => {
      showError('Erro ao adicionar aos favoritos.');
      console.error(error);
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId!)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
      showSuccess('Restaurante removido dos favoritos.');
    },
    onError: (error) => {
      showError('Erro ao remover dos favoritos.');
      console.error(error);
    },
  });

  const isFavorite = (restaurantId: string) => {
    return favoriteRestaurants?.some(fav => fav.restaurant_id === restaurantId) || false;
  };

  return {
    favoriteRestaurants,
    isLoading,
    addFavorite: addFavoriteMutation.mutate,
    removeFavorite: removeFavoriteMutation.mutate,
    isFavorite,
  };
};