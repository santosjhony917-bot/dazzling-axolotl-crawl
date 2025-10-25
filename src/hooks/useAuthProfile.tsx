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
const fetchUserRole = async (userId: string): Promise<{ isPremium: boolean, isAdmin: boolean }> => {
    // Busca o perfil do restaurante (usando o cache se possível)
    const restaurant = await fetchRestaurantByOwner(userId);
    
    const isPremium = restaurant?.plan === 'premium';
    
    // Mock: Apenas um usuário específico é admin (ex: o primeiro usuário criado)
    const isAdmin = userId === 'mock-admin-id'; 
    
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession]);

  // --- Data Queries (TanStack Query) ---
  const userId = user?.id || 'null';
  const enabled = !!user && !authLoading;

  // Query 1: Restaurant Profile
  const { data: restaurant, isLoading: isRestaurantLoading, refetch: refetchRestaurant } = useQuery<Restaurant | null, Error>({
    queryKey: RESTAURANT_PROFILE_KEY(userId),
    queryFn: () => fetchRestaurantByOwner(user!.id),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Query 2: User Roles (depende do perfil do restaurante)
  const { data: roles, isLoading: isRoleLoading, refetch: refetchRoles } = useQuery<{ isPremium: boolean, isAdmin: boolean }, Error>({
    queryKey: USER_ROLE_KEY(userId),
    queryFn: () => fetchUserRole(user!.id),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
  });
  
  // --- Combined State and Actions ---
  
  const isLoading = authLoading || isRestaurantLoading || isRoleLoading;
  const isPremium = roles?.isPremium ?? (restaurant?.plan === 'premium'); // Fallback para o perfil
  const isAdmin = roles?.isAdmin ?? false;

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      // Limpa o cache do TanStack Query após o logout
      queryClient.clear();
    }
    return { error };
  }, [queryClient]);
  
  const refetchProfile = useCallback(() => {
      refetchRestaurant();
      refetchRoles();
  }, [refetchRestaurant, refetchRoles]);

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