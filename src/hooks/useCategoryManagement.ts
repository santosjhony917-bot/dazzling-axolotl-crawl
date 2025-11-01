"use client";

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, CreateCategoryPayload, UpdateCategoryPayload, MenuItem, UpdateItemPayload, CreateItemPayload } from '@/types/menu'; // Importando payloads e MenuItem
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query'; // Importando QueryObserverResult e RefetchOptions
import { showSuccess, showError } from '@/utils/toast';
import { useAuthData } from '@/context/AuthContext';
import { toast as reactHotToast } from 'react-hot-toast'; // Renomeado para evitar conflito com shadcn/ui toast

interface UseMenuManagementResult {
  categories: MenuCategory[];
  isLoading: boolean;
  error: Error | null;
  refetchCategories: (options?: RefetchOptions) => Promise<QueryObserverResult<MenuCategory[], Error>>; // Corrigido o tipo de retorno de refetch
  reorderCategories: (newOrder: MenuCategory[]) => Promise<void>;
}

interface UseCategoryMutationsResult {
  addCategoryMutation: ReturnType<typeof useMutation<MenuCategory, Error, CreateCategoryPayload>>;
  updateCategoryMutation: ReturnType<typeof useMutation<MenuCategory, Error, UpdateCategoryPayload>>;
  deleteCategoryMutation: ReturnType<typeof useMutation<void, Error, string>>;
  toggleCategoryActiveMutation: ReturnType<typeof useMutation<void, Error, { id: string; is_active: boolean }>>;
  isSavingCategory: boolean;
}

interface UseItemMutationsResult {
  items: MenuItem[];
  isLoading: boolean;
  error: Error | null;
  refetchItems: (options?: RefetchOptions) => Promise<QueryObserverResult<MenuItem[], Error>>; // Corrigido o tipo de retorno de refetch
  reorderItems: (newOrder: MenuItem[]) => Promise<void>;
  addItemMutation: ReturnType<typeof useMutation<MenuItem, Error, CreateItemPayload>>;
  updateItemMutation: ReturnType<typeof useMutation<MenuItem, Error, UpdateItemPayload>>;
  deleteItemMutation: ReturnType<typeof useMutation<void, Error, string>>;
  toggleItemActiveMutation: ReturnType<typeof useMutation<void, Error, { id: string; is_active: boolean }>>;
  isSavingItem: boolean;
}

export function useMenuManagement(): UseMenuManagementResult {
  const { restaurant, isProfileLoading } = useAuthData();
  const queryClient = useQueryClient();
  const restaurantId = restaurant?.id;

  const fetchCategories = useCallback(async () => {
    if (!restaurantId) return [];
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching menu categories:', error);
      throw error;
    }
    return data || [];
  }, [restaurantId]);

  const { data: categories = [], isLoading, error, refetch } = useQuery<MenuCategory[], Error>({
    queryKey: ['menuCategories', restaurantId],
    queryFn: fetchCategories,
    enabled: !!restaurantId && !isProfileLoading,
  });

  const reorderCategoriesMutation = useMutation<void, Error, MenuCategory[], { previousCategories: MenuCategory[] | undefined }>({ // Adicionado tipo para o contexto
    mutationFn: async (newOrder) => {
      const updates = newOrder.map((category, index) => ({
        id: category.id,
        order_index: index,
      }));

      const { error } = await supabase
        .from('menu_categories')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('Error reordering categories:', error);
        throw error;
      }
    },
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['menuCategories', restaurantId] });
      const previousCategories = queryClient.getQueryData<MenuCategory[]>(['menuCategories', restaurantId]);
      queryClient.setQueryData(['menuCategories', restaurantId], newOrder);
      return { previousCategories };
    },
    onError: (err, newOrder, context) => {
      if (context?.previousCategories) { // Acessando previousCategories do contexto tipado
        queryClient.setQueryData(['menuCategories', restaurantId], context.previousCategories);
      }
      showError(`Erro ao reordenar categorias: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCategories', restaurantId] });
    },
  });

  const reorderCategories = useCallback(async (newOrder: MenuCategory[]) => {
    await reorderCategoriesMutation.mutateAsync(newOrder);
  }, [reorderCategoriesMutation]);

  return {
    categories,
    isLoading: isLoading || isProfileLoading,
    error,
    refetchCategories: refetch,
    reorderCategories,
  };
}

export function useCategoryMutations(refetchCategories: (options?: RefetchOptions) => Promise<QueryObserverResult<MenuCategory[], Error>>, shadcnToast: any): UseCategoryMutationsResult { // Corrigido o tipo de refetchCategories
  const { restaurant } = useAuthData();
  const restaurantId = restaurant?.id;

  const addCategoryMutation = useMutation<MenuCategory, Error, CreateCategoryPayload>({
    mutationFn: async (newCategory) => {
      if (!restaurantId) throw new Error('Restaurant ID is missing.');
      const { data, error } = await supabase
        .from('menu_categories')
        .insert({ ...newCategory, restaurant_id: restaurantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchCategories();
      shadcnToast({ title: "Sucesso", description: "Categoria adicionada com sucesso." });
    },
    onError: (err) => {
      shadcnToast({ title: "Erro", description: `Erro ao adicionar categoria: ${err.message}`, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation<MenuCategory, Error, UpdateCategoryPayload>({
    mutationFn: async (updatedCategory) => {
      const { id, ...updates } = updatedCategory;
      const { data, error } = await supabase
        .from('menu_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchCategories();
      shadcnToast({ title: "Sucesso", description: "Categoria atualizada com sucesso." });
    },
    onError: (err) => {
      shadcnToast({ title: "Erro", description: `Erro ao atualizar categoria: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation<void, Error, string>({
    mutationFn: async (categoryId) => {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchCategories();
      shadcnToast({ title: "Sucesso", description: "Categoria excluída com sucesso." });
    },
    onError: (err) => {
      shadcnToast({ title: "Erro", description: `Erro ao excluir categoria: ${err.message}`, variant: "destructive" });
    },
  });

  const toggleCategoryActiveMutation = useMutation<void, Error, { id: string; is_active: boolean }>({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase
        .from('menu_categories')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchCategories();
      shadcnToast({ title: "Sucesso", description: "Status da categoria atualizado." });
    },
    onError: (err) => {
      shadcnToast({ title: "Erro", description: `Erro ao atualizar status da categoria: ${err.message}`, variant: "destructive" });
    },
  });

  const isSavingCategory = addCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending || toggleCategoryActiveMutation.isPending;

  return {
    addCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
    toggleCategoryActiveMutation,
    isSavingCategory,
  };
}

export function useItemMutations(categoryId: string, refetchItems: (options?: RefetchOptions) => Promise<QueryObserverResult<MenuItem[], Error>>, shadcnToast: any): UseItemMutationsResult { // Corrigido o tipo de refetchItems
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

  const reorderItemsMutation = useMutation<void, Error, MenuItem[], { previousItems: MenuItem[] | undefined }>({ // Adicionado tipo para o contexto
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
      if (context?.previousItems) { // Acessando previousItems do contexto tipado
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
      refetchItems();
      shadcnToast({ title: "Sucesso", description: "Item adicionado com sucesso." });
    },
    onError: (err) => {
      shadcnToast({ title: "Erro", description: `Erro ao adicionar item: ${err.message}`, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation<MenuItem, Error, UpdateItemPayload>({
    mutationFn: async (updatedItem) => {
      const { id, ...updates } = updatedItem;
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
      refetchItems();
      shadcnToast({ title: "Sucesso", description: "Item atualizado com sucesso." });
    },
    onError: (err) => {
      shadcnToast({ title: "Erro", description: `Erro ao atualizar item: ${err.message}`, variant: "destructive" });
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
      refetchItems();
      shadcnToast({ title: "Sucesso", description: "Item excluído com sucesso." });
    },
    onError: (err) => {
      shadcnToast({ title: "Erro", description: `Erro ao excluir item: ${err.message}`, variant: "destructive" });
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
      refetchItems();
      shadcnToast({ title: "Sucesso", description: "Status do item atualizado." });
    },
    onError: (err) => {
      shadcnToast({ title: "Erro", description: `Erro ao atualizar status do item: ${err.message}`, variant: "destructive" });
    },
  });

  const isSavingItem = addItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending || toggleItemActiveMutation.isPending;

  return {
    items,
    isLoading,
    error,
    refetchItems: refetch,
    reorderItems,
    addItemMutation,
    updateItemMutation,
    deleteItemMutation,
    toggleItemActiveMutation,
    isSavingItem,
  };
}