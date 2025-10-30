import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuItem, CreateItemPayload, UpdateItemPayload } from '@/types/menu'; // Import payloads from types/menu
import { toast } from 'react-hot-toast'; // Importando toast

// --- API Calls ---

const fetchMenuItems = async (categoryId: string): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

const createMenuItem = async (payload: CreateItemPayload): Promise<MenuItem> => {
  // The payload already contains category_id, name, price, is_active, description, image_url
  const { data, error } = await supabase
    .from('menu_items')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const updateMenuItem = async ({ id, updates }: UpdateItemPayload): Promise<MenuItem> => {
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const deleteMenuItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// --- Individual Mutation Hooks (Exported for ItemFormDialog) ---

export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      toast.success('Item de menu criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['publicMenu'] });
    },
    onError: (e) => {
      toast.error(`Falha ao criar item: ${e.message}`);
    }
  });
};

export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMenuItem,
    onSuccess: () => {
      toast.success('Item de menu atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['publicMenu'] });
    },
    onError: (e) => {
      toast.error(`Falha ao atualizar item: ${e.message}`);
    }
  });
};

export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      toast.success('Item de menu deletado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['publicMenu'] });
    },
    onError: (e) => {
      toast.error(`Falha ao deletar item: ${e.message}`);
    }
  });
};

// --- Combined Hook for CategoryDetails (List + Mutations) ---

export const useMenuItemManagement = (categoryId: string) => {
  const itemsQuery = useQuery<MenuItem[], Error>({
    queryKey: ['menuItems', categoryId],
    queryFn: () => fetchMenuItems(categoryId),
    enabled: !!categoryId,
  });
  
  const createItemMutation = useCreateMenuItem();
  const updateItemMutation = useUpdateMenuItem();
  const deleteItemMutation = useDeleteMenuItem();

  return {
    itemsQuery,
    createItemMutation,
    updateItemMutation,
    deleteItemMutation,
  };
};