"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Restaurant, Profile, RestaurantPlan } from '@/types/supabase'; // Importando os tipos definidos

// Define o email do administrador para verificação
const ADMIN_EMAIL = 'joaoedasilva018@gmail.com'; // Substitua pelo email real do administrador

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  restaurant: Restaurant | null;
  isAuthenticated: boolean;
  isProfileLoading: boolean; // Renomeado de isLoading
  isAdmin: boolean;
  isPremium: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true); // Começa como true
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const fetchUserData = useCallback(async (sessionUser: User) => {
    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('AuthContext: Erro ao buscar perfil do usuário:', profileError);
      setProfile(null);
    } else if (profileData) {
      setProfile(profileData);
    } else {
      setProfile(null);
    }

    // Fetch restaurant data
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', sessionUser.id)
      .single();

    if (restaurantError && restaurantError.code !== 'PGRST116') {
      console.error('AuthContext: Erro ao buscar dados do restaurante:', restaurantError);
      setRestaurant(null);
      setIsPremium(false);
    } else if (restaurantData) {
      setRestaurant(restaurantData);
      setIsPremium(restaurantData.plan === 'premium');
    } else {
      setRestaurant(null);
      setIsPremium(false);
    }

    // Check if user is admin
    setIsAdmin(sessionUser.email === ADMIN_EMAIL);
  }, []);

  const signOut = useCallback(async () => {
    setIsProfileLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('AuthContext: Erro ao fazer logout:', error);
    }
    // Reset all states
    setUser(null);
    setProfile(null);
    setRestaurant(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsPremium(false);
    setIsProfileLoading(false);
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user) {
      setIsProfileLoading(true);
      await fetchUserData(user);
      setIsProfileLoading(false);
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Evento de autenticação:', event, 'Sessão:', session);
        setIsProfileLoading(true); // Sempre defina como true no início de qualquer mudança de estado de autenticação

        if (session) {
          setUser(session.user);
          setIsAuthenticated(true);
          await fetchUserData(session.user); // Aguarda o carregamento dos dados do perfil/restaurante
        } else {
          setUser(null);
          setProfile(null);
          setRestaurant(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsPremium(false);
        }
        setIsProfileLoading(false); // Define como false somente após todos os dados serem processados
      }
    );

    // Realiza uma verificação inicial da sessão para o carregamento da página
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
        await fetchUserData(session.user);
      }
      setIsProfileLoading(false); // Define como false após a verificação inicial, independentemente de haver sessão
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserData]);

  return (
    <AuthContext.Provider value={{ user, profile, restaurant, isAuthenticated, isProfileLoading, isAdmin, isPremium, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthData = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthData must be used within an AuthProvider');
  }
  return context;
};