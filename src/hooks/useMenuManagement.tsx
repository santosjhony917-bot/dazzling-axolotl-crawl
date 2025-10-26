import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MenuCategory, MenuItem } from "@/types/supabase";
import { showError, showSuccess } from "@/utils/toast";
import { useCallback } from "react";
import { logError } from "@/utils/errorLogger"; // Importando o logger

// --- Tipos de Retorno ---
interface MenuData {
  categories: MenuCategory[];
  items: MenuItem[];
}

// --- Query Key ---
const MENU_QUERY_KEY = (restaurantId: string) => ['menu', restaurantId];

// --- Fetch Function ---
const fetchMenu = async (restaurantId: string): Promise<MenuData> => {
  // Busca categorias e itens em uma única query aninhada
  const { data, error } = await supabase
    .from('menu_categories')
    .select(`
      *,
      items:menu_items(*)
    `)
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'menu_items', ascending: true });

  if (error) {
    logError(error, { context: 'fetchMenu' });
    throw new Error(error.message);
  }

  const categories: MenuCategory[] = [];
  const items: MenuItem[] = [];

  data.forEach(cat => {
    const { items: catItems, ...categoryData } = cat;
    categories.push(categoryData as MenuCategory);
    if (catItems) {
      items.push(...(catItems as MenuItem[]));
    }
  });

  return { categories, items };
};

// --- Main Hook ---
export function useMenuManagement(restaurantId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = restaurantId ? MENU_QUERY_KEY(restaurantId) : ['menu', 'null'];

  const { data, isLoading, error } = useQuery<MenuData, Error>({
    queryKey: queryKey,
    queryFn: () => fetchMenu(restaurantId!),
    enabled: !!restaurantId,
    staleTime: Infinity, // Decisão 1: Invalidação manual
  });

  const invalidateMenu = useCallback(() => {
    if (restaurantId) {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY(restaurantId) });
    }
  }, [queryClient, restaurantId]);

  // --- Mutations ---

  // 1. Adicionar/Editar Categoria
  const categoryMutation = useMutation({
    mutationFn: async (category: Partial<MenuCategory> & { restaurant_id: string }) => {
      if (category.id) {
        // Update
        const { error } = await supabase
          .from('menu_categories')
          .update(category)
          .eq('id', category.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('menu_categories')
          .insert(category);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      showSuccess("Categoria salva com sucesso!");
      invalidateMenu();
    },
    onError: (e) => {
      logError(e, { context: 'categoryMutation' });
      showError(`Falha ao salvar categoria: ${(e as Error).message}`);
    },
  });

  // 2. Deletar Categoria
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Categoria e todos os itens associados deletados!");
      invalidateMenu();
    },
    onError: (e) => {
      logError(e, { context: 'deleteCategoryMutation' });
      showError(`Falha ao deletar categoria: ${(e as Error).message}`);
    },
  });

  // 3. Adicionar/Editar Item
  const itemMutation = useMutation({
    mutationFn: async (item: Partial<MenuItem> & { category_id: string }) => {
      if (item.id) {
        // Update
        const { error } = await supabase
          .from('menu_items')
          .update(item)
          .eq('id', item.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('menu_items')
          .insert(item);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      showSuccess("Item do cardápio salvo com sucesso!");
      invalidateMenu();
    },
    onError: (e) => {
      logError(e, { context: 'itemMutation' });
      showError(`Falha ao salvar item: ${(e as Error).message}`);
    },
  });

  // 4. Deletar Item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Item deletado com sucesso!");
      invalidateMenu();
    },
    onError: (e) => {
      logError(e, { context: 'deleteItemMutation' });
      showError(`Falha ao deletar item: ${(e as Error).message}`);
    },
  });

  return {
    menuData: data,
    isLoading,
    error,
    invalidateMenu,
    categoryMutations: {
      save: categoryMutation,
      delete: deleteCategoryMutation,
    },
    itemMutations: {
      save: itemMutation,
      delete: deleteItemMutation,
    },
  };
}