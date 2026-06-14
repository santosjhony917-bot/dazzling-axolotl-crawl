import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantPlan, VisitStatus } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';

const ADMIN_RESTAURANTS_QUERY_KEY = 'adminRestaurants';

export const getDeterministicUUID = (str: string): string => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  
  const hex = Math.abs(hash).toString(16).padStart(8, '0') + 
              Math.abs(hash * 31).toString(16).padStart(8, '0') +
              Math.abs(hash * 17).toString(16).padStart(8, '0') +
              Math.abs(hash * 13).toString(16).padStart(8, '0');
  
  const parts = [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(12, 15),
    ((parseInt(hex.substring(15, 17), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hex.substring(17, 19),
    hex.substring(19, 31)
  ];
  return parts.join('-');
};

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
  page?: number;
  pageSize?: number;
}

// Helper to initialize local fallback database
const getLocalFallbackRestaurants = (): Restaurant[] => {
  try {
    const saved = localStorage.getItem('mock-supabase-fallback-restaurants');
    let list: Restaurant[] = saved ? JSON.parse(saved) : [];
    
    // Always merge completed restaurants if they are not in the list or update details
    const mockCompleted = localStorage.getItem('mock-completed-restaurants');
    if (mockCompleted) {
      const parsed = JSON.parse(mockCompleted);
      Object.values(parsed).forEach((r: any) => {
        const existingIdx = list.findIndex(item => item.id === r.id);
        const mappedRestaurant: Restaurant = {
          id: r.id,
          name: r.name,
          plan: r.plan || 'free',
          phone: r.phone || '',
          category: r.category || '',
          address: r.address || '',
          neighborhood: r.neighborhood || '',
          city: r.city || '',
          state: r.state || '',
          claim_code: r.claim_code || 'CLAIM-' + r.id.substring(0, 5).toUpperCase(),
          visit_status: r.visit_status || 'Pendente',
          visit_notes: r.visit_notes || ''
        };
        
        if (existingIdx >= 0) {
          list[existingIdx] = {
            ...list[existingIdx],
            ...mappedRestaurant,
            visit_status: list[existingIdx].visit_status || mappedRestaurant.visit_status,
            visit_notes: list[existingIdx].visit_notes || mappedRestaurant.visit_notes,
          };
        } else {
          list.unshift(mappedRestaurant);
        }
      });
    }

    // If list is still empty, initialize with default list
    if (list.length === 0) {
      list.push(
        { id: 'scraped-joao-pessoa-1', name: 'Mangai Cabo Branco', plan: 'premium', city: 'João Pessoa', state: 'PB', neighborhood: 'Cabo Branco', claim_code: 'CLAIM-MANGAI', visit_status: 'Interessado', visit_notes: 'Ficou de confirmar por e-mail.' },
        { id: 'scraped-joao-pessoa-2', name: 'Tábua de Carne', plan: 'premium_gift', city: 'João Pessoa', state: 'PB', neighborhood: 'Tambaú', claim_code: 'CLAIM-TABUA', visit_status: 'Contatado', visit_notes: '' },
        { id: 'scraped-joao-pessoa-3', name: 'Appétit Burger', plan: 'free', city: 'João Pessoa', state: 'PB', neighborhood: 'Manaíra', claim_code: 'CLAIM-APPETIT', visit_status: 'Pendente', visit_notes: '' }
      );
    }
    
    localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(list));
    return list;
  } catch (e) {
    console.error("Error creating local fallback restaurants:", e);
    return [];
  }
};

const fetchAllRestaurants = async (filters: FetchRestaurantsFilters): Promise<{ restaurants: Restaurant[]; totalCount: number }> => {
  const { page, pageSize, ...queryFilters } = filters;
  const usePagination = typeof page === 'number' && typeof pageSize === 'number';
  const limit = pageSize || 999;
  const currentPage = page || 1;
  const from = (currentPage - 1) * limit;
  const to = from + limit - 1;

  const allRestaurants: Restaurant[] = [];
  let totalCount = 0;

  try {
    if (usePagination) {
      let query = supabase
        .from('restaurants')
        .select('*', { count: 'exact' })
        .neq('visit_status', 'Pendente')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (queryFilters.name) {
        query = query.ilike('name', `%${queryFilters.name}%`);
      }
      if (queryFilters.city) {
        query = query.ilike('city', `%${queryFilters.city}%`);
      }
      if (queryFilters.neighborhood) {
        query = query.ilike('neighborhood', `%${queryFilters.neighborhood}%`);
      }
      if (queryFilters.state && queryFilters.state !== 'all') {
        query = query.eq('state', queryFilters.state);
      }
      if (queryFilters.plan && queryFilters.plan !== 'all') {
        query = query.eq('plan', queryFilters.plan);
      }
      if (queryFilters.visit_status && queryFilters.visit_status !== 'all') {
        query = query.eq('visit_status', queryFilters.visit_status);
      }

      const { data, count, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const restaurantsData = data || [];
      totalCount = count || restaurantsData.length;

      return {
        restaurants: restaurantsData,
        totalCount: totalCount
      };
    } else {
      const PAGE_SIZE = 999;
      let pageNum = 0;
      let hasMore = true;
      let loopSafety = 0;

      while (hasMore && loopSafety < 30) {
        loopSafety++;
        const fromVal = pageNum * PAGE_SIZE;
        const toVal = fromVal + PAGE_SIZE - 1;

        let query = supabase
          .from('restaurants')
          .select('*')
          .neq('visit_status', 'Pendente')
          .order('created_at', { ascending: false })
          .range(fromVal, toVal);

        if (queryFilters.name) {
          query = query.ilike('name', `%${queryFilters.name}%`);
        }
        if (queryFilters.city) {
          query = query.ilike('city', `%${queryFilters.city}%`);
        }
        if (queryFilters.neighborhood) {
          query = query.ilike('neighborhood', `%${queryFilters.neighborhood}%`);
        }
        if (queryFilters.state && queryFilters.state !== 'all') {
          query = query.eq('state', queryFilters.state);
        }
        if (queryFilters.plan && queryFilters.plan !== 'all') {
          query = query.eq('plan', queryFilters.plan);
        }
        if (queryFilters.visit_status && queryFilters.visit_status !== 'all') {
          query = query.eq('visit_status', queryFilters.visit_status);
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(error.message);
        }

        if (data && data.length > 0) {
          allRestaurants.push(...data);
          pageNum++;
        } else {
          hasMore = false;
        }

        if (!data || data.length < PAGE_SIZE) {
          hasMore = false;
        }
      }

      let filteredList = allRestaurants;
      if (queryFilters.name) {
        filteredList = filteredList.filter(r => r.name.toLowerCase().includes(queryFilters.name!.toLowerCase()));
      }
      if (queryFilters.city) {
        filteredList = filteredList.filter(r => r.city?.toLowerCase().includes(queryFilters.city!.toLowerCase()));
      }
      if (queryFilters.neighborhood) {
        filteredList = filteredList.filter(r => r.neighborhood?.toLowerCase().includes(queryFilters.neighborhood!.toLowerCase()));
      }
      if (queryFilters.state && queryFilters.state !== 'all') {
        filteredList = filteredList.filter(r => r.state?.toLowerCase().includes(queryFilters.state!.toLowerCase()));
      }
      if (queryFilters.plan && queryFilters.plan !== 'all') {
        filteredList = filteredList.filter(r => r.plan === queryFilters.plan);
      }
      if (queryFilters.visit_status && queryFilters.visit_status !== 'all') {
        filteredList = filteredList.filter(r => r.visit_status === queryFilters.visit_status);
      }

      localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(filteredList));
      return {
        restaurants: filteredList,
        totalCount: filteredList.length
      };
    }
  } catch (err) {
    console.warn("Supabase fetch failed, falling back to mock database:", err);
    let list = getLocalFallbackRestaurants().filter(r => r.visit_status !== 'Pendente');

    if (queryFilters.name) {
      list = list.filter(r => r.name.toLowerCase().includes(queryFilters.name!.toLowerCase()));
    }
    if (queryFilters.city) {
      list = list.filter(r => r.city?.toLowerCase().includes(queryFilters.city!.toLowerCase()));
    }
    if (queryFilters.neighborhood) {
      list = list.filter(r => r.neighborhood?.toLowerCase().includes(queryFilters.neighborhood!.toLowerCase()));
    }
    if (queryFilters.state && queryFilters.state !== 'all') {
      list = list.filter(r => r.state?.toLowerCase().includes(queryFilters.state!.toLowerCase()));
    }
    if (queryFilters.plan && queryFilters.plan !== 'all') {
      list = list.filter(r => r.plan === queryFilters.plan);
    }
    if (queryFilters.visit_status && queryFilters.visit_status !== 'all') {
      list = list.filter(r => r.visit_status === queryFilters.visit_status);
    }

    if (usePagination) {
      return {
        restaurants: list.slice(from, from + limit),
        totalCount: list.length
      };
    }

    return {
      restaurants: list,
      totalCount: list.length
    };
  }
}

const updateRestaurantPlan = async ({ restaurantId, newPlan }: { restaurantId: string; newPlan: RestaurantPlan }) => {
  // Always update locally first (fallback database)
  try {
    const list = getLocalFallbackRestaurants();
    const updated = list.map(r => r.id === restaurantId ? { ...r, plan: newPlan } : r);
    localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(updated));
  } catch (e) {
    console.error("Error updating fallback plan locally:", e);
  }

  // Also update mock-completed-restaurants if it exists
  const mockCompleted = localStorage.getItem('mock-completed-restaurants');
  if (mockCompleted) {
    try {
      const parsed = JSON.parse(mockCompleted);
      if (parsed[restaurantId]) {
        parsed[restaurantId].plan = newPlan;
        localStorage.setItem('mock-completed-restaurants', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error("Error updating completed plan locally:", e);
    }
  }

  // Then try to update Supabase
  try {
    const uuidId = getDeterministicUUID(restaurantId);
    const { error } = await supabase
      .from('restaurants')
      .update({ plan: newPlan })
      .eq('id', uuidId);

    if (error) console.warn("Supabase update plan failed:", error.message);
  } catch (err) {
    console.warn("Supabase update plan failed, already updated locally:", err);
  }
};

const updateMultipleRestaurantPlans = async ({ restaurantIds, newPlan }: UpdateMultiplePlansPayload): Promise<void> => {
  // Always update locally first
  try {
    const list = getLocalFallbackRestaurants();
    const updated = list.map(r => restaurantIds.includes(r.id) ? { ...r, plan: newPlan } : r);
    localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(updated));
  } catch (e) {
    console.error("Error updating multiple fallback plans locally:", e);
  }

  // Also update in mock-completed-restaurants
  const mockCompleted = localStorage.getItem('mock-completed-restaurants');
  if (mockCompleted) {
    try {
      const parsed = JSON.parse(mockCompleted);
      let changed = false;
      restaurantIds.forEach(id => {
        if (parsed[id]) {
          parsed[id].plan = newPlan;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('mock-completed-restaurants', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error("Error updating multiple completed plans locally:", e);
    }
  }

  // Then try to update Supabase
  try {
    const uuidIds = restaurantIds.map(id => getDeterministicUUID(id));
    const CHUNK_SIZE = 500; // Process in chunks to avoid Supabase limits

    for (let i = 0; i < uuidIds.length; i += CHUNK_SIZE) {
      const chunk = uuidIds.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('restaurants')
        .update({ plan: newPlan })
        .in('id', chunk);

      if (error) {
        console.warn('Error updating restaurant plans chunk:', error.message);
      }
    }
  } catch (err) {
    console.warn("Supabase bulk update plans failed, already updated locally:", err);
  }
};

const updateRestaurantVisitStatus = async ({ restaurantId, newStatus }: UpdateStatusPayload): Promise<void> => {
  // Always update locally first
  try {
    const list = getLocalFallbackRestaurants();
    const updated = list.map(r => r.id === restaurantId ? { ...r, visit_status: newStatus } : r);
    localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(updated));
  } catch (e) {
    console.error("Error updating fallback status locally:", e);
  }

  // Also update in mock-completed-restaurants
  const mockCompleted = localStorage.getItem('mock-completed-restaurants');
  if (mockCompleted) {
    try {
      const parsed = JSON.parse(mockCompleted);
      if (parsed[restaurantId]) {
        parsed[restaurantId].visit_status = newStatus;
        localStorage.setItem('mock-completed-restaurants', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error("Error updating completed status locally:", e);
    }
  }

  // Then try to update Supabase
  try {
    const uuidId = getDeterministicUUID(restaurantId);
    const { error } = await supabase
      .from('restaurants')
      .update({ visit_status: newStatus })
      .eq('id', uuidId);

    if (error) console.warn("Supabase update status failed:", error.message);
  } catch (err) {
    console.warn("Supabase update status failed, already updated locally:", err);
  }
};

const updateRestaurantVisitNotes = async ({ restaurantId, newNotes }: UpdateNotesPayload): Promise<void> => {
  // Always update locally first
  try {
    const list = getLocalFallbackRestaurants();
    const updated = list.map(r => r.id === restaurantId ? { ...r, visit_notes: newNotes } : r);
    localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(updated));
  } catch (e) {
    console.error("Error updating fallback notes locally:", e);
  }

  // Also update in mock-completed-restaurants
  const mockCompleted = localStorage.getItem('mock-completed-restaurants');
  if (mockCompleted) {
    try {
      const parsed = JSON.parse(mockCompleted);
      if (parsed[restaurantId]) {
        parsed[restaurantId].visit_notes = newNotes;
        localStorage.setItem('mock-completed-restaurants', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error("Error updating completed notes locally:", e);
    }
  }

  // Then try to update Supabase
  try {
    const uuidId = getDeterministicUUID(restaurantId);
    const { error } = await supabase
      .from('restaurants')
      .update({ visit_notes: newNotes })
      .eq('id', uuidId);

    if (error) console.warn("Supabase update notes failed:", error.message);
  } catch (err) {
    console.warn("Supabase update notes failed, already updated locally:", err);
  }
};

const deleteRestaurant = async (restaurantId: string): Promise<void> => {
  // Always update locally first
  try {
    const list = getLocalFallbackRestaurants();
    const updated = list.filter(r => r.id !== restaurantId);
    localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(updated));
  } catch (e) {
    console.error("Error deleting fallback restaurant locally:", e);
  }

  // Also update in mock-completed-restaurants
  const mockCompleted = localStorage.getItem('mock-completed-restaurants');
  if (mockCompleted) {
    try {
      const parsed = JSON.parse(mockCompleted);
      if (parsed[restaurantId]) {
        delete parsed[restaurantId];
        localStorage.setItem('mock-completed-restaurants', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error("Error deleting completed restaurant locally:", e);
    }
  }

  // Then try to update Supabase
  try {
    const uuidId = getDeterministicUUID(restaurantId);
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', uuidId);

    if (error) console.warn("Supabase delete failed:", error.message);
  } catch (err) {
    console.warn("Supabase delete failed, already updated locally:", err);
  }
};

export function useAdminRestaurants(filters: FetchRestaurantsFilters) {
  const queryClient = useQueryClient();

  const restaurantsQuery = useQuery<{ restaurants: Restaurant[]; totalCount: number }, Error>({
    queryKey: [ADMIN_RESTAURANTS_QUERY_KEY, filters],
    queryFn: () => fetchAllRestaurants(filters),
    staleTime: 60000,
  });

  const refetch = restaurantsQuery.refetch;

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || e.key === 'mock-supabase-fallback-restaurants' || e.key === 'mock-completed-restaurants') {
        refetch();
      }
    };
    const handleLocalSync = () => {
      refetch();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-sync-restaurants', handleLocalSync);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-sync-restaurants', handleLocalSync);
    };
  }, [refetch]);

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

  return {
    restaurants: restaurantsQuery.data?.restaurants || [],
    totalCount: restaurantsQuery.data?.totalCount || 0,
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
    refetch: restaurantsQuery.refetch,
  };
}