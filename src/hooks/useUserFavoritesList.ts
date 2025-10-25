import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/context/AuthContext";
import { logError } from "@/utils/errorLogger";
import { Restaurant } from "@/types/supabase"; // Importando o tipo Restaurant

const FAVORITES_LIST_QUERY_KEY = ['userFavoritesList'];

interface RestaurantDetails extends Pick<Restaurant, 'id' | 'name' | 'image_url' | 'category' | 'city'> {}

interface FavoriteRestaurant {
  restaurant_id: string;
  restaurants: RestaurantDetails;
}

const fetchUserFavorites = async (userId: string): Promise<FavoriteRestaurant[]> => {
  // 1. Buscar apenas os IDs dos restaurantes favoritos
  const { data: favoriteData, error: favoriteError } = await supabase
    .from('user_favorites')
    .select('restaurant_id')
    .eq('user_id', userId);

  if (favoriteError) {
    logError(favoriteError, { context: 'fetchUserFavorites - Step 1' });
    throw new Error(favoriteError.message);
  }
  
  const restaurantIds = favoriteData.map(f => f.restaurant_id);
  
  if (restaurantIds.length === 0) {
    return [];
  }

  // 2. Buscar os detalhes dos restaurantes usando os IDs
  const { data: restaurantData, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name, image_url, category, city')
    .in('id', restaurantIds);

  if (restaurantError) {
    logError(restaurantError, { context: 'fetchUserFavorites - Step 2' });
    throw new Error(restaurantError.message);
  }
  
  // 3. Mapear os resultados para o formato esperado
  const restaurantMap = new Map(restaurantData.map(r => [r.id, r]));
  
  return favoriteData
    .map(fav => {
      const restaurant = restaurantMap.get(fav.restaurant_id);
      if (restaurant) {
        return {
          restaurant_id: fav.restaurant_id,
          restaurants: restaurant as RestaurantDetails,
        };
      }
      return null;
    })
    .filter((item): item is FavoriteRestaurant => item !== null);
};

export function useUserFavoritesList() {
  const { user, isLoading: isAuthLoading } = useAuthContext();

  const { data, isLoading, error } = useQuery<FavoriteRestaurant[], Error>({
    queryKey: FAVORITES_LIST_QUERY_KEY,
    queryFn: () => fetchUserFavorites(user!.id),
    enabled: !!user && !isAuthLoading,
    retry: 0, 
  });

  return {
    favorites: data || [],
    isLoading: isLoading || isAuthLoading,
    error: error ? error.message : null,
  };
}