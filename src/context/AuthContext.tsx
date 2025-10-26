import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { Restaurant, Profile } from '@/types';
import { showError, showSuccess } from '@/utils/toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  restaurant: Restaurant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'joaoedasilva018@gmail.com';

const fetchProfileAndRestaurant = async (userId: string) => {
  // Fetch Profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching profile:', profileError);
  }

  // Fetch Restaurant (assuming one restaurant per user for simplicity)
  const { data: restaurantData, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (restaurantError && restaurantError.code !== 'PGRST116') {
    console.error('Error fetching restaurant:', restaurantError);
  }

  return {
    profile: profileData || null,
    restaurant: restaurantData || null,
  };
};

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!session;
  const isAdmin = user?.email === ADMIN_EMAIL;
  const isPremium = restaurant?.plan === 'premium';

  const loadUserData = useCallback(async (currentUser: User) => {
    try {
      const { profile, restaurant } = await fetchProfileAndRestaurant(currentUser.id);
      setProfile(profile);
      setRestaurant(restaurant);
    } catch (e) {
      showError('Falha ao carregar dados do usuário.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      await loadUserData(user);
    }
  }, [user, loadUserData]);

  const handleSignOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao sair: ' + error.message);
    } else {
      showSuccess('Você saiu com sucesso.');
      // State change handled by onAuthStateChange listener
    }
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setIsLoading(true);
          await loadUserData(currentSession.user);
        } else {
          setProfile(null);
          setRestaurant(null);
          setIsLoading(false);
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        loadUserData(session.user);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadUserData]);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, 
      restaurant, 
      isLoading, 
      isAuthenticated,
      isAdmin,
      isPremium,
      signOut: handleSignOut,
      refetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthContextProvider');
  }
  return context;
};