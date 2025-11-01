"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase'; // Importando o tipo correto
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query'; // Importando QueryObserverResult e RefetchOptions
import { showError, showSuccess } from '@/utils/toast';
import { useAuthData } from '@/context/AuthContext';

interface UseRestaurantProfileResult {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: Error | null;
  updateRestaurant: (updates: Partial<Restaurant>) => Promise<void>;
  isUpdating: boolean;
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<Restaurant | null, Error>>; // Corrigido o tipo de retorno de refetch
}

export function useRestaurantProfile(initialRestaurant?: Restaurant | null): UseRestaurantProfileResult {
  const { user, isProfileLoading } = useAuthData();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const fetchRestaurant = useCallback(async () => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching restaurant profile:', error);
      throw error;
    }
    return data || null;
  }, [userId]);

  const { data: restaurant, isLoading, error, refetch } = useQuery<Restaurant | null, Error>({
    queryKey: ['restaurantProfile', userId],
    queryFn: fetchRestaurant,
    enabled: !!userId && !isProfileLoading,
    initialData: initialRestaurant,
  });

  const updateRestaurantMutation = useMutation<void, Error, Partial<Restaurant>>({
    mutationFn: async (updates) => {
      if (!userId || !restaurant?.id) throw new Error('Restaurant or user not found.');
      const { error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', restaurant.id);

      if (error) {
        console.error('Error updating restaurant profile:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantProfile', userId] });
      showSuccess('Perfil do restaurante atualizado!');
    },
    onError: (err) => {
      showError(`Erro ao atualizar perfil do restaurante: ${err.message}`);
    },
  });

  return {
    restaurant,
    isLoading: isLoading || isProfileLoading,
    error,
    updateRestaurant: updateRestaurantMutation.mutateAsync,
    isUpdating: updateRestaurantMutation.isPending,
    refetch,
  };
}