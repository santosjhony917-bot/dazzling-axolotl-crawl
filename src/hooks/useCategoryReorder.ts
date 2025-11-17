import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SwapPayload {
  category_id_a: string;
  category_id_b: string;
}

const swapCategoryOrder = async ({ category_id_a, category_id_b }: SwapPayload) => {
  const { error } = await supabase.rpc('swap_category_order', {
    category_id_a,
    category_id_b,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const useCategoryReorder = (restaurantId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: swapCategoryOrder,
    onSuccess: () => {
      toast.success('Ordem da categoria atualizada com sucesso.');
      // Invalidate the categories query to refetch the ordered list
      queryClient.invalidateQueries({ queryKey: ['menu_categories', restaurantId] });
    },
    onError: (error) => {
      toast.error(`Falha ao reordenar categorias: ${error.message}`);
    },
  });
};