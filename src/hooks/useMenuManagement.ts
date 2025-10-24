import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, MenuItem } from '@/types';
import { showError, showSuccess } from '@/utils/toast';

// Tipos de dados para mutação (simplificados para o hook)
type CategoryMutationData = Partial<MenuCategory> & { restaurant_id: string };
type ItemMutationData = Partial<MenuItem> & { category_id: string };

const MENU_QUERY_KEY = 'restaurantMenu';

/**
 * Hook para gerenciar dados de menu (categorias e itens) de um restaurante.
 * @param restaurantId O ID do restaurante.
 */
export const useMenuManagement = (restaurantId: string | null) => {
  const queryClient = useQueryClient();

  // 1. Query para buscar todos os dados do menu
  const { data, isLoading, error } = useQuery({
    queryKey: [MENU_QUERY_KEY, restaurantId],
    queryFn: async () => {
      if (!restaurantId) return { categories: [], items: [] };

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true });

      if (categoriesError) throw categoriesError;

      const categoryIds = categoriesData.map(c => c.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .in('category_id', categoryIds)
        .order('order_index', { ascending: true });

      if (itemsError) throw itemsError;

      return {
        categories: categoriesData as MenuCategory[],
        items: itemsData as MenuItem[],
      };
    },
    enabled: !!restaurantId,
  });

  // Função de sucesso para invalidar o cache
  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [MENU_QUERY_KEY, restaurantId] });
  };

  // 2. Mutações para Categorias
  const categoryMutations = {
    save: useMutation({
      mutationFn: async (data: CategoryMutationData) => {
        const { id, ...rest } = data;
        if (id) {
          // Update
          const { data: updatedData, error } = await supabase
            .from('menu_categories')
            .update(rest)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          return updatedData;
        } else {
          // Insert
          const { data: insertedData, error } = await supabase
            .from('menu_categories')
            .insert(rest)
            .select()
            .single();
          if (error) throw error;
          return insertedData;
        }
      },
      onSuccess: () => {
        showSuccess("Categoria salva com sucesso!");
        onSuccess();
      },
      onError: (err) => {
        showError(`Falha ao salvar categoria: ${err.message}`);
      },
    }),

    delete: useMutation({
      mutationFn: async (categoryId: string) => {
        const { error } = await supabase
          .from('menu_categories')
          .delete()
          .eq('id', categoryId);
        if (error) throw error;
      },
      onSuccess: () => {
        showSuccess("Categoria deletada com sucesso!");
        onSuccess();
      },
      onError: (err) => {
        showError(`Falha ao deletar categoria: ${err.message}`);
      },
    }),
  };

  // 3. Mutações para Itens
  const itemMutations = {
    save: useMutation({
      mutationFn: async (data: ItemMutationData) => {
        const { id, ...rest } = data;
        if (id) {
          // Update
          const { data: updatedData, error } = await supabase
            .from('menu_items')
            .update(rest)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          return updatedData;
        } else {
          // Insert
          const { data: insertedData, error } = await supabase
            .from('menu_items')
            .insert(rest)
            .select()
            .single();
          if (error) throw error;
          return insertedData;
        }
      },
      onSuccess: () => {
        showSuccess("Item salvo com sucesso!");
        onSuccess(); // Invalida o cache após salvar/inserir item
      },
      onError: (err) => {
        showError(`Falha ao salvar item: ${err.message}`);
      },
    }),

    delete: useMutation({
      mutationFn: async (itemId: string) => {
        const { error } = await supabase
          .from('menu_items')
          .delete()
          .eq('id', itemId);
        if (error) throw error;
      },
      onSuccess: () => {
        showSuccess("Item deletado com sucesso!");
        onSuccess(); // Invalida o cache após deletar item
      },
      onError: (err) => {
        showError(`Falha ao deletar item: ${err.message}`);
      },
    }),
  };

  return {
    menuData: data,
    isLoading,
    error,
    categoryMutations,
    itemMutations,
  };
};