import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, Profile } from '@/types/supabase';
import { useQuery } from '@tanstack/react-query';
import { getProfile, getRestaurantByUserId } from '@/integrations/supabase/profile';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  // Dados do perfil e restaurante
  profile: Profile | null;
  restaurant: Restaurant | null;
  isProfileLoading: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  // Adicionando refetchProfile para forçar atualização após login/signup
  refetchProfile: () => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;

  // Query para buscar Profile
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => (user ? getProfile(user.id) : null),
    enabled: isAuthenticated,
  });

  // Query para buscar Restaurant
  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', user?.id],
    queryFn: () => (user ? getRestaurantByUserId(user.id) : null),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Lógica de Admin e Premium (simplificada)
  const isAdmin = user?.email === 'joaoedasilva018@gmail.com';
  const isPremium = restaurant?.plan === 'premium' || restaurant?.plan === 'premium_gift';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signOut,
        isAuthenticated,
        profile: profile || null,
        restaurant: restaurant || null,
        isProfileLoading,
        isAdmin,
        isPremium,
        refetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Renomeando o hook useAuth para useAuthData para evitar conflito de nome
// e para que ele seja um wrapper simples que expõe todos os dados.
export const useAuthData = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthData must be used within an AuthProvider');
  }
  return {
    user: context.user,
    isLoading: context.isLoading,
    signOut: context.signOut,
    isAdmin: context.isAdmin,
    isPremium: context.isPremium,
    restaurant: context.restaurant,
    profile: context.profile,
    isAuthenticated: context.isAuthenticated,
    isProfileLoading: context.isProfileLoading,
    refetchProfile: context.refetchProfile,
  };
};