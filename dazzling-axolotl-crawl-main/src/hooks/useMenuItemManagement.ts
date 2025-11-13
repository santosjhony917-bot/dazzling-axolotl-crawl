import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuItem } from '@/types/supabase';
import { MenuItemFormValues } from '@/components/restaurant/menu/ItemFormDialog';

// --- API Functions ---

const getMenuItems = async (categoryId: string) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('order_index', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

type CreateMenuItemPayload = Omit<MenuItem, 'id' | 'created_at' | 'order_index'>;

const createMenuItem = async (item: CreateMenuItemPayload) => {
  const { data, error } = await supabase
    .from('menu_items')
    .insert(item)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const updateMenuItem = async ({ id, updates }: { id: string; updates: Partial<MenuItemFormValues> | { is_active: boolean } }) => {
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteMenuItem = async (id: string) => {
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
};


// --- Hooks ---

// Hook principal para páginas que gerenciam itens dentro de uma categoria
export const useMenuItemManagement = (categoryId: string, restaurantId?: string) => {
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ['menu-items', categoryId],
    queryFn: () => getMenuItems(categoryId),
    enabled: !!categoryId,
  });

  const invalidateQueries = (data?: MenuItem) => {
    const catId = categoryId || data?.category_id;
    if (catId) {
      queryClient.invalidateQueries({ queryKey: ['menu-items', catId] });
    }
    if (restaurantId) {
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
    }
  };

  const createItemMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => invalidateQueries(),
  });

  const updateItemMutation = useMutation({
    mutationFn: updateMenuItem,
    onSuccess: (data) => invalidateQueries(data),
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => invalidateQueries(),
  });

  return {
    itemsQuery,
    createItemMutation,
    updateItemMutation,
    deleteItemMutation,
  };
};

// Hook de mutação autônomo para componentes que precisam apenas atualizar um item
export const useUpdateMenuItem = (restaurantId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateMenuItem,
        onSuccess: (updatedItem) => {
            if (updatedItem?.category_id) {
                queryClient.invalidateQueries({ queryKey: ['menu-items', updatedItem.category_id] });
            }
            if (restaurantId) {
                queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
            }
        },
    });
};