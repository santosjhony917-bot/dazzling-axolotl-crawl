import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { useAuthContext } from '@/context/AuthContext'; // CORRIGIDO: Importando useAuthContext

/**
 * Hook to fetch and manage the restaurant profile for the currently authenticated owner.
 */
export function useRestaurantProfile() {
  const { user, isLoading: authLoading } = useAuthContext();
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
  
  const updateRestaurant = async (updates: Partial<Restaurant>) => {
    if (!restaurant?.id) {
      return { error: "Restaurant ID is missing." };
    }
    
    const { error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurant.id);
      
    if (error) {
      showError(`Falha ao atualizar restaurante: ${error.message}`);
      return { error: error.message };
    }
    
    showSuccess("Perfil atualizado com sucesso!");
    refetch();
    return { error: null };
  };

  return {
    restaurant: restaurant || null,
    isLoading: isLoading || authLoading,
    error: error ? error.message : null,
    updateRestaurant,
    refetchProfile: refetch,
  };
}