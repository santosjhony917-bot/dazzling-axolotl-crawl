"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'basic' | 'premium';
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  category: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: any | null; // Consider defining a more specific type for opening_hours
  created_at: string;
  external_url: string | null;
  followers_override: number;
  payment_methods: any | null; // Consider defining a more specific type
  social_networks: any | null; // Consider defining a more specific type
  other_url_label: string | null;
  claim_code: string | null;
  visit_status: string | null; // Consider defining a more specific enum type
  visit_notes: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isPremium: boolean;
  profile: Profile | null;
  restaurant: Restaurant | null;
  refetchRestaurant: () => void;
  refetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } else {
      setProfile(data);
    }
  }, []);

  const fetchRestaurant = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // console.error('Error fetching restaurant:', error); // Expected if user has no restaurant
      setRestaurant(null);
    } else {
      setRestaurant(data);
      setIsPremium(data.plan === 'premium');
    }
  }, []);

  const checkAdminStatus = useCallback(async (userId: string) => {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } else {
      setIsAdmin(data);
    }
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);

        if (currentSession?.user) {
          fetchProfile(currentSession.user.id);
          fetchRestaurant(currentSession.user.id);
          checkAdminStatus(currentSession.user.id);
        } else {
          setProfile(null);
          setRestaurant(null);
          setIsAdmin(false);
          setIsPremium(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile, fetchRestaurant, checkAdminStatus]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao fazer logout.');
      console.error('Error signing out:', error);
    } else {
      toast.success('Logout realizado com sucesso!');
      setUser(null);
      setSession(null);
      setProfile(null);
      setRestaurant(null);
      setIsAdmin(false);
      setIsPremium(false);
    }
  };

  const refetchRestaurant = () => {
    if (user) {
      fetchRestaurant(user.id);
    }
  };

  const refetchProfile = () => {
    if (user) {
      fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signOut,
        isAdmin,
        isPremium,
        profile,
        restaurant,
        refetchRestaurant,
        refetchProfile,
      }}
    >
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