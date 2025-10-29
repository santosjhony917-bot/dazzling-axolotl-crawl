import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuItem } from '@/types/menu';

// --- Item Management Hooks ---

interface CreateItemPayload extends Omit<MenuItem, 'id' | 'created_at' | 'order_index'> {}
interface UpdateItemPayload {
  id: string;
  updates: Partial<MenuItem>;
}

const createMenuItem = async (payload: CreateItemPayload): Promise<MenuItem> => {
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

export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuManagement'] });
      queryClient.invalidateQueries({ queryKey: ['publicMenu'] });
    },
  });
};

export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuManagement'] });
      queryClient.invalidateQueries({ queryKey: ['publicMenu'] });
    },
  });
};

export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuManagement'] });
      queryClient.invalidateQueries({ queryKey: ['publicMenu'] });
    },
  });
};