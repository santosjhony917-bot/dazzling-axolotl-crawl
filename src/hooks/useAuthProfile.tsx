import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Restaurant } from '@/types/restaurant';
import { showError } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AuthProfileState {
  user: User | null;
  restaurant: Restaurant | null;
  isPremium: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<{ error: Error | null }>;
  refetchProfile: () => void;
}

// --- Query Keys ---
const RESTAURANT_PROFILE_KEY = (userId: string) => ['restaurantProfile', userId];
const USER_ROLE_KEY = (userId: string) => ['userRole', userId];

// --- Fetch Functions ---

// 1. Fetch Restaurant Profile by Owner ID
const fetchRestaurantByOwner = async (userId: string): Promise<Restaurant | null> => {
    const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId) 
        .maybeSingle();

    if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
    }
    
    return data as Restaurant | null;
};

// 2. Fetch User Role (Mocked/Simplified)
const fetchUserRole = async (user: User): Promise<{ isPremium: boolean, isAdmin: boolean }> => {
    // Busca o perfil do restaurante
    const restaurant = await fetchRestaurantByOwner(user.id);
    
    const isPremium = restaurant?.plan === 'premium';
    
    // Verifica se o usuário é admin:
    const isAdminByMetadata = user.user_metadata?.role === 'admin';
    const ADMIN_TEST_EMAIL = 'joaoedasilva018@gmail.com';
    const isAdminByEmail = user.email?.toLowerCase() === ADMIN_TEST_EMAIL.toLowerCase();
    
    const isAdmin = isAdminByMetadata || isAdminByEmail;
    
    return { isPremium, isAdmin };
};


export function useAuthProfile(): AuthProfileState {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Auth State Management ---
  const checkSession = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error getting session:", error);
    }
    setUser(session?.user || null);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
      
      // Se o usuário acabou de fazer login ou se a sessão foi restaurada, forçamos o refetch do perfil
      if (session?.user) {
          const userId = session.user.id;
          // Invalida para garantir que a próxima busca seja feita
          queryClient.invalidateQueries({ queryKey: RESTAURANT_PROFILE_KEY(userId) });
          queryClient.invalidateQueries({ queryKey: USER_ROLE_KEY(userId) });
          
          // Se for um evento de SIGNED_IN, garantimos que o novo perfil seja buscado imediatamente
          if (event === 'SIGNED_IN') {
              // Refetch imediato para garantir que o AdminLayout não pisque
              queryClient.refetchQueries({ queryKey: USER_ROLE_KEY(userId) });
          }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession, queryClient]);

  // --- Data Queries (TanStack Query) ---
  const userId = user?.id || 'null';
  const enabled = !!user && !authLoading;

  // Query 1: Restaurant Profile
  const { data: restaurant, isLoading: isRestaurantLoading, isFetching: isRestaurantFetching, refetch: refetchRestaurant } = useQuery<Restaurant | null, Error>({
    queryKey: RESTAURANT_PROFILE_KEY(userId),
    queryFn: () => fetchRestaurantByOwner(user!.id),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Query 2: User Roles (depende do perfil do restaurante)
  const { data: roles, isLoading: isRoleLoading, isFetching: isRoleFetching, refetch: refetchRoles } = useQuery<{ isPremium: boolean, isAdmin: boolean }, Error>({
    queryKey: USER_ROLE_KEY(userId),
    queryFn: () => fetchUserRole(user!),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
  });
  
  // --- Combined State and Actions ---
  
  // Usamos isFetching para garantir que o carregamento seja true durante a transição de dados
  const isFetchingAny = isRestaurantFetching || isRoleFetching;
  
  // O estado de carregamento é true se a autenticação estiver carregando OU se qualquer query estiver buscando dados.
  const isLoading = authLoading || isFetchingAny; 
  
  const isPremium = roles?.isPremium ?? (restaurant?.plan === 'premium'); 
  const isAdmin = roles?.isAdmin ?? false;

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      // Limpa o cache do TanStack Query após o logout
      queryClient.clear();
    }
    return { error };
  }, [queryClient]);
  
  const refetchProfile = useCallback(async () => {
      // Invalida e refaz a busca de ambos os perfis
      await queryClient.invalidateQueries({ queryKey: RESTAURANT_PROFILE_KEY(userId) });
      await queryClient.invalidateQueries({ queryKey: USER_ROLE_KEY(userId) });
      
      // Força o refetch e espera que ele termine
      await queryClient.refetchQueries({ queryKey: RESTAURANT_PROFILE_KEY(userId) });
      await queryClient.refetchQueries({ queryKey: USER_ROLE_KEY(userId) });
  }, [queryClient, userId]);

  return {
    user,
    restaurant,
    isPremium,
    isAdmin,
    isLoading,
    signOut,
    refetchProfile,
  };
}