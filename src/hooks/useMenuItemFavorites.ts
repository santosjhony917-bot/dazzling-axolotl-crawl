"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { MenuItem } from '@/types/supabase'; // Importando o tipo correto
import { showError, showSuccess } from "@/utils/toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useMenuItemFavorites(itemId: string) {
  const { user, isProfileLoading: isAuthLoading } = useAuthData(); // CORRIGIDO: Usando 'isProfileLoading'
  const userId = user?.id;
  const queryClient = useQueryClient();

  const fetchIsFavorite = useCallback(async () => {
    if (!userId || !itemId) return false;
    const { data, error } = await supabase
      .from('menu_item_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('menu_item_id', itemId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching menu item favorite status:', error);
      throw error;
    }
    return !!data;
  }, [userId, itemId]);

  const { data: isFavorite = false, isLoading, refetch } = useQuery<boolean, Error>({
    queryKey: ['menuItemFavorite', userId, itemId],
    queryFn: fetchIsFavorite,
    enabled: !!userId && !!itemId && !isAuthLoading, // Only run if user and item are available and auth is loaded
  });

  const addFavoriteMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated.');
      if (!itemId) throw new Error('Menu item ID is missing.');
      const { error } = await supabase
        .from('menu_item_favorites')
        .insert({ user_id: userId, menu_item_id: itemId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItemFavorite', userId, itemId] });
      showSuccess('Item adicionado aos favoritos!');
    },
    onError: (err) => {
      showError(`Erro ao adicionar item aos favoritos: ${err.message}`);
    },
  });

  const removeFavoriteMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated.');
      if (!itemId) throw new Error('Menu item ID is missing.');
      const { error } = await supabase
        .from('menu_item_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('menu_item_id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItemFavorite', userId, itemId] });
      showSuccess('Item removido dos favoritos!');
    },
    onError: (err) => {
      showError(`Erro ao remover item dos favoritos: ${err.message}`);
    },
  });

  const toggleFavorite = useCallback(async () => {
    if (!userId) {
      showError('Você precisa estar logado para favoritar itens.');
      return;
    }
    if (isFavorite) {
      await removeFavoriteMutation.mutateAsync();
    } else {
      await addFavoriteMutation.mutateAsync();
    }
  }, [userId, isFavorite, addFavoriteMutation, removeFavoriteMutation]);

  return { isFavorite, isLoading: isLoading || isAuthLoading, toggleFavorite };
}