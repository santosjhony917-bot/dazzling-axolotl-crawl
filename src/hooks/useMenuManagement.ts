import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, MenuItem } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

// --- Tipos de Dados ---

interface CreateCategoryPayload {
  restaurant_id: string;
  name: string;
  is_active: boolean;
  order_index?: number;
}

interface UpdateCategoryPayload {
  id: string;
  name: string;
  is_active: boolean;
}

interface CreateItemPayload {
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  is_active: boolean;
}

interface UpdateItemPayload {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  is_active: boolean;
}

interface SwapCategoryPayload {
  category_id_a: string;
  category_id_b: string;
}

// --- Funções de API ---

const fetchCategories = async (restaurantId: string): Promise<MenuCategory[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

const createCategory = async (payload: CreateCategoryPayload): Promise<MenuCategory> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const updateCategory = async (payload: UpdateCategoryPayload): Promise<MenuCategory> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .update(payload)
    .eq('id', payload.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const deleteCategory = async (categoryId: string): Promise<void> => {
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw new Error(error.message);
};

const swapCategoryOrder = async ({ category_id_a, category_id_b }: SwapCategoryPayload): Promise<void> => {
  const { error } = await supabase.rpc('swap_category_order', { category_id_a, category_id_b });
  if (error) throw new Error(error.message);
};

// --- Hooks de Categoria ---

export const useCategoryMutations = (restaurantId: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['menuCategories', restaurantId];

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      showSuccess('Categoria criada com sucesso!');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      showError(`Erro ao criar categoria: ${error.message}`);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      showSuccess('Categoria atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      showError(`Erro ao atualizar categoria: ${error.message}`);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      showSuccess('Categoria deletada com sucesso!');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      showError(`Erro ao deletar categoria: ${error.message}`);
    },
  });
  
  const swapCategoryOrderMutation = useMutation({
    mutationFn: swapCategoryOrder,
    onMutate: async ({ category_id_a, category_id_b }) => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousCategories = queryClient.getQueryData<MenuCategory[]>(queryKey);
      
      if (previousCategories) {
        const indexA = previousCategories.findIndex(c => c.id === category_id_a);
        const indexB = previousCategories.findIndex(c => c.id === category_id_b);
        
        if (indexA !== -1 && indexB !== -1) {
          const newCategories = [...previousCategories];
          // Swap the items in the local state
          [newCategories[indexA], newCategories[indexB]] = [newCategories[indexB], newCategories[indexA]];
          
          // Optimistically update the cache
          queryClient.setQueryData(queryKey, newCategories);
        }
      }
      
      return { previousCategories };
    },
    onSuccess: () => {
      showSuccess('Ordem da categoria atualizada!');
      // Invalidate to refetch and ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error, variables, context) => {
      showError(`Erro ao reordenar categorias: ${error.message}`);
      // Rollback to the previous state on error
      if (context?.previousCategories) {
        queryClient.setQueryData(queryKey, context.previousCategories);
      }
    },
  });

  return {
    createCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
    swapCategoryOrderMutation, // Exportando a nova mutação
  };
};

// --- Hooks de Item ---

const fetchMenuItems = async (categoryId: string): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

const createMenuItem = async (payload: CreateItemPayload): Promise<MenuItem> => {
  const { data, error } = await supabase
    .from('menu_items')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const updateMenuItem = async (payload: UpdateItemPayload): Promise<MenuItem> => {
  const { data, error } = await supabase
    .from('menu_items')
    .update(payload)
    .eq('id', payload.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const deleteMenuItem = async (itemId: string): Promise<void> => {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(error.message);
};

// --- Hooks Principais ---

export const useMenuManagement = (restaurantId: string) => {
  const categoriesQuery = useQuery({
    queryKey: ['menuCategories', restaurantId],
    queryFn: () => fetchCategories(restaurantId),
    enabled: !!restaurantId,
  });

  const deleteCategoryMutation = useCategoryMutations(restaurantId).deleteCategoryMutation;

  return {
    categoriesQuery,
    deleteCategoryMutation,
  };
};

export const useMenuItemManagement = (categoryId: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['menuItems', categoryId];

  const itemsQuery = useQuery({
    queryKey,
    queryFn: () => fetchMenuItems(categoryId),
    enabled: !!categoryId,
  });

  const createItemMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      showSuccess('Item criado com sucesso!');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      showError(`Erro ao criar item: ${error.message}`);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: updateMenuItem,
    onSuccess: () => {
      showSuccess('Item atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      showError(`Erro ao atualizar item: ${error.message}`);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      showSuccess('Item deletado com sucesso!');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      showError(`Erro ao deletar item: ${error.message}`);
    },
  });

  return {
    itemsQuery,
    createItemMutation,
    updateItemMutation,
    deleteItemMutation,
  };
};