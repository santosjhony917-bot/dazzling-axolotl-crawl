import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/restaurant';
import { toast } from 'sonner';

// Definindo um tipo genérico para updates, já que o formulário específico foi removido.
type RestaurantUpdatePayload = Partial<Restaurant>;

export const useRestaurantProfile = (initialRestaurant?: Restaurant | null) => {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant ?? null);
  const [isLoading, setIsLoading] = useState(false);

  const refetchProfile = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching restaurant:', error);
      toast.error('Erro ao carregar perfil do restaurante.');
      setRestaurant(null);
    } else {
      setRestaurant(data);
    }
    setIsLoading(false);
  }, [user]);

  // Agora aceita um payload de atualização genérico
  const updateRestaurant = useCallback(async (updates: RestaurantUpdatePayload) => {
    if (!restaurant) {
      toast.error('Restaurante não encontrado para atualização.');
      return;
    }

    setIsLoading(true);

    // Usando cast intermediário para 'unknown' para lidar com tipos JSONB como opening_hours
    const { data: updatedData, error } = await supabase
      .from('restaurants')
      .update(updates as unknown as Partial<Restaurant>)
      .eq('id', restaurant.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating restaurant:', error);
      toast.error('Erro ao atualizar perfil do restaurante.');
    } else {
      setRestaurant(updatedData);
      toast.success('Perfil do restaurante atualizado com sucesso!');
    }

    setIsLoading(false);
  }, [restaurant]);

  return {
    restaurant,
    isLoading,
    refetchProfile,
    updateRestaurant,
  };
};