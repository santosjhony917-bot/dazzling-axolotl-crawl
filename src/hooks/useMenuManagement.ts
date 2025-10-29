import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateItemPayload, UpdateItemPayload } from '@/types/menu';

const MENU_ITEMS_QUERY_KEY = ['menuItems'];

// --- Create Menu Item Hook ---
export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateItemPayload) => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      // Invalidate queries related to menu items to refetch data
      queryClient.invalidateQueries({ queryKey: MENU_ITEMS_QUERY_KEY });
    },
  });
};

// --- Update Menu Item Hook ---
export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: UpdateItemPayload) => {
      const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_ITEMS_QUERY_KEY });
    },
  });
};

// --- Delete Menu Item Hook ---
export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_ITEMS_QUERY_KEY });
    },
  });
};