import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/restaurant';
import toast from 'react-hot-toast';
import { useCallback } from 'react';

// Usando a interface Restaurant do types/restaurant.ts
type RestaurantProfileData = Restaurant;

const RESTAURANT_PROFILE_QUERY_KEY = (userId: string) => ['restaurantProfile', userId];

const fetchRestaurantByOwner = async (userId: string): Promise<RestaurantProfileData | null> => {
    const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId) 
        .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw new Error(error.message);
    }
    
    return data as RestaurantProfileData | null;
};

export function useRestaurantProfile(userId: string | null = null) {
  const queryClient = useQueryClient();
  
  const { data: restaurant, isLoading, error, refetch } = useQuery<RestaurantProfileData | null, Error>({
    queryKey: RESTAURANT_PROFILE_QUERY_KEY(userId || 'null'),
    queryFn: () => fetchRestaurantByOwner(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const updateRestaurant = useCallback(async (updates: Partial<RestaurantProfileData>): Promise<{ error: string | null }> => {
    if (!restaurant?.id) {
      const msg = "Restaurante não encontrado para atualização.";
      toast.error(msg);
      return { error: msg };
    }
    
    const { error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurant.id)
      .select()
      .single();

    if (error) {
      const msg = `Erro ao atualizar restaurante: ${error.message}`;
      toast.error(msg);
      return { error: msg };
    }

    // Invalida a query para forçar o refetch e atualizar o estado local
    queryClient.invalidateQueries({ queryKey: RESTAURANT_PROFILE_QUERY_KEY(restaurant.user_id!) });
    toast.success("Restaurante atualizado com sucesso!");
    return { error: null };
  }, [restaurant, queryClient]);

  return {
    restaurant,
    loading: isLoading,
    error: error ? error.message : null,
    updateRestaurant,
    refetch,
  };
}