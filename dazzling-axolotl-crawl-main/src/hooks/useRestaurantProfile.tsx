import { useState, useCallback, useEffect } from 'react';
import { useAuthData } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { toast } from 'sonner';

// Definindo um tipo genérico para updates, já que o formulário específico foi removido.
type RestaurantUpdatePayload = Partial<Restaurant>;

export const useRestaurantProfile = (restaurantIdFromProps?: string) => {
  const { user } = useAuthData();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRestaurant = useCallback(async (idToFetch?: string) => {
    setIsLoading(true);
    let query = supabase.from('restaurants').select('*');

    if (idToFetch) {
      query = query.eq('id', idToFetch);
    } else if (user?.id) {
      query = query.eq('user_id', user.id);
    } else {
      setRestaurant(null);
      setIsLoading(false);
      return;
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching restaurant:', error);
      toast.error('Erro ao carregar perfil do restaurante.');
      setRestaurant(null);
    } else {
      setRestaurant(data);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRestaurant(restaurantIdFromProps);
  }, [fetchRestaurant, restaurantIdFromProps]);

  // Agora retorna { error: string | null }
  const updateRestaurant = useCallback(async (updates: RestaurantUpdatePayload): Promise<{ error: string | null }> => {
    if (!restaurant || !restaurant.id) {
      const msg = 'Restaurante não encontrado para atualização.';
      toast.error(msg);
      return { error: msg };
    }

    setIsLoading(true);
    let errorMsg: string | null = null;

    try {
      // Usando cast intermediário para 'unknown' para lidar com tipos JSONB como opening_hours
      const { data: updatedData, error } = await supabase
        .from('restaurants')
        .update(updates as unknown as Partial<Restaurant>)
        .eq('id', restaurant.id)
        .select()
        .single();

      if (error) {
        errorMsg = error.message;
        console.error('Error updating restaurant:', error);
        toast.error('Erro ao atualizar perfil do restaurante.');
      } else {
        setRestaurant(updatedData);
        toast.success('Perfil do restaurante atualizado com sucesso!');
      }
    } catch (e) {
      errorMsg = (e as Error).message;
    } finally {
      setIsLoading(false);
    }

    return { error: errorMsg };
  }, [restaurant]);

  return {
    restaurant,
    isLoading,
    refetchProfile: () => fetchRestaurant(restaurantIdFromProps),
    updateRestaurant,
  };
};