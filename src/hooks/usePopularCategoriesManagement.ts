import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory } from '@/types/supabase';
import { toast } from 'sonner';

const fetchAllCategories = async (): Promise<MenuCategory[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const updateCategoryPopularStatus = async (categoryId: string, isPopular: boolean): Promise<MenuCategory> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .update({ is_popular: isPopular })
    .eq('id', categoryId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const usePopularCategoriesManagement = () => {
  const queryClient = useQueryClient();

  const { data: categories, isLoading, error } = useQuery<MenuCategory[], Error>({
    queryKey: ['allCategories'],
    queryFn: fetchAllCategories,
  });

  const updatePopularStatusMutation = useMutation<MenuCategory, Error, { categoryId: string; isPopular: boolean }>({
    mutationFn: ({ categoryId, isPopular }) => updateCategoryPopularStatus(categoryId, isPopular),
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: ['allCategories'] });
      toast.success(`Categoria '${updatedCategory.name}' atualizada com sucesso!`);
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar categoria: ${err.message}`);
    },
  });

  return {
    categories,
    isLoading,
    error,
    updatePopularStatus: updatePopularStatusMutation.mutate,
    isUpdating: updatePopularStatusMutation.isPending,
  };
};