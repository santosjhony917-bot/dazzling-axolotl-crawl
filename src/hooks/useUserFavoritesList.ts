import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/context/AuthContext";

const FAVORITES_LIST_QUERY_KEY = ['userFavoritesList'];

interface FavoriteRestaurant {
  restaurant_id: string;
  restaurants: {
    id: string;
    name: string;
    image_url: string | null;
    category: string | null;
    city: string | null;
  } | null;
}

const fetchUserFavorites = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_favorites')
    .select(`
      restaurant_id,
      restaurants (
        id,
        name,
        image_url,
        category,
        city
      )
    `)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return data.filter(item => item.restaurants !== null) as FavoriteRestaurant[];
};

export function useUserFavoritesList() {
  const { user, isLoading: isAuthLoading } = useAuthContext();

  const { data, isLoading, error } = useQuery<FavoriteRestaurant[], Error>({
    queryKey: FAVORITES_LIST_QUERY_KEY,
    queryFn: () => fetchUserFavorites(user!.id),
    enabled: !!user && !isAuthLoading,
  });

  return {
    favorites: data || [],
    isLoading: isLoading || isAuthLoading,
    error: error ? error.message : null,
  };
}