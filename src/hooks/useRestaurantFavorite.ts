import { useAuthData } from "@/context/AuthContext";
import { showError } from "@/utils/toast";
import { useFavorites, UseFavoritesResult } from "./useFavorites"; 
import { Restaurant } from "@/types/supabase"; // Ensure Restaurant is imported if needed, but it's not directly used here.

/**
 * Hook para gerenciar o status de favorito de um único restaurante.
 */
export function useRestaurantFavorite(restaurantId: string) {
  const { isAuthenticated } = useAuthData();
  
  // Destructuring the functions and mutation state from the main hook
  const { 
    isFavorite: checkIsFavorite, 
    toggleFavorite: mutateToggleFavorite, 
    isMutating,
    isLoading: isFavoritesLoading
  }: UseFavoritesResult = useFavorites(); 
  
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
    isLoading: isFavoritesLoading || isMutating, 
  };
}