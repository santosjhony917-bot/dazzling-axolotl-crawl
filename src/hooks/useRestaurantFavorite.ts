import { useAuthData } from "@/context/AuthContext";
import { showError } from "@/utils/toast";
import { useFavorites } from "./useFavorites"; 

/**
 * Hook para gerenciar o status de favorito de um único restaurante.
 */
export function useRestaurantFavorite(restaurantId: string) {
  const { isAuthenticated } = useAuthData();
  
  // Destructuring the functions and mutation state from the main hook
  // isFavorite: (id: string) => boolean
  // toggleFavorite: (id: string, isCurrentlyFavorite: boolean) => void
  // isMutating: boolean
  const { 
    isFavorite: checkIsFavorite, 
    toggleFavorite: mutateToggleFavorite, 
    isMutating 
  } = useFavorites();
  
  // Get the favorite status for the specific ID
  const isCurrentlyFavorite = checkIsFavorite(restaurantId);

  const handleToggle = () => {
    if (!isAuthenticated) {
      showError("Você precisa estar logado para favoritar.");
      return;
    }
    // Call the mutation function with the correct arguments
    mutateToggleFavorite(restaurantId, isCurrentlyFavorite);
  };

  return {
    isFavorite: isCurrentlyFavorite,
    toggleFavorite: handleToggle,
    isLoading: isMutating,
  };
}