"use client";

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantPlan } from '@/types/supabase'; // Importando o tipo correto
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/utils/toast';

interface UseAdminRestaurantsProps {
  initialData?: Restaurant[];
}

export function useAdminRestaurants(props?: UseAdminRestaurantsProps) {
  const queryClient = useQueryClient();

  const fetchRestaurants = useCallback(async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }
    return data || [];
  }, []);

  const { data: restaurants = [], isLoading, error, refetch } = useQuery<Restaurant[], Error>({
    queryKey: ['adminRestaurants'],
    queryFn: fetchRestaurants,
    initialData: props?.initialData,
  });

  const updateRestaurantPlanMutation = useMutation<void, Error, { id: string; plan: RestaurantPlan }>({
    mutationFn: async ({ id, plan }) => {
      const { error } = await supabase
        .from('restaurants')
        .update({ plan })
        .eq('id', id);

      if (error) {
        console.error('Error updating restaurant plan:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      showSuccess('Plano do restaurante atualizado com sucesso!');
    },
    onError: (err) => {
      showError(`Erro ao atualizar plano: ${err.message}`);
    },
  });

  const updateRestaurantFollowersOverrideMutation = useMutation<void, Error, { id: string; followers_override: number }>({
    mutationFn: async ({ id, followers_override }) => {
      const { error } = await supabase
        .from('restaurants')
        .update({ followers_override })
        .eq('id', id);

      if (error) {
        console.error('Error updating followers override:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      showSuccess('Contagem de seguidores ajustada com sucesso!');
    },
    onError: (err) => {
      showError(`Erro ao ajustar seguidores: ${err.message}`);
    },
  });

  return {
    restaurants,
    isLoading,
    error,
    refetch,
    updateRestaurantPlan: updateRestaurantPlanMutation.mutateAsync,
    isUpdatingPlan: updateRestaurantPlanMutation.isPending,
    updateRestaurantFollowersOverride: updateRestaurantFollowersOverrideMutation.mutateAsync,
    isUpdatingFollowers: updateRestaurantFollowersOverrideMutation.isPending,
  };
}