import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, Profile } from '@/types/supabase';
import { useQuery } from '@tanstack/react-query';
import { fetchRestaurantByUserId } from '@/integrations/supabase/restaurants';
import { fetchProfile } from '@/integrations/supabase/profiles';
import { checkIsAdmin } from '@/integrations/supabase/admin';
import { createPageUrl } from '@/utils/url'; // Importando createPageUrl

// --- Tipos ---
export interface AuthContextType { // Exportado para resolver Erro 9
  session: Session | null;
  user: User | null;
  profile: Profile | null; // Renomeado de userProfile para profile
  restaurant: Restaurant | null;
  isAdmin: boolean;
  isLoading: boolean;
  isPremium: boolean;
  refetchProfile: () => void;
  refetchRestaurant: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provedor ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Profile
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  // 2. Fetch Restaurant
  const { data: restaurant, refetch: refetchRestaurant } = useQuery({
    queryKey: ['restaurant', user?.id],
    queryFn: () => fetchRestaurantByUserId(user!.id),
    enabled: !!user,
  });
  
  // 3. Check Admin Status
  // Tipagem corrigida para boolean (Erro 4)
  const { data: isAdmin = false } = useQuery<boolean>({ 
    queryKey: ['isAdmin', user?.id],
    queryFn: checkIsAdmin,
    enabled: !!user,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Redireciona para a tela Welcome após o logout
    window.location.href = createPageUrl('welcome');
  }, []);
  
  const isPremium = useMemo(() => {
    return restaurant?.plan === 'premium' || restaurant?.plan === 'premium_gift';
  }, [restaurant?.plan]);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    restaurant,
    isAdmin,
    isLoading,
    isPremium,
    refetchProfile,
    refetchRestaurant,
    signOut,
  }), [session, user, profile, restaurant, isAdmin, isLoading, isPremium, refetchProfile, refetchRestaurant, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Hook ---
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};