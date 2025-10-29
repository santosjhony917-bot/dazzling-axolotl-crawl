import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types';
import { useAuth } from '@/hooks/useAuth';

/**
 * Fetches and manages the restaurant profile associated with the currently authenticated user.
 */
export const useRestaurantProfile = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurant = useCallback(async () => {
    if (!user) {
      setRestaurant(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw new Error(error.message);
      }

      setRestaurant(data || null);
    } catch (err) {
      console.error('Error fetching restaurant profile:', err);
      setError('Falha ao carregar o perfil do restaurante.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchRestaurant();
    }
  }, [isAuthLoading, fetchRestaurant]);

  const updateRestaurant = async (updates: Partial<Restaurant>) => {
    if (!user || !restaurant) {
      setError('Usuário ou restaurante não autenticado/carregado.');
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', restaurant.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setRestaurant(data);
      return { success: true, data };
    } catch (err) {
      console.error('Error updating restaurant profile:', err);
      setError('Falha ao atualizar o perfil do restaurante.');
      return { success: false, error: (err as Error).message };
    }
  };

  return { 
    restaurant, 
    isLoading, 
    error, 
    refetchProfile: fetchRestaurant, // Renomeado para refetchProfile para clareza
    updateRestaurant 
  };
};