import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/context/AuthContext";
import { showSuccess, showError } from "@/utils/toast";

const FAVORITES_QUERY_KEY = ['userFavorites'];

const fetchFavorites = async (userId: string) => {
  // Usando 'restaurants!inner' para forçar o join e garantir que a relação seja encontrada.
  const { data, error } = await supabase
    .from('user_favorites')
    .select('restaurant_id, restaurants!inner(id)') // Seleciona o ID do restaurante via join
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  // Mapeia para retornar apenas os IDs dos restaurantes favoritados
  return data.map(f => f.restaurant_id);
};

export function useFavorites(restaurantId: string) {
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [], isLoading: isFavoritesLoading } = useQuery<string[], Error>({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: () => fetchFavorites(user!.id),
    enabled: !!user && !isAuthLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isFavorite = favoriteIds.includes(restaurantId);
  const isLoading = isAuthLoading || isFavoritesLoading;

  const mutation = useMutation<void, Error, boolean>({
    mutationFn: async (isCurrentlyFavorite) => {
      if (!user) throw new Error("User not authenticated.");

      if (isCurrentlyFavorite) {
        // Remove favorite
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurantId);
        
        if (error) throw new Error(error.message);
      } else {
        // Add favorite
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, restaurant_id: restaurantId });
        
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_, isCurrentlyFavorite) => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
      if (isCurrentlyFavorite) {
        showSuccess("Restaurante removido dos favoritos.");
      } else {
        showSuccess("Restaurante adicionado aos favoritos!");
      }
    },
    onError: (err) => {
      showError(`Erro ao gerenciar favoritos: ${err.message}`);
    }
  });

  const toggleFavorite = () => {
    if (isLoading || mutation.isPending) return;
    if (!user) {
      showError("Você precisa estar logado para favoritar.");
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