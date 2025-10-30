import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types/restaurant';
import toast from 'react-hot-toast';

interface CategoryManagementState {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
}

// Hook principal para buscar e gerenciar o estado das categorias
export const useMenuManagement = (restaurantId: string | null) => {
  const [state, setState] = useState<CategoryManagementState>({
    categories: [],
    isLoading: true,
    error: null,
  });

  const fetchCategories = useCallback(async () => {
    if (!restaurantId) {
      setState({ categories: [], isLoading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      toast.error('Erro ao carregar categorias.');
      setState({ categories: [], isLoading: false, error: error as unknown as Error });
    } else {
      setState({ categories: data as Category[], isLoading: false, error: null });
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    ...state,
    refetchCategories: fetchCategories,
  };
};

// Hook para lidar com mutações (Adicionar, Reordenar, Editar, Deletar)
export const useCategoryMutations = (restaurantId: string | null, refetchCategories: () => void) => {

  const addCategory = async (name: string) => {
    if (!restaurantId) {
      toast.error('ID do restaurante ausente. Não foi possível adicionar a categoria.');
      return;
    }

    const loadingToast = toast.loading('Adicionando categoria...');

    // Fetch current categories to determine the next order index
    const { data: existingCategories, error: fetchError } = await supabase
      .from('menu_categories')
      .select('order_index')
      .eq('restaurant_id', restaurantId);

    if (fetchError) {
      toast.error('Erro ao determinar a ordem da categoria.', { id: loadingToast });
      return;
    }

    const newOrderIndex = existingCategories && existingCategories.length > 0
      ? Math.max(...existingCategories.map(c => c.order_index || 0)) + 1
      : 0;

    const { error } = await supabase
      .from('menu_categories')
      .insert({ 
        restaurant_id: restaurantId, 
        name,
        order_index: newOrderIndex,
        is_active: true,
      });

    if (error) {
      console.error('Error adding category:', error);
      toast.error('Erro ao adicionar categoria.', { id: loadingToast });
    } else {
      toast.success('Categoria adicionada com sucesso!', { id: loadingToast });
      refetchCategories();
    }
  };

  const swapCategoryOrder = async (idA: string, idB: string) => {
    if (!restaurantId) return;

    const loadingToast = toast.loading('Reordenando categorias...');
    
    try {
      const { error } = await supabase.rpc('swap_category_order', {
        category_id_a: idA,
        category_id_b: idB,
      });

      if (error) {
        throw new Error(error.message);
      }

      refetchCategories();
      toast.success('Ordem atualizada!', { id: loadingToast });

    } catch (e) {
      console.error('Error swapping category order:', e);
      toast.error('Erro ao reordenar categorias.', { id: loadingToast });
    }
  };

  // Placeholder for update/delete functions
  const updateCategory = async (id: string, name: string) => {
    // Implementation needed
    console.log(`Updating category ${id} to ${name}`);
    toast.error('Funcionalidade de edição ainda não implementada.');
  };

  const deleteCategory = async (id: string) => {
    // Implementation needed
    console.log(`Deleting category ${id}`);
    toast.error('Funcionalidade de exclusão ainda não implementada.');
  };

  return {
    addCategory,
    swapCategoryOrder,
    updateCategory,
    deleteCategory,
  };
};