import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, MenuItem } from '@/types';
import { showError, showSuccess } from '@/utils/toast';
import { useRestaurant } from './useRestaurant';
import { useAuth } from '@/context/AuthContext';

export interface MenuManagementResult {
  categories: (MenuCategory & { items: MenuItem[] })[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, name: string, is_active: boolean) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addItem: (categoryId: string, item: Omit<MenuItem, 'id' | 'category_id' | 'created_at'>) => Promise<void>;
  updateItem: (item: MenuItem) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
}

export const useMenuManagement = (): MenuManagementResult => {
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const [categories, setCategories] = useState<(MenuCategory & { items: MenuItem[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const refetch = () => setRefetchIndex(prev => prev + 1);

  useEffect(() => {
    if (!restaurant?.id) {
      setIsLoading(false);
      setCategories([]);
      return;
    }

    const fetchMenu = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch Categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('menu_categories')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('order_index', { ascending: true });

        if (categoriesError) throw categoriesError;

        const categoryIds = categoriesData.map(c => c.id);

        // 2. Fetch Items
        const { data: itemsData, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .in('category_id', categoryIds)
          .order('order_index', { ascending: true });

        if (itemsError) throw itemsError;

        // 3. Group items by category
        const groupedCategories = categoriesData.map(category => ({
          ...category,
          items: itemsData.filter(item => item.category_id === category.id),
        }));

        setCategories(groupedCategories);

      } catch (err: any) {
        console.error('Error fetching menu:', err);
        setError(err.message || 'Falha ao carregar o cardápio.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [restaurant?.id, refetchIndex]);

  // --- Category Management Functions ---

  const addCategory = async (name: string) => {
    if (!restaurant?.id) return;
    const newOrderIndex = categories.length > 0 ? categories[categories.length - 1].order_index + 1 : 0;

    const { error } = await supabase
      .from('menu_categories')
      .insert({
        restaurant_id: restaurant.id,
        name,
        order_index: newOrderIndex,
      });

    if (error) {
      showError('Erro ao adicionar categoria.');
      console.error(error);
    } else {
      showSuccess('Categoria adicionada com sucesso!');
      refetch();
    }
  };

  const updateCategory = async (id: string, name: string, is_active: boolean) => {
    const { error } = await supabase
      .from('menu_categories')
      .update({ name, is_active })
      .eq('id', id);

    if (error) {
      showError('Erro ao atualizar categoria.');
      console.error(error);
    } else {
      showSuccess('Categoria atualizada com sucesso!');
      refetch();
    }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Erro ao deletar categoria.');
      console.error(error);
    } else {
      showSuccess('Categoria deletada com sucesso!');
      refetch();
    }
  };

  // --- Item Management Functions ---

  const addItem = async (categoryId: string, item: Omit<MenuItem, 'id' | 'category_id' | 'created_at'>) => {
    const category = categories.find(c => c.id === categoryId);
    const newOrderIndex = category?.items.length ? category.items[category.items.length - 1].order_index + 1 : 0;

    const { error } = await supabase
      .from('menu_items')
      .insert({
        ...item,
        category_id: categoryId,
        order_index: newOrderIndex,
      });

    if (error) {
      showError('Erro ao adicionar item.');
      console.error(error);
    } else {
      showSuccess('Item adicionado com sucesso!');
      refetch();
    }
  };

  const updateItem = async (item: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .update({
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        is_active: item.is_active,
      })
      .eq('id', item.id);

    if (error) {
      showError('Erro ao atualizar item.');
      console.error(error);
    } else {
      showSuccess('Item atualizado com sucesso!');
      refetch();
    }
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      showError('Erro ao deletar item.');
      console.error(error);
    } else {
      showSuccess('Item deletado com sucesso!');
      refetch();
    }
  };

  return {
    categories,
    isLoading,
    error,
    refetch,
    addCategory,
    updateCategory,
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
  };
};