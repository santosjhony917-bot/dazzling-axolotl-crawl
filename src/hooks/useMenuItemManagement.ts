"use client";

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MenuItem, CreateItemPayload, UpdateItemPayload } from '@/types/menu';
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { showSuccess, showError } from '@/utils/toast';

interface UseMenuItemManagementResult {
  items: MenuItem[];
  isLoading: boolean;
  error: Error | null;
  refetchItems: (options?: RefetchOptions) => Promise<QueryObserverResult<MenuItem[], Error>>;
  addItem: (newItem: CreateItemPayload) => Promise<MenuItem>;
  updateItem: (updatedItem: UpdateItemPayload) => Promise<MenuItem>;
  deleteItem: (itemId: string) => Promise<void>;
  toggleItemActive: (itemId: string, isActive: boolean) => Promise<void>;
  reorderItems: (newOrder: MenuItem[]) => Promise<void>;
  isAddingItem: boolean;
  isUpdatingItem: boolean;
  isDeletingItem: boolean;
}

export function useMenuItemManagement(categoryId: string): UseMenuItemManagementResult {
  const queryClient = useQueryClient();

  const fetchItems = useCallback(async () => {
    if (!categoryId) return [];
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('category_id', categoryId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }
    return data || [];
  }, [categoryId]);

  const { data: items = [], isLoading, error, refetch } = useQuery<MenuItem[], Error>({
    queryKey: ['menuItems', categoryId],
    queryFn: fetchItems,
    enabled: !!categoryId,
  });

  const addItemMutation = useMutation<MenuItem, Error, CreateItemPayload>({
    mutationFn: async (newItem) => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(newItem)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', categoryId] });
      showSuccess('Item adicionado com sucesso!');
    },
    onError: (err) => {
      showError(`Erro ao adicionar item: ${err.message}`);
    },
  });

  const updateItemMutation = useMutation<MenuItem, Error, UpdateItemPayload>({
    mutationFn: async (updatedItem) => {
      const { id, ...updates } = updatedItem; // Correctly destructure id and updates
      const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', categoryId] });
      showSuccess('Item atualizado com sucesso!');
    },
    onError: (err) => {
      showError(`Erro ao atualizar item: ${err.message}`);
    },
  });

  const deleteItemMutation = useMutation<void, Error, string>({
    mutationFn: async (itemId) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', categoryId] });
      showSuccess('Item excluído com sucesso!');
    },
    onError: (err) => {
      showError(`Erro ao excluir item: ${err.message}`);
    },
  });

  const toggleItemActiveMutation = useMutation<void, Error, { id: string; is_active: boolean }>({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', categoryId] });
      showSuccess('Status do item atualizado.');
    },
    onError: (err) => {
      showError(`Erro ao atualizar status do item: ${err.message}`);
    },
  });

  const toggleItemActive = useCallback(async (itemId: string, isActive: boolean) => {
    await toggleItemActiveMutation.mutateAsync({ id: itemId, is_active: isActive });
  }, [toggleItemActiveMutation]);

  const reorderItemsMutation = useMutation<void, Error, MenuItem[], { previousItems: MenuItem[] | undefined }>({
    mutationFn: async (newOrder) => {
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        order_index: index,
      }));

      const { error } = await supabase
        .from('menu_items')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('Error reordering items:', error);
        throw error;
      }
    },
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['menuItems', categoryId] });
      const previousItems = queryClient.getQueryData<MenuItem[]>(['menuItems', categoryId]);
      queryClient.setQueryData(['menuItems', categoryId], newOrder);
      return { previousItems };
    },
    onError: (err, newOrder, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['menuItems', categoryId], context.previousItems);
      }
      showError(`Erro ao reordenar itens: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', categoryId] });
    },
  });

  const reorderItems = useCallback(async (newOrder: MenuItem[]) => {
    await reorderItemsMutation.mutateAsync(newOrder);
  }, [reorderItemsMutation]);

  return {
    items,
    isLoading,
    error,
    refetchItems: refetch,
    addItem: addItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    toggleItemActive: toggleItemActive,
    reorderItems,
    isAddingItem: addItemMutation.isPending,
    isUpdatingItem: updateItemMutation.isPending,
    isDeletingItem: deleteItemMutation.isPending,
  };
}