"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { toast } from 'sonner';

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

interface RestaurantContextType {
  restaurant: Restaurant | null;
  isLoading: boolean;
  refreshRestaurantData: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuthData();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRestaurant = useCallback(async () => {
    if (!user) {
      setRestaurant(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching restaurant:', error);
      toast.error('Erro ao carregar dados do restaurante.');
      setRestaurant(null);
    } else if (data) {
      setRestaurant(data);
    } else {
      setRestaurant(null);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (session) {
      fetchRestaurant();
    } else {
      setRestaurant(null);
      setIsLoading(false);
    }
  }, [session, fetchRestaurant]);

  const refreshRestaurantData = () => {
    fetchRestaurant();
  };

  return (
    <RestaurantContext.Provider value={{ restaurant, isLoading, refreshRestaurantData }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurantData = () => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurantData must be used within a RestaurantProvider');
  }
  return context;
};