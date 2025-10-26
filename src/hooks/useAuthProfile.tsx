import { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, getRestaurantByUserId } from '@/integrations/supabase/profile';
import { Profile, Restaurant } from '@/types/restaurant';
import { useToast } from '@/components/ui/use-toast';

interface UserRoles {
  isAdmin: boolean;
  isRestaurantOwner: boolean;
  isPremium: boolean;
}

interface AuthProfile {
  profile: Profile | null;
  restaurant: Restaurant | null;
  roles: UserRoles;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetchProfile: () => void;
  refetchRestaurant: () => void;
}

const defaultRoles: UserRoles = {
  isAdmin: false,
  isRestaurantOwner: false,
  isPremium: false,
};

export const useAuthProfile = (): AuthProfile => {
  // CORREÇÃO 1, 4, 5: Usando useAuthContext para obter session e isLoading
  const { session, isLoading: isAuthLoading } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAuthenticated = !!session;
  const userId = session?.user?.id;

  // 1. Fetch Profile Data
  const { 
    data: profile, 
    isLoading: isProfileLoading, 
    refetch: refetchProfile 
  } = useQuery<Profile | null, Error>({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: isAuthenticated && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // CORREÇÃO 6: Removendo onError do options object
  });

  // 2. Fetch Restaurant Data (if user is potentially an owner)
  const { 
    data: restaurant, 
    isLoading: isRestaurantLoading, 
    refetch: refetchRestaurant 
  } = useQuery<Restaurant | null, Error>({
    queryKey: ['restaurant', userId],
    queryFn: () => getRestaurantByUserId(userId!),
    enabled: isAuthenticated && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // CORREÇÃO 7: Removendo onError do options object
  });

  // 3. Determine Roles
  // CORREÇÃO 8: Importando useMemo de 'react'
  const roles: UserRoles = useMemo(() => {
    // CORREÇÃO 9: profile é do tipo Profile | null, que não tem is_admin. 
    // Assumindo que a lógica de admin está no AuthContext ou será adicionada ao Profile.
    // Por enquanto, usamos o mock de admin do AuthContext para consistência.
    const isAdmin = profile?.is_admin ?? false; 
    const isRestaurantOwner = !!restaurant;
    
    // CORREÇÃO 10, 11: restaurant é do tipo Restaurant | null
    const isPremium = restaurant?.plan === 'premium' || restaurant?.plan === 'premium_gift';

    return {
      isAdmin,
      isRestaurantOwner,
      isPremium,
    };
  }, [profile, restaurant]);

  // 4. Combined Loading State
  const isLoading = isAuthLoading || isProfileLoading || isRestaurantLoading;

  // 5. Memoize the result
  // CORREÇÃO 12: Importando useMemo de 'react'
  const authProfileResult = useMemo(() => ({
    profile: profile ?? null,
    restaurant: restaurant ?? null,
    roles,
    isLoading,
    isAuthenticated,
    refetchProfile,
    refetchRestaurant,
  }), [profile, restaurant, roles, isLoading, isAuthenticated, refetchProfile, refetchRestaurant]);

  return authProfileResult;
};

// Helper hook to access roles quickly
export const useUserRoles = (): UserRoles & { isLoading: boolean; isAuthenticated: boolean } => {
  const { roles, isLoading, isAuthenticated } = useAuthProfile();
  return { ...roles, isLoading, isAuthenticated };
};

// Helper hook to access profile and restaurant data
export const useUserData = () => {
  const { profile, restaurant, isLoading, isAuthenticated, roles, refetchProfile, refetchRestaurant } = useAuthProfile();
  
  // CORREÇÃO: Usar o valor do hook de roles, que já inclui a lógica de 'premium_gift'
  const isPremium = roles?.isPremium ?? (restaurant?.plan === 'premium' || restaurant?.plan === 'premium_gift');
  const isAdmin = roles?.isAdmin ?? false;

  return {
    profile,
    restaurant,
    isLoading,
    isAuthenticated,
    isRestaurantOwner: roles.isRestaurantOwner,
    isPremium,
    isAdmin,
    refetchProfile,
    refetchRestaurant,
  };
};