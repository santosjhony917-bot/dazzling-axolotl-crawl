import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, Profile } from '@/types/supabase';
import { useQuery } from '@tanstack/react-query';
import { getProfile, getRestaurantByUserId } from '@/integrations/supabase/profile';

interface AuthContextType {
  user: User | null;
  isLoading: boolean; // Este isLoading agora representará o carregamento total
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  // Dados do perfil e restaurante
  profile: Profile | null;
  restaurant: Restaurant | null;
  isProfileLoading: boolean;
  isRestaurantLoading: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  // Adicionando refetchProfile para forçar atualização após login/signup
  refetchProfile: () => void; 
  refetchRestaurant: () => void; // Adicionado: Função para recarregar dados do restaurante
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initialAuthLoading, setInitialAuthLoading] = useState(true); // Novo estado para o carregamento inicial da autenticação
  const isAuthenticated = !!user;

  // Query para buscar Profile
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => (user ? getProfile(user.id) : null),
    enabled: isAuthenticated,
    onSuccess: (data) => console.log('AuthContext: Profile query success:', data),
    onError: (error) => console.error('AuthContext: Profile query error:', error),
  });

  // Query para buscar Restaurant
  const { data: restaurant, isLoading: isRestaurantLoading, refetch: refetchRestaurant } = useQuery({
    queryKey: ['restaurant', user?.id],
    queryFn: () => (user ? getRestaurantByUserId(user.id) : null),
    enabled: isAuthenticated,
    onSuccess: (data) => console.log('AuthContext: Restaurant query success:', data),
    onError: (error) => console.error('AuthContext: Restaurant query error:', error),
  });

  useEffect(() => {
    const handleAuthChange = async (event: string, session: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Lógica de reivindicação global
        const claimCode = localStorage.getItem('claimCode');
        if (claimCode && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          console.log('AuthContext: Código de reivindicação encontrado, tentando reivindicar restaurante...');
          try {
            const { error: functionError } = await supabase.functions.invoke('claim-restaurant', {
              body: { claimCode },
            });
            if (functionError) throw functionError;
            
            console.log('AuthContext: Restaurante reivindicado com sucesso. Recarregando dados...');
            // Força a recarga dos dados do restaurante após a reivindicação
            await refetchRestaurant();

          } catch (e: any) {
            console.error('AuthContext: Erro ao reivindicar restaurante:', e.message);
          } finally {
            // Remove o código para evitar novas tentativas
            localStorage.removeItem('claimCode');
          }
        }
      }
      setInitialAuthLoading(false); // Define como falso após a primeira mudança de estado de autenticação
    };
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange(event, session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refetchRestaurant]);

  // O estado de carregamento geral agora considera o carregamento inicial da autenticação
  // e o carregamento dos dados de perfil/restaurante (se o usuário estiver autenticado)
  const isLoading = initialAuthLoading || (isAuthenticated && (isProfileLoading || isRestaurantLoading));

  useEffect(() => {
    console.log('AuthContext: Overall loading state:', {
      initialAuthLoading,
      isAuthenticated,
      isProfileLoading,
      isRestaurantLoading,
      overallIsLoading: isLoading,
      user: user ? 'present' : 'null',
      profile: profile ? 'present' : 'null',
      restaurant: restaurant ? 'present' : 'null'
    });
  }, [initialAuthLoading, isAuthenticated, isProfileLoading, isRestaurantLoading, isLoading, user, profile, restaurant]);

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
      {/* Renderiza os filhos apenas quando não estiver carregando */}
      {!isLoading && children}
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