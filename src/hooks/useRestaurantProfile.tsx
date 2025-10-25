import { useAuthContext } from '@/context/AuthContext';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/restaurant';
import toast from 'react-hot-toast';

export function useRestaurantProfile(userId: string | null = null) {
  const { restaurant, isLoading, refetchProfile } = useAuthContext();
  
  // Função de atualização adaptada para usar o ID do restaurante do contexto
  const updateRestaurant = useCallback(async (updates: Partial<Restaurant>): Promise<{ error: string | null }> => {
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

    // Força o refetch do perfil consolidado
    refetchProfile();
    toast.success("Restaurante atualizado com sucesso!");
    return { error: null };
  }, [restaurant, refetchProfile]);

  return {
    restaurant,
    loading: isLoading,
    error: null, // Erro é tratado no contexto principal
    updateRestaurant,
    refetch: refetchProfile,
  };
}