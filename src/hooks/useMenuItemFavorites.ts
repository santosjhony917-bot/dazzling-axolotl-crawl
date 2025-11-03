import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from "@/utils/toast";
import { MenuItem, MenuItemFavorite } from "@/types"; // Importando de "@/types"

export const useMenuItemFavorites = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: favoriteMenuItems, isLoading } = useQuery<MenuItemFavorite[]>({
    queryKey: ['menuItemFavorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('menu_item_favorites')
        .select('*, menu_items(*)')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (menuItemId: string) => {
      const { data, error } = await supabase
        .from('menu_item_favorites')
        .insert({ user_id: userId!, menu_item_id: menuItemId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItemFavorites', userId] });
      showSuccess('Item adicionado aos favoritos!');
    },
    onError: (error) => {
      showError('Erro ao adicionar aos favoritos.');
      console.error(error);
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (menuItemId: string) => {
      const { error } = await supabase
        .from('menu_item_favorites')
        .delete()
        .eq('user_id', userId!)
        .eq('menu_item_id', menuItemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItemFavorites', userId] });
      showSuccess('Item removido dos favoritos.');
    },
    onError: (error) => {
      showError('Erro ao remover dos favoritos.');
      console.error(error);
    },
  });

  const isFavorite = (menuItemId: string) => {
    return favoriteMenuItems?.some(fav => fav.menu_item_id === menuItemId) || false;
  };

  return {
    favoriteMenuItems,
    isLoading,
    addFavorite: addFavoriteMutation.mutate,
    removeFavorite: removeFavoriteMutation.mutate,
    isFavorite,
  };
};