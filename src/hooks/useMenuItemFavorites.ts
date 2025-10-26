import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { MenuItem } from "@/types/supabase";

// --- Tipos de Retorno ---
interface FavoriteItemRow {
  menu_item_id: string;
  menu_items: MenuItem;
}

// --- Query Key ---
const ITEM_FAVORITES_QUERY_KEY = (userId: string) => ['menuItemFavorites', userId];

// --- Fetch Function ---
const fetchMenuItemFavorites = async (userId: string): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_item_favorites')
    .select(`
      menu_item_id,
      menu_items:menu_items (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  
  // Mapeia para retornar apenas os detalhes do item de menu
  return (data as unknown as FavoriteItemRow[])
    .map(row => row.menu_items)
    .filter((item): item is MenuItem => !!item);
};

// --- Main Hook ---
export function useMenuItemFavorites() {
  const { user, isLoading: authLoading } = useAuthContext();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const queryKey = userId ? ITEM_FAVORITES_QUERY_KEY(userId) : ['menuItemFavorites', 'null'];

  const { data: favoriteItems, isLoading, error, refetch } = useQuery<MenuItem[], Error>({
    queryKey: queryKey,
    queryFn: () => fetchMenuItemFavorites(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 5 * 60 * 1000,
  });
  
  const isItemFavorite = (itemId: string): boolean => {
    return favoriteItems?.some(item => item.id === itemId) ?? false;
  };

  // --- Mutations ---

  const toggleItemFavoriteMutation = useMutation({
    mutationFn: async ({ itemId, isCurrentlyFavorite }: { itemId: string, isCurrentlyFavorite: boolean }) => {
      if (!userId) throw new Error("Usuário não autenticado.");

      if (isCurrentlyFavorite) {
        // DELETE
        const { error } = await supabase
          .from('menu_item_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('menu_item_id', itemId);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // INSERT
        const { error } = await supabase
          .from('menu_item_favorites')
          .insert({ user_id: userId, menu_item_id: itemId });
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ITEM_FAVORITES_QUERY_KEY(userId!) });
      if (result.action === 'added') {
        showSuccess("Prato adicionado aos favoritos!");
      } else {
        showSuccess("Prato removido dos favoritos.");
      }
    },
    onError: (e) => {
      showError(`Falha ao atualizar favoritos: ${(e as Error).message}`);
    },
  });

  return {
    favoriteItems: favoriteItems || [],
    isLoading: isLoading || authLoading,
    error: error ? error.message : null,
    isItemFavorite,
    toggleItemFavorite: toggleItemFavoriteMutation.mutateAsync,
    refetch,
  };
}