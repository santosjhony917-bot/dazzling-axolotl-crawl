import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantPlan, VisitStatus } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';

const ADMIN_RESTAURANTS_QUERY_KEY = 'adminRestaurants';

interface UpdatePlanPayload {
  restaurantId: string;
  newPlan: RestaurantPlan;
}

interface UpdateMultiplePlansPayload {
  restaurantIds: string[];
  newPlan: RestaurantPlan;
}

interface UpdateStatusPayload {
  restaurantId: string;
  newStatus: VisitStatus;
}

interface UpdateNotesPayload {
  restaurantId: string;
  newNotes: string;
}

interface FetchRestaurantsFilters {
  name?: string;
  city?: string;
  state?: string;
  plan?: string;
  neighborhood?: string;
  visit_status?: string;
}

interface FetchRestaurantsResult {
  data: Restaurant[];
  count: number;
}

const fetchRestaurants = async (filters: FetchRestaurantsFilters, page: number, pageSize: number): Promise<FetchRestaurantsResult> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('restaurants')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.name) {
    query = query.ilike('name', `%${filters.name}%`);
  }
  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`);
  }
  if (filters.neighborhood) {
    query = query.ilike('neighborhood', `%${filters.neighborhood}%`);
  }
  if (filters.state && filters.state !== 'all') {
    query = query.eq('state', filters.state);
  }
  if (filters.plan && filters.plan !== 'all') {
    query = query.eq('plan', filters.plan);
  }
  if (filters.visit_status && filters.visit_status !== 'all') {
    query = query.eq('visit_status', filters.visit_status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching restaurants page:', error);
    throw new Error(error.message);
  }

  return { data: data || [], count: count || 0 };
};

const updateRestaurantPlan = async ({ restaurantId, newPlan }: { restaurantId: string; newPlan: RestaurantPlan }) => {
  const { error } = await supabase
    .from('restaurants')
    .update({ plan: newPlan })
    .eq('id', restaurantId);

  if (error) throw new Error(error.message);
};

const updateMultipleRestaurantPlans = async ({ restaurantIds, newPlan }: UpdateMultiplePlansPayload): Promise<void> => {
  const CHUNK_SIZE = 500; // Process in chunks to avoid Supabase limits

  for (let i = 0; i < restaurantIds.length; i += CHUNK_SIZE) {
    const chunk = restaurantIds.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('restaurants')
      .update({ plan: newPlan })
      .in('id', chunk);

    if (error) {
      console.error('Error updating restaurant plans chunk:', error);
      throw new Error(`Falha ao atualizar um lote de restaurantes: ${error.message}`);
    }
  }
};

const updateRestaurantVisitStatus = async ({ restaurantId, newStatus }: UpdateStatusPayload): Promise<void> => {
  const { error } = await supabase
    .from('restaurants')
    .update({ visit_status: newStatus })
    .eq('id', restaurantId);

  if (error) throw new Error(error.message);
};

const updateRestaurantVisitNotes = async ({ restaurantId, newNotes }: UpdateNotesPayload): Promise<void> => {
  const { error } = await supabase
    .from('restaurants')
    .update({ visit_notes: newNotes })
    .eq('id', restaurantId);

  if (error) throw new Error(error.message);
};

const deleteRestaurant = async (restaurantId: string): Promise<void> => {
  const { error } = await supabase
    .from('restaurants')
    .delete()
    .eq('id', restaurantId);

  if (error) throw new Error(error.message);
};

const deleteMultipleRestaurants = async (restaurantIds: string[]): Promise<void> => {
  const CHUNK_SIZE = 500; // Process in chunks to avoid Supabase limits

  for (let i = 0; i < restaurantIds.length; i += CHUNK_SIZE) {
    const chunk = restaurantIds.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .in('id', chunk);

    if (error) {
      console.error('Error deleting restaurants chunk:', error);
      throw new Error(`Falha ao remover um lote de restaurantes: ${error.message}`);
    }
  }
};

export function useAdminRestaurants(filters: FetchRestaurantsFilters, page: number = 1, pageSize: number = 50) {
  const queryClient = useQueryClient();

  const restaurantsQuery = useQuery<FetchRestaurantsResult, Error>({
    queryKey: [ADMIN_RESTAURANTS_QUERY_KEY, filters, page, pageSize],
    queryFn: () => fetchRestaurants(filters, page, pageSize),
    staleTime: 60000,
    placeholderData: (previousData) => previousData,
  });

  const updatePlanMutation = useMutation({
    mutationFn: updateRestaurantPlan,
    onSuccess: (_, variables) => {
      showSuccess(`Plano do restaurante atualizado para ${variables.newPlan}!`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY] });
    },
    onError: (error) => {
      showError(`Falha ao atualizar plano: ${error.message}`);
    },
  });

  const updateMultiplePlansMutation = useMutation({
    mutationFn: updateMultipleRestaurantPlans,
    onSuccess: (_, variables) => {
      showSuccess(`${variables.restaurantIds.length} restaurante(s) atualizado(s) para o plano ${variables.newPlan}!`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY] });
    },
    onError: (error) => {
      showError(`Falha ao atualizar planos: ${error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: updateRestaurantVisitStatus,
    onSuccess: (_, variables) => {
      showSuccess(`Status do restaurante atualizado para ${variables.newStatus}!`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY] });
    },
    onError: (error) => {
      showError(`Falha ao atualizar status: ${error.message}`);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: updateRestaurantVisitNotes,
    onSuccess: () => {
      showSuccess(`Anotações do restaurante atualizadas!`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY] });
    },
    onError: (error) => {
      showError(`Falha ao atualizar anotações: ${error.message}`);
    },
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: deleteRestaurant,
    onSuccess: () => {
      showSuccess('Restaurante removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY] });
    },
    onError: (error) => {
      showError(`Falha ao remover restaurante: ${error.message}`);
    },
  });

  const deleteMultipleRestaurantsMutation = useMutation({
    mutationFn: deleteMultipleRestaurants,
    onSuccess: (_, variables) => {
      showSuccess(`${variables.length} restaurantes removidos com sucesso!`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY] });
    },
    onError: (error) => {
      showError(`Falha ao remover restaurantes: ${error.message}`);
    },
  });

  return {
    restaurants: restaurantsQuery.data?.data || [],
    totalCount: restaurantsQuery.data?.count || 0,
    isLoading: restaurantsQuery.isLoading,
    error: restaurantsQuery.error,
    updatePlan: updatePlanMutation.mutate,
    isUpdatingPlan: updatePlanMutation.isPending,
    updateMultiplePlans: updateMultiplePlansMutation.mutate,
    isUpdatingMultiplePlans: updateMultiplePlansMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    updateNotes: updateNotesMutation.mutate,
    isUpdatingNotes: updateNotesMutation.isPending,
    deleteRestaurant: deleteRestaurantMutation.mutate,
    isDeletingRestaurant: deleteRestaurantMutation.isPending,
    deleteMultipleRestaurants: deleteMultipleRestaurantsMutation.mutate,
    isDeletingMultipleRestaurants: deleteMultipleRestaurantsMutation.isPending,
    refetch: restaurantsQuery.refetch,
  };
}