import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/context/AuthContext";
import { logError } from "@/utils/errorLogger"; // Importando o logger

const FAVORITES_LIST_QUERY_KEY = ['userFavoritesList'];

interface RestaurantDetails {
  id: string;
  name: string;
  image_url: string | null;
  category: string | null;
  city: string | null;
}

interface FavoriteRestaurant {
  restaurant_id: string;
  restaurants: RestaurantDetails | null;
}

const fetchUserFavorites = async (userId: string) => {
  // Usando 'restaurants!inner' para forçar o join e garantir que a relação seja encontrada.
  const { data, error } = await supabase
    .from('user_favorites')
    .select(`
      restaurant_id,
      restaurants!inner (
        id,
        name,
        image_url,
        category,
        city
      )
    `)
    .eq('user_id', userId);

  if (error) {
    // Loga o erro de relacionamento/cache
    logError(error, { context: 'fetchUserFavorites' });
    throw new Error(error.message);
  }
  // Filtramos explicitamente para garantir que apenas objetos válidos sejam retornados
  return data.filter(item => item.restaurants !== null) as unknown as FavoriteRestaurant[];
};

export function useUserFavoritesList() {
  const { user, isLoading: isAuthLoading } = useAuthContext();

  const { data, isLoading, error } = useQuery<FavoriteRestaurant[], Error>({
    queryKey: FAVORITES_LIST_QUERY_KEY,
    queryFn: () => fetchUserFavorites(user!.id),
    enabled: !!user && !isAuthLoading,
    // Adicionando retry: 0 para evitar loops de erro em caso de falha de esquema
    retry: 0, 
  });

  return {
    favorites: data || [],
    isLoading: isLoading || isAuthLoading,
    error: error ? error.message : null,
  };
}