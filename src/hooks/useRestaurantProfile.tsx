import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeekSchedule } from '@/types/schedule';
import { Restaurant } from '@/types/restaurant'; // Importando a tipagem Restaurant
import toast from 'react-hot-toast'; // Importa toast

// Usando a interface Restaurant do types/restaurant.ts
type RestaurantProfileData = Restaurant & {
  category?: string; // Adicionando category que estava faltando na interface Restaurant, tornando-o opcional
  opening_hours: WeekSchedule | null;
};

// Modificado para aceitar userId opcional
export function useRestaurantProfile(userId: string | null = null) {
  const [restaurant, setRestaurant] = useState<RestaurantProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurant = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Busca pelo user_id
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', id) 
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw new Error(error.message);
      }
      
      if (data) {
        setRestaurant(data as RestaurantProfileData);
      } else {
        setRestaurant(null); // No restaurant found for this user
      }

    } catch (e) {
      setError((e as Error).message);
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) { // Se um ID de usuário for fornecido, busca o restaurante
      fetchRestaurant(userId);
    } else { // Se não houver ID de usuário (não logado), termina o carregamento
      setLoading(false);
      setRestaurant(null);
    }
  }, [userId]);

  const updateRestaurant = async (updates: Partial<RestaurantProfileData>): Promise<void> => {
    if (!restaurant?.id) {
      toast.error("Restaurante não encontrado para atualização.");
      return;
    }
    
    const { error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurant.id);

    if (error) {
      toast.error(`Erro ao atualizar restaurante: ${error.message}`);
      return;
    }

    // Refetch to get the latest data after update
    await fetchRestaurant(restaurant.user_id);
    toast.success("Restaurante atualizado com sucesso!");
    return;
  };

  return {
    restaurant,
    loading: loading,
    error,
    updateRestaurant,
    refetch: () => userId && fetchRestaurant(userId),
  };
}