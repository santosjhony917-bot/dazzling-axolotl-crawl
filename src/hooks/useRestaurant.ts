import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { ALLOW_LOCAL_FIXTURES } from '@/lib/runtimeMode';

const fetchRestaurant = async (id: string | undefined): Promise<Restaurant | null> => {
  if (!id) {
    return null;
  }

  if (id.startsWith('mock-')) {
    if (!ALLOW_LOCAL_FIXTURES) return null;
    // Tenta carregar do localStorage mockSession
    try {
      const saved = localStorage.getItem('mockSession');
      if (saved) {
        const session = JSON.parse(saved);
        if (session.restaurant && session.restaurant.id === id) {
          return session.restaurant;
        }
      }
    } catch (e) {
      console.error('Erro ao ler mockSession em fetchRestaurant:', e);
    }

    if (id === 'mock-premium-restaurant-id') {
      return {
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
        claim_code: 'PREMIUM123'
      } as any;
    } else if (id === 'mock-free-restaurant-id') {
      return {
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
      } as any;
    }
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .or('is_deleted.eq.false,is_deleted.is.null')
    .maybeSingle();

  if (error) {
    console.error('Error fetching restaurant:', error.message);
    throw new Error(error.message);
  }

  return data;
};

export const useRestaurant = (id: string | undefined) => {
  const { data, error, mutate, isLoading } = useSWR(
    id ? `restaurant-${id}` : null,
    () => fetchRestaurant(id)
  );

  return {
    restaurant: data,
    isLoading,
    error,
    mutate,
  };
};
