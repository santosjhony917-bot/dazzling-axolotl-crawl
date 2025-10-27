import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthContext } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Database } from '@/lib/database.types';

type Restaurant = Database['public']['Tables']['restaurants']['Row'];

interface RestaurantContextType {
  restaurant: Restaurant | null;
  isLoading: boolean;
  refetchRestaurant: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider = ({ children }: { children: ReactNode }) => {
  const { session, isLoading: isAuthLoading } = useAuthContext();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRestaurant = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        throw error;
      }
      
      setRestaurant(data || null);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      showError('Falha ao carregar dados do restaurante.');
      setRestaurant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (session?.user) {
        fetchRestaurant(session.user.id);
      } else {
        setRestaurant(null);
        setIsLoading(false);
      }
    }
  }, [session, isAuthLoading]);

  const refetchRestaurant = () => {
    if (session?.user) {
      return fetchRestaurant(session.user.id);
    }
    return Promise.resolve();
  };

  return (
    <RestaurantContext.Provider value={{ restaurant, isLoading, refetchRestaurant }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurantContext = () => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurantContext must be used within a RestaurantProvider');
  }
  return context;
};