import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext'; // CORRIGIDO
import { showError, showSuccess } from "@/utils/toast";
import { MenuItem } from "@/types/supabase";

// Query key para a lista de IDs de itens favoritos
const ITEM_FAVORITES_ID_LIST_QUERY_KEY = (userId: string) => ['menuItemFavoriteIds', userId];

const fetchItemFavoriteIds = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('menu_item_favorites')
    .select('menu_item_id')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  
  return data.map(f => f.menu_item_id);
};

export function useMenuItemFavorites(itemId: string) {
  const { user, isLoading: isAuthLoading } = useAuthData(); // CORRIGIDO
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: favoriteIds = [], isLoading: isFavoritesLoading } = useQuery<string[], Error>({
    queryKey: ITEM_FAVORITES_ID_LIST_QUERY_KEY(userId || 'null'),
    queryFn: () => fetchItemFavoriteIds(userId!),
    enabled: !!userId && !isAuthLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isFavorite = favoriteIds.includes(itemId);
  const isLoading = isAuthLoading || isFavoritesLoading;

  const mutation = useMutation<void, Error, boolean>({
    mutationFn: async (isCurrentlyFavorite) => {
      if (!userId) throw new Error("User not authenticated.");

      if (isCurrentlyFavorite) {
        // Remove favorite
        const { error } = await supabase
          .from('menu_item_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('menu_item_id', itemId);
        
        if (error) throw new Error(error.message);
      } else {
        // Add favorite
        const { error } = await supabase
          .from('menu_item_favorites')
          .insert({ user_id: userId, menu_item_id: itemId });
        
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_, isCurrentlyFavorite) => {
      queryClient.invalidateQueries({ queryKey: ITEM_FAVORITES_ID_LIST_QUERY_KEY(userId!) });
      
      if (isCurrentlyFavorite) {
        showSuccess("Item removido dos favoritos.");
      } else {
        showSuccess("Item adicionado aos favoritos!");
      }
    },
    onError: (err) => {
      showError(`Erro ao gerenciar favoritos: ${err.message}`);
    }
  });

  const toggleFavorite = () => {
    if (isLoading || mutation.isPending) return;
    if (!user) {
      showError("Você precisa estar logado para favoritar itens.");
      return;
    }
    mutation.mutate(isFavorite);
  };

  return {
    isFavorite,
    toggleFavorite,
    isLoading: isLoading || mutation.isPending,
  };
}