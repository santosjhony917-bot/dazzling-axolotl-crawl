import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Novo tipo para categorias agregadas
export type AggregatedCategory = {
  name: string;
  is_popular: boolean;
  restaurant_count: number;
};

const fetchAggregatedCategories = async (): Promise<AggregatedCategory[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('name, is_popular, restaurant_id'); // Buscar campos necessários

  if (error) {
    throw new Error(error.message);
  }

  const aggregated: { [key: string]: { is_popular: boolean; restaurant_ids: Set<string> } } = {};

  data.forEach(category => {
    if (!aggregated[category.name]) {
      aggregated[category.name] = { is_popular: false, restaurant_ids: new Set() };
    }
    if (category.is_popular) {
      aggregated[category.name].is_popular = true;
    }
    aggregated[category.name].restaurant_ids.add(category.restaurant_id);
  });

  return Object.keys(aggregated).map(name => ({
    name,
    is_popular: aggregated[name].is_popular,
    restaurant_count: aggregated[name].restaurant_ids.size,
  }));
};

const updateCategoryPopularStatusByName = async (categoryName: string, isPopular: boolean): Promise<void> => {
  const { error } = await supabase
    .from('menu_categories')
    .update({ is_popular: isPopular })
    .eq('name', categoryName); // Atualiza todas as categorias com este nome

  if (error) {
    throw new Error(error.message);
  }
};

export const usePopularCategoriesManagement = () => {
  const queryClient = useQueryClient();

  const { data: categories, isLoading, error } = useQuery<AggregatedCategory[], Error>({
    queryKey: ['aggregatedCategories'], // Chave de consulta alterada
    queryFn: fetchAggregatedCategories,
  });

  const updatePopularStatusMutation = useMutation<void, Error, { categoryName: string; isPopular: boolean }>({
    mutationFn: ({ categoryName, isPopular }) => updateCategoryPopularStatusByName(categoryName, isPopular),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['aggregatedCategories'] }); // Invalidar a nova chave de consulta
      toast.success(`Status de popularidade para a categoria '${variables.categoryName}' atualizado com sucesso em todos os restaurantes!`);
    },
    onError: (err, variables) => {
      toast.error(`Erro ao atualizar status de popularidade para a categoria '${variables.categoryName}': ${err.message}`);
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