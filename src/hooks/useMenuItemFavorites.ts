import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { MenuItem } from "@/types/supabase";

// Tipo intermediário retornado pela query do Supabase
interface FavoriteItemQueryRow {
  menu_item: MenuItem;
}

const FAVORITE_ITEMS_QUERY_KEY = ['userFavoriteItems'];

const fetchFavoriteItems = async (userId: string): Promise<MenuItem[]> => {
  // Busca os itens favoritos, fazendo join com a tabela menu_items
  const { data, error } = await supabase
    .from('menu_item_favorites')
    .select('menu_item:menu_items(*)')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  // Mapeia para retornar apenas o objeto MenuItem
  return (data as unknown as FavoriteItemQueryRow[]).map(fav => fav.menu_item).filter(item => !!item) as MenuItem[];
};

export function useMenuItemFavorites() {
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: favoriteItems, isLoading, error } = useQuery<MenuItem[], Error>({
    queryKey: FAVORITE_ITEMS_QUERY_KEY,
    queryFn: () => fetchFavoriteItems(user!.id),
    enabled: !!user?.id && !isAuthLoading,
    staleTime: 1000 * 60 * 5,
  });
  
  const isItemFavorite = (itemId: string): boolean => {
    return favoriteItems?.some(item => item.id === itemId) ?? false;
  };

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ itemId, isCurrentlyFavorite }: { itemId: string, isCurrentlyFavorite: boolean }) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");

      if (isCurrentlyFavorite) {
        // DELETE
        const { error } = await supabase
          .from('menu_item_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('menu_item_id', itemId);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // INSERT
        const { error } = await supabase
          .from('menu_item_favorites')
          .insert({ user_id: user.id, menu_item_id: itemId });
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: FAVORITE_ITEMS_QUERY_KEY });
      if (result.action === 'added') {
        showSuccess("Item adicionado aos favoritos!");
      } else {
        showSuccess("Item removido dos favoritos.");
      }
    },
    onError: (e) => {
      showError(`Falha ao atualizar favoritos: ${(e as Error).message}`);
    },
  });

  return {
    favoriteItems: favoriteItems || [],
    isLoading: isLoading || isAuthLoading,
    error: error ? error.message : null,
    isItemFavorite,
    toggleItemFavorite: toggleFavoriteMutation.mutateAsync,
    isToggling: toggleFavoriteMutation.isPending,
  };
}