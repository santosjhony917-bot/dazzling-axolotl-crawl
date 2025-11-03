"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, Profile } from '@/types'; // Importando de '@/types'
import { useQuery } from '@tanstack/react-query';
import { getProfile, getRestaurantByUserId } from '@/integrations/supabase/profile';

interface AuthContextType {
  session: any | null;
  user: any | null;
  profile: Profile | null;
  restaurant: Restaurant | null;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const { data: profile, isLoading: isLoadingProfile } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: () => (user?.id ? getProfile(user.id) : Promise.resolve(null)),
    enabled: !!user,
  });

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery<Restaurant | null>({
    queryKey: ['restaurant', user?.id],
    queryFn: () => (user?.id ? getRestaurantByUserId(user.id) : Promise.resolve(null)),
    enabled: !!user,
  });

  const { data: isAdmin, isLoading: isLoadingAdmin } = useQuery<boolean>({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('is_admin');
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      return data;
    },
    enabled: !!user,
  });

  const contextValue = {
    session,
    user,
    profile,
    restaurant,
    isLoading: isLoading || isLoadingProfile || isLoadingRestaurant || isLoadingAdmin,
    isAdmin: isAdmin || false,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};