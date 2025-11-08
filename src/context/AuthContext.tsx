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
  isRestaurantLoading: boolean; // Adicionado: Estado de carregamento do restaurante
  isAdmin: boolean;
  isPremium: boolean;
  // Adicionando refetchProfile para forçar atualização após login/signup
  refetchProfile: () => void; 
  refetchRestaurant: () => void; // Adicionado: Função para recarregar dados do restaurante
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
  const { data: restaurant, isLoading: isRestaurantLoading, refetch: refetchRestaurant } = useQuery({
    queryKey: ['restaurant', user?.id],
    queryFn: () => (user ? getRestaurantByUserId(user.id) : null),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const handleAuthChange = async (event: string, session: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Lógica de reivindicação global
        const claimCode = localStorage.getItem('claimCode');
        if (claimCode && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          console.log('Código de reivindicação encontrado, tentando reivindicar restaurante...');
          try {
            const { error: functionError } = await supabase.functions.invoke('claim-restaurant', {
              body: { claimCode },
            });
            if (functionError) throw functionError;
            
            console.log('Restaurante reivindicado com sucesso. Recarregando dados...');
            // Força a recarga dos dados do restaurante após a reivindicação
            await refetchRestaurant();

          } catch (e: any) {
            console.error('Erro ao reivindicar restaurante:', e.message);
          } finally {
            // Remove o código para evitar novas tentativas
            localStorage.removeItem('claimCode');
          }
        }
      }
      setIsLoading(false);
    };
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange(event, session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refetchRestaurant]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Lógica de Admin e Premium (simplificada)
  const isAdmin = user?.email === 'joaoedasilva018@gmail.com';
  // CORREÇÃO: Incluindo 'premium_gift' na verificação
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
        isRestaurantLoading, // Adicionado
        isAdmin,
        isPremium,
        refetchProfile,
        refetchRestaurant, // Adicionado
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
    isRestaurantLoading: context.isRestaurantLoading, // Adicionado
    refetchProfile: context.refetchProfile,
    refetchRestaurant: context.refetchRestaurant, // Adicionado
  };
};