import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, Profile } from '@/types/supabase';
import { useQuery } from '@tanstack/react-query';
import { getProfile, getRestaurantByUserId } from '@/integrations/supabase/profile';
import { ALLOW_LOCAL_FIXTURES } from '@/lib/runtimeMode';

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
  signInWithMock?: (email: string) => boolean; // Adicionado para desenvolvimento local
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mockSession, setMockSession] = useState<{
    user: any;
    profile: any;
    restaurant: any;
  } | null>(() => {
    if (!ALLOW_LOCAL_FIXTURES) return null;
    const saved = localStorage.getItem('mockSession');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migração/Atualização automática para incluir logo e capa no mock premium
      if (parsed.restaurant && parsed.restaurant.id === 'mock-premium-restaurant-id') {
        let updated = false;
        if (!parsed.restaurant.image_url) {
          parsed.restaurant.image_url = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500';
          updated = true;
        }
        if (!parsed.restaurant.cover_image_url) {
          parsed.restaurant.cover_image_url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000';
          updated = true;
        }
        if (updated) {
          localStorage.setItem('mockSession', JSON.stringify(parsed));
        }
      }
      return parsed;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => !ALLOW_LOCAL_FIXTURES || !localStorage.getItem('mockSession'));
  const isAuthenticated = !!user || !!mockSession;

  // Query para buscar Profile
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => (user ? getProfile(user.id) : null),
    enabled: !!user && !mockSession,
  });

  // Query para buscar Restaurant
  const { data: restaurant, isLoading: isRestaurantLoading, refetch: refetchRestaurant } = useQuery({
    queryKey: ['restaurant', user?.id],
    queryFn: () => (user ? getRestaurantByUserId(user.id) : null),
    enabled: !!user && !mockSession,
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange('INITIAL_SESSION', session);
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange(event, session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refetchRestaurant]);

  useEffect(() => {
    const handleMockSessionUpdate = () => {
      if (!ALLOW_LOCAL_FIXTURES) return;
      const saved = localStorage.getItem('mockSession');
      if (saved) {
        setMockSession(JSON.parse(saved));
      }
    };
    window.addEventListener('mockSessionUpdated', handleMockSessionUpdate);
    return () => {
      window.removeEventListener('mockSessionUpdated', handleMockSessionUpdate);
    };
  }, []);

  const signOut = async () => {
    localStorage.removeItem('mockSession');
    setMockSession(null);
    await supabase.auth.signOut();
    setUser(null);
  };

  const signInWithMock = (email: string) => {
    if (!ALLOW_LOCAL_FIXTURES) return false;
    let mockData = null;
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail.includes('premium') || cleanEmail === 'premium@restaurante.com') {
      mockData = {
        user: { id: 'mock-premium-user-id', email: cleanEmail },
        profile: { id: 'mock-premium-user-id', email: cleanEmail, first_name: 'Restaurante', last_name: 'Premium', role: 'restaurant_owner' },
        restaurant: {
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
        }
      };
    } else if (cleanEmail.includes('free') || cleanEmail === 'free@restaurante.com') {
      mockData = {
        user: { id: 'mock-free-user-id', email: cleanEmail },
        profile: { id: 'mock-free-user-id', email: cleanEmail, first_name: 'Restaurante', last_name: 'Free', role: 'restaurant_owner' },
        restaurant: {
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
        }
      };
    } else if (cleanEmail.includes('admin') || cleanEmail === 'admin@restaurante.com') {
      mockData = {
        user: { id: 'mock-admin-user-id', email: cleanEmail },
        profile: { id: 'mock-admin-user-id', email: cleanEmail, first_name: 'Admin', last_name: 'Geral', role: 'admin' },
        restaurant: null
      };
    } else if (cleanEmail.includes('cliente') || cleanEmail === 'cliente@teste.com' || cleanEmail.includes('customer') || cleanEmail === 'user@teste.com') {
      mockData = {
        user: { id: 'mock-customer-user-id', email: cleanEmail },
        profile: { id: 'mock-customer-user-id', email: cleanEmail, first_name: 'Gabriel', last_name: 'Silva', role: 'authenticated' },
        restaurant: null
      };
    }

    if (mockData) {
      setMockSession(mockData);
      localStorage.setItem('mockSession', JSON.stringify(mockData));
      return true;
    }
    return false;
  };

  // Lógica de Admin e Premium (simplificada)
  const isAdmin = user?.email === 'joaoedasilva018@gmail.com' || mockSession?.profile?.role === 'admin' || mockSession?.user?.email === 'admin@restaurante.com';
  
  const activeProfile = mockSession ? mockSession.profile : (profile || null);
  const activeRestaurant = mockSession ? mockSession.restaurant : (restaurant || null);
  const activeIsProfileLoading = mockSession ? false : isProfileLoading;
  const activeIsRestaurantLoading = mockSession ? false : isRestaurantLoading;

  // CORREÇÃO: Incluindo 'premium_gift' na verificação
  const isPremium = activeRestaurant?.plan === 'premium' || activeRestaurant?.plan === 'premium_gift';

  return (
    <AuthContext.Provider
      value={{
        user: mockSession ? mockSession.user : user,
        isLoading,
        signOut,
        isAuthenticated,
        profile: activeProfile,
        restaurant: activeRestaurant,
        isProfileLoading: activeIsProfileLoading,
        isRestaurantLoading: activeIsRestaurantLoading,
        isAdmin,
        isPremium,
        refetchProfile,
        refetchRestaurant,
        signInWithMock,
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
    isRestaurantLoading: context.isRestaurantLoading,
    refetchProfile: context.refetchProfile,
    refetchRestaurant: context.refetchRestaurant,
    signInWithMock: context.signInWithMock,
  };
};
