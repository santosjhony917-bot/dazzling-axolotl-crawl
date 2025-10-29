import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantPlan } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';

const ADMIN_RESTAURANTS_QUERY_KEY = ['adminRestaurants'];

interface UpdatePlanPayload {
  restaurantId: string;
  newPlan: RestaurantPlan;
}

const fetchAllRestaurants = async (): Promise<Restaurant[]> => {
  // Nota: Esta query usa a chave de anon, mas RLS deve ser configurado para permitir
  // que administradores (via auth.uid() = is_admin()) leiam todos os registros.
  // Assumindo que o RLS está configurado corretamente para admins.
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Restaurant[];
};

const updateRestaurantPlan = async ({ restaurantId, newPlan }: UpdatePlanPayload): Promise<void> => {
  const { error } = await supabase
    .from('restaurants')
    .update({ plan: newPlan })
    .eq('id', restaurantId);

  if (error) throw new Error(error.message);
};

export function useAdminRestaurants() {
  const queryClient = useQueryClient();

  const restaurantsQuery = useQuery<Restaurant[], Error>({
    queryKey: ADMIN_RESTAURANTS_QUERY_KEY,
    queryFn: fetchAllRestaurants,
    staleTime: 60000,
  });

  const updatePlanMutation = useMutation({
    mutationFn: updateRestaurantPlan,
    onSuccess: (_, variables) => {
      showSuccess(`Plano do restaurante atualizado para ${variables.newPlan}!`);
      queryClient.invalidateQueries({ queryKey: ADMIN_RESTAURANTS_QUERY_KEY });
    },
    onError: (error) => {
      showError(`Falha ao atualizar plano: ${error.message}`);
    },
  });

  return {
    restaurants: restaurantsQuery.data || [],
    isLoading: restaurantsQuery.isLoading,
    error: restaurantsQuery.error,
    updatePlan: updatePlanMutation.mutate,
    isUpdating: updatePlanMutation.isPending,
  };
}