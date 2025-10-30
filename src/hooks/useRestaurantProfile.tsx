import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { useAuthData } from '@/context/AuthContext'; 
import { WeekSchedule } from '@/types/schedule'; // Importando WeekSchedule

/**
 * Hook to fetch and manage the restaurant profile for the currently authenticated owner.
 */
export function useRestaurantProfile() {
  const { user, isLoading: authLoading } = useAuthData();
  const userId = user?.id;

  const fetchRestaurant = async (): Promise<Restaurant | null> => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data as Restaurant | null;
  };
  
  const { data: restaurant, isLoading, error, refetch } = useQuery<Restaurant | null, Error>({
    queryKey: ['restaurantProfile', userId],
    queryFn: fetchRestaurant,
    enabled: !!userId && !authLoading,
    staleTime: 5 * 60 * 1000,
  });
  
  // Query para buscar a contagem de seguidores
  const { data: actualFollowersCount = 0, isLoading: isFollowersLoading } = useQuery<number, Error>({
    queryKey: ['restaurantFollowersCount', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return 0;
      const { data, error } = await supabase.rpc('count_restaurant_followers', { p_restaurant_id: restaurant.id });
      if (error) {
        console.error("Error fetching followers count:", error);
        return 0;
      }
      return data || 0;
    },
    enabled: !!restaurant?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Definindo um tipo de atualização que permite WeekSchedule para opening_hours
  type RestaurantUpdate = Partial<Omit<Restaurant, 'opening_hours'>> & {
    opening_hours?: WeekSchedule | null;
  };

  const updateRestaurant = async (updates: RestaurantUpdate) => {
    if (!restaurant?.id) {
      return { error: "Restaurant ID is missing." };
    }
    
    const { error } = await supabase
      .from('restaurants')
      // Fazendo cast para Partial<Restaurant> para satisfazer a tipagem do Supabase
      .update(updates as Partial<Restaurant>) 
      .eq('id', restaurant.id);
      
    if (error) {
      showError(`Falha ao atualizar restaurante: ${error.message}`);
      return { error: error.message };
    }
    
    showSuccess("Perfil atualizado com sucesso!");
    refetch();
    return { error: null };
  };
  
  // Determina a contagem final de seguidores: usa o override se for definido, senão usa a contagem real.
  const finalFollowersCount = restaurant?.followers_override !== null && restaurant?.followers_override !== undefined
    ? restaurant.followers_override
    : actualFollowersCount;

  // Combina os dados do restaurante com a contagem de seguidores
  const combinedRestaurant = restaurant ? { ...restaurant, followersCount: finalFollowersCount } : null;

  return {
    restaurant: combinedRestaurant,
    isLoading: isLoading || authLoading || isFollowersLoading,
    error: error ? error.message : null,
    updateRestaurant,
    refetchProfile: refetch,
  };
}