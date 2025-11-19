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
}

const fetchAllRestaurants = async (filters: FetchRestaurantsFilters): Promise<Restaurant[]> => {
  const PAGE_SIZE = 999; // Fetch in chunks to avoid Supabase limit
  let allRestaurants: Restaurant[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('restaurants')
      .select('*')
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

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching restaurants page:', error);
      throw new Error(error.message);
    }

    if (data && data.length > 0) {
      allRestaurants.push(...data);
      page++;
    } else {
      hasMore = false;
    }
    
    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    }
  }

  return allRestaurants;
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
  const { error } = await supabase
    .from('restaurants')
    .delete()
    .in('id', restaurantIds);

  if (error) throw new Error(error.message);
};

export function useAdminRestaurants(filters: FetchRestaurantsFilters) {
  const queryClient = useQueryClient();

  const restaurantsQuery = useQuery<Restaurant[], Error>({
    queryKey: [ADMIN_RESTAURANTS_QUERY_KEY, filters],
    queryFn: () => fetchAllRestaurants(filters),
    staleTime: 60000,
  });

  const updatePlanMutation = useMutation({
    mutationFn: updateRestaurantPlan,
    onSuccess: (_, variables) => {
      showSuccess(`Plano do restaurante atualizado para ${variables.newPlan}!`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY, filters] });
    },
    onError: (error) => {
      showError(`Falha ao atualizar plano: ${error.message}`);
    },
  });

  const updateMultiplePlansMutation = useMutation({
    mutationFn: updateMultipleRestaurantPlans,
    onSuccess: (_, variables) => {
      showSuccess(`${variables.restaurantIds.length} restaurante(s) atualizado(s) para o plano ${variables.newPlan}!`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY, filters] });
    },
    onError: (error) => {
      showError(`Falha ao atualizar planos: ${error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: updateRestaurantVisitStatus,
    onSuccess: (_, variables) => {
      showSuccess(`Status do restaurante atualizado para ${variables.newStatus}!`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY, filters] });
    },
    onError: (error) => {
      showError(`Falha ao atualizar status: ${error.message}`);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: updateRestaurantVisitNotes,
    onSuccess: () => {
      showSuccess(`Anotações do restaurante atualizadas!`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY, filters] });
    },
    onError: (error) => {
      showError(`Falha ao atualizar anotações: ${error.message}`);
    },
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: deleteRestaurant,
    onSuccess: () => {
      showSuccess('Restaurante removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY, filters] });
    },
    onError: (error) => {
      showError(`Falha ao remover restaurante: ${error.message}`);
    },
  });

  const deleteMultipleRestaurantsMutation = useMutation({
    mutationFn: deleteMultipleRestaurants,
    onSuccess: (_, variables) => {
      showSuccess(`${variables.length} restaurantes removidos com sucesso!`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_RESTAURANTS_QUERY_KEY, filters] });
    },
    onError: (error) => {
      showError(`Falha ao remover restaurantes: ${error.message}`);
    },
  });

  return {
    restaurants: restaurantsQuery.data || [],
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