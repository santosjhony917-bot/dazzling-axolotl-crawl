import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthData } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { Restaurant } from "@/types/supabase";

// --- Tipos de Retorno ---
interface Favorite {
  id: string;
  restaurant_id: string;
  user_id: string;
  created_at: string;
  restaurants: Restaurant; 
}

export interface UseFavoritesResult {
  favorites: Favorite[];
  isLoading: boolean;
  error: string | null;
  isFavorite: (restaurantId: string) => boolean;
  toggleFavorite: (restaurantId: string, isCurrentlyFavorite: boolean) => void;
  isMutating: boolean;
  refetch: () => void;
}

// --- Query Key ---
const FAVORITES_QUERY_KEY = (userId: string) => ['favorites', userId];

// --- Fetch Function ---
const fetchFavorites = async (userId: string): Promise<Favorite[]> => {
  const { data, error } = await supabase
    .from('user_favorites')
    .select(`
      *,
      restaurants (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  
  // Filtra para garantir que apenas objetos Favorite válidos sejam retornados
  return data.filter(item => item.restaurants) as Favorite[];
};

// --- Main Hook ---
export function useFavorites(): UseFavoritesResult {
  const { user, isLoading: authLoading } = useAuthData();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const queryKey = userId ? FAVORITES_QUERY_KEY(userId) : ['favorites', 'null'];

  const { data: favorites, isLoading, error, refetch } = useQuery<Favorite[], Error>({
    queryKey: queryKey,
    queryFn: () => fetchFavorites(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 5 * 60 * 1000,
  });
  
  const isFavorite = (restaurantId: string): boolean => {
    return favorites?.some(fav => fav.restaurant_id === restaurantId) ?? false;
  };

  // --- Mutations ---

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ restaurantId, isCurrentlyFavorite }: { restaurantId: string, isCurrentlyFavorite: boolean }) => {
      if (!userId) throw new Error("Usuário não autenticado.");

      if (isCurrentlyFavorite) {
        // DELETE: Remove o favorito
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // INSERT: Adiciona o favorito
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: userId, restaurant_id: restaurantId });
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: (result, variables) => {
      // Invalida a query de favoritos para forçar o refetch e atualizar o estado isFavorite
      queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY(userId!) });
      
      // Invalida a query do perfil público para atualizar a contagem de seguidores
      queryClient.invalidateQueries({ queryKey: ['publicRestaurant', variables.restaurantId] });
      
      if (result.action === 'added') {
        showSuccess("Restaurante adicionado aos favoritos!");
      } else {
        showSuccess("Restaurante removido dos favoritos.");
      }
    },
    onError: (e) => {
      // Se o erro for de chave duplicada, isso significa que o estado isCurrentlyFavorite estava incorreto.
      // Forçamos a invalidação da query para corrigir o estado local.
      if ((e as Error).message.includes('duplicate key value')) {
          queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY(userId!) });
          showError("Erro de sincronização. O restaurante já estava favoritado.");
      } else {
          showError(`Falha ao atualizar favoritos: ${(e as Error).message}`);
      }
    },
  });

  const toggleFavoriteHandler = (restaurantId: string, isCurrentlyFavorite: boolean) => {
    toggleFavoriteMutation.mutate({ restaurantId, isCurrentlyFavorite });
  };

  return {
    favorites: favorites || [],
    isLoading: isLoading || authLoading,
    error: error ? error.message : null,
    isFavorite,
    toggleFavorite: toggleFavoriteHandler,
    isMutating: toggleFavoriteMutation.isPending,
    refetch,
  } as UseFavoritesResult;
}