import { useState, useCallback, useEffect } from 'react';
import { useAuthData } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { mutate as swrMutate } from 'swr';

// Definindo um tipo genérico para updates, já que o formulário específico foi removido.
type RestaurantUpdatePayload = Partial<Restaurant>;

export const useRestaurantProfile = (restaurantIdFromProps?: string) => {
  const { user } = useAuthData();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const fetchRestaurant = useCallback(async (idToFetch?: string) => {
    setIsLoading(true);
    
    // Bypass local para usuários mockados
    const activeUserId = user?.id;
    if (activeUserId && activeUserId.startsWith('mock-')) {
      // Tenta carregar do localStorage
      try {
        const saved = localStorage.getItem('mockSession');
        if (saved) {
          const session = JSON.parse(saved);
          if (session.restaurant && session.restaurant.user_id === activeUserId) {
            setRestaurant(session.restaurant);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Erro ao ler mockSession em useRestaurantProfile:', e);
      }

      let mockRest = null;
      if (activeUserId === 'mock-premium-user-id') {
        mockRest = {
          id: 'mock-premium-restaurant-id',
          name: 'Sabor Premium Gourmet',
          plan: 'premium',
          user_id: 'mock-premium-user-id',
          slug: 'sabor-premium-gourmet',
          phone: '(11) 99999-9999',
          cep: '01310-100',
          address: 'Avenida Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          claim_code: 'PREMIUM123',
          image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
          cover_image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000'
        };
      } else if (activeUserId === 'mock-free-user-id') {
        mockRest = {
          id: 'mock-free-restaurant-id',
          name: 'Lancheira do Zé (Free)',
          plan: 'free',
          user_id: 'mock-free-user-id',
          slug: 'lancheira-do-ze',
          phone: '(11) 98888-8888',
          cep: '01310-200',
          address: 'Avenida Paulista',
          number: '2000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          claim_code: 'FREE123'
        };
      }
      setRestaurant(mockRest as any);
      setIsLoading(false);
      return;
    }

    let query = supabase.from('restaurants').select('*');

    if (idToFetch) {
      query = query.eq('id', idToFetch);
    } else if (user?.id) {
      query = query.eq('user_id', user.id);
    } else {
      setRestaurant(null);
      setIsLoading(false);
      return;
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching restaurant:', error);
      toast.error('Erro ao carregar perfil do restaurante.');
      setRestaurant(null);
    } else {
      setRestaurant(data);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRestaurant(restaurantIdFromProps);
  }, [fetchRestaurant, restaurantIdFromProps]);

  // Agora retorna { error: string | null }
  const updateRestaurant = useCallback(async (updates: RestaurantUpdatePayload): Promise<{ error: string | null }> => {
    if (!restaurant || !restaurant.id) {
      const msg = 'Restaurante não encontrado para atualização.';
      toast.error(msg);
      return { error: msg };
    }

    setIsLoading(true);
    let errorMsg: string | null = null;

    // Se o ID for de mock, atualiza no localStorage e no estado
    if (restaurant.id.startsWith('mock-')) {
      try {
        const saved = localStorage.getItem('mockSession');
        if (saved) {
          const session = JSON.parse(saved);
          session.restaurant = { ...session.restaurant, ...updates };
          localStorage.setItem('mockSession', JSON.stringify(session));
          
          // Dispara evento customizado para notificar o AuthContext a atualizar seu estado
          window.dispatchEvent(new Event('mockSessionUpdated'));
          
          // Invalida cache do TanStack Query e SWR na hora
          queryClient.invalidateQueries({ queryKey: ['publicRestaurant', restaurant.id] });
          swrMutate(`restaurant-${restaurant.id}`);
        }
        setRestaurant(prev => prev ? { ...prev, ...updates } : null);
        toast.success('Perfil do restaurante atualizado com sucesso!');
        setIsLoading(false);
        return { error: null };
      } catch (e: any) {
        setIsLoading(false);
        return { error: e.message };
      }
    }

    try {
      // Usando cast intermediário para 'unknown' para lidar com tipos JSONB como opening_hours
      const { data: updatedData, error } = await supabase
        .from('restaurants')
        .update(updates as unknown as Partial<Restaurant>)
        .eq('id', restaurant.id)
        .select()
        .single();

      if (error) {
        errorMsg = error.message;
        console.error('Error updating restaurant:', error);
        toast.error('Erro ao atualizar perfil do restaurante.');
      } else {
        setRestaurant(updatedData);
        toast.success('Perfil do restaurante atualizado com sucesso!');
        // Invalida cache do TanStack Query e SWR na hora
        queryClient.invalidateQueries({ queryKey: ['publicRestaurant', restaurant.id] });
        swrMutate(`restaurant-${restaurant.id}`);
      }
    } catch (e) {
      errorMsg = (e as Error).message;
    } finally {
      setIsLoading(false);
    }

    return { error: errorMsg };
  }, [restaurant, queryClient]);

  return {
    restaurant,
    isLoading,
    refetchProfile: () => fetchRestaurant(restaurantIdFromProps),
    updateRestaurant,
  };
};