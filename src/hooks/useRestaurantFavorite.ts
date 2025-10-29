import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthData } from "@/context/AuthContext";
import { showError } from "@/utils/toast";
import { useFavorites } from "./useFavorites"; // Importando o hook principal

/**
 * Hook para gerenciar o status de favorito de um único restaurante.
 */
export function useRestaurantFavorite(restaurantId: string) {
  const { user, isAuthenticated } = useAuthData();
  const { isFavorite, toggleFavorite, isMutating } = useFavorites();
  
  const isCurrentlyFavorite = isFavorite(restaurantId);

  const handleToggle = () => {
    if (!isAuthenticated) {
      showError("Você precisa estar logado para favoritar.");
      return;
    }
    // Chama a função de mutação do hook principal
    toggleFavorite(restaurantId, isCurrentlyFavorite);
  };

  return {
    isFavorite: isCurrentlyFavorite,
    toggleFavorite: handleToggle,
    isLoading: isMutating,
  };
}