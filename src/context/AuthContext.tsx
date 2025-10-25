import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showSuccess, showError } from '@/utils/toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isPremium: boolean;
  restaurant: Restaurant | null;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'joaoedasilva018@gmail.com';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const navigate = useNavigate();

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isPremium = restaurant?.plan === 'premium' || restaurant?.plan === 'premium_gift';

  const fetchRestaurantProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (user is not a restaurant owner)
      console.error("Error fetching restaurant profile:", error);
      setRestaurant(null);
    } else if (data) {
      setRestaurant(data as Restaurant);
    } else {
      setRestaurant(null);
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user) {
      await fetchRestaurantProfile(user.id);
    }
  }, [user, fetchRestaurantProfile]);

  useEffect(() => {
    const handleAuthStateChange = async (event: string, session: Session | null) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchRestaurantProfile(currentUser.id);
      } else {
        setRestaurant(null);
      }
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Fetch initial session state
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange('INITIAL_SESSION', session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchRestaurantProfile]);

  const signOut = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Erro ao sair: " + error.message);
    } else {
      showSuccess("Você saiu com sucesso.");
      navigate(createPageUrl('index'));
    }
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut, isAdmin, isPremium, restaurant, refetchProfile }}>
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