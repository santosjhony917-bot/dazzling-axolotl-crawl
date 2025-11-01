"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { FavoriteRestaurant } from '@/types/supabase'; // Importando o tipo correto
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface UseFavoritesResult {
  favorites: FavoriteRestaurant[];
  isLoading: boolean;
  isFavorited: (restaurantId: string) => boolean;
  toggleFavorite: (restaurantId: string) => Promise<void>;
  isMutating: boolean; // Adicionado isMutating
}

export function useFavorites(): UseFavoritesResult {
  const { user, isProfileLoading: authLoading } = useAuthData(); // CORRIGIDO: Usando 'isProfileLoading'
  const userId = user?.id;
  const queryClient = useQueryClient();

  const fetchFavorites = useCallback(async () => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
    return data || [];
  }, [userId]);

  const { data: favorites = [], isLoading, refetch } = useQuery<FavoriteRestaurant[], Error>({
    queryKey: ['favorites', userId],
    queryFn: fetchFavorites,
    enabled: !!userId && !authLoading, // Only fetch if user is logged in and auth data is loaded
  });

  const addFavoriteMutation = useMutation<void, Error, string>({
    mutationFn: async (restaurantId) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: userId, restaurant_id: restaurantId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
      showSuccess('Restaurante adicionado aos favoritos!');
    },
    onError: (err) => {
      showError(`Erro ao adicionar favorito: ${err.message}`);
    },
  });

  const removeFavoriteMutation = useMutation<void, Error, string>({
    mutationFn: async (restaurantId) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
      showSuccess('Restaurante removido dos favoritos!');
    },
    onError: (err) => {
      showError(`Erro ao remover favorito: ${err.message}`);
    },
  });

  const isFavorited = useCallback((restaurantId: string) => {
    return favorites.some(fav => fav.restaurant_id === restaurantId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (restaurantId: string) => {
    if (!userId) {
      showError('Você precisa estar logado para favoritar restaurantes.');
      return;
    }
    if (isFavorited(restaurantId)) {
      await removeFavoriteMutation.mutateAsync(restaurantId);
    } else {
      await addFavoriteMutation.mutateAsync(restaurantId);
    }
  }, [userId, isFavorited, addFavoriteMutation, removeFavoriteMutation]);

  const isMutating = addFavoriteMutation.isPending || removeFavoriteMutation.isPending;

  return { favorites, isLoading: isLoading || authLoading, isFavorited, toggleFavorite, isMutating };
}