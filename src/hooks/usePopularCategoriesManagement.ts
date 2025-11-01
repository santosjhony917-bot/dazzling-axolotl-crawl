import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory } from '@/types/supabase';
import { MenuCategoryWithRestaurant } from '@/types/menu';
import { toast } from 'sonner';

const fetchAllCategories = async (): Promise<MenuCategoryWithRestaurant[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select(`
      *,
      restaurants ( name )
    `)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data as MenuCategoryWithRestaurant[];
};

const updateCategoryPopularStatus = async (categoryId: string, isPopular: boolean): Promise<MenuCategoryWithRestaurant> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .update({ is_popular: isPopular })
    .eq('id', categoryId)
    .select(`
      *,
      restaurants ( name )
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as MenuCategoryWithRestaurant;
};

export const usePopularCategoriesManagement = () => {
  const queryClient = useQueryClient();

  const { data: categories, isLoading, error } = useQuery<MenuCategoryWithRestaurant[], Error>({
    queryKey: ['allCategories'],
    queryFn: fetchAllCategories,
  });

  const updatePopularStatusMutation = useMutation<MenuCategoryWithRestaurant, Error, { categoryId: string; isPopular: boolean }>({
    mutationFn: ({ categoryId, isPopular }) => updateCategoryPopularStatus(categoryId, isPopular),
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: ['allCategories'] });
      toast.success(`Categoria '${updatedCategory.name}' do restaurante '${updatedCategory.restaurants.name}' atualizada com sucesso!`);
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