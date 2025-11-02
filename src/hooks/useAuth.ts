import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

// Tipos para Profile e Restaurant (baseados no seu schema Supabase)
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface Restaurant {
  id: string;
  user_id: string | null;
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
  opening_hours: any | null; // Pode ser mais específico se tiver um tipo JSONB definido
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: any | null; // Pode ser mais específico se tiver um tipo JSONB definido
  social_networks: any | null; // Pode ser mais específico se tiver um tipo JSONB definido
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching profile:', error);
      setProfile(null);
    } else if (data) {
      setProfile(data);
    } else {
      setProfile(null);
    }
  }, []);

  const fetchRestaurant = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching restaurant:', error);
      setRestaurant(null);
    } else if (data) {
      setRestaurant(data);
    } else {
      setRestaurant(null);
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    } else {
      setProfile(null);
    }
  }, [user, fetchProfile]);

  const refetchRestaurant = useCallback(async () => {
    if (user?.id) {
      await fetchRestaurant(user.id);
    } else {
      setRestaurant(null);
    }
  }, [user, fetchRestaurant]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);

      if (currentUser) {
        await fetchProfile(currentUser.id);
        await fetchRestaurant(currentUser.id);
      } else {
        setProfile(null);
        setRestaurant(null);
      }
    });

    // Fetch initial session state and data
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);
      if (currentUser) {
        await fetchProfile(currentUser.id);
        await fetchRestaurant(currentUser.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchRestaurant]);

  return { user, profile, restaurant, isLoading, isAuthenticated: !!user, refetchProfile, refetchRestaurant };
};