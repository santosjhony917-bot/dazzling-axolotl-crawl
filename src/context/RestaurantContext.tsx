import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Restaurant } from '@/types/supabase'; // Assumindo que Restaurant está em types/supabase
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

interface RestaurantContextType {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

const fetchRestaurant = async (userId: string): Promise<Restaurant | null> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
    throw new Error(error.message);
  }

  return data;
};

export const RestaurantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    // Fetch initial session user ID
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const { data: restaurant, isLoading, error, refetch } = useQuery<Restaurant | null, Error>({
    queryKey: ['userRestaurant', userId],
    queryFn: () => fetchRestaurant(userId!),
    enabled: !!userId,
  });

  const contextValue: RestaurantContextType = {
    restaurant: restaurant || null,
    isLoading,
    error: error || null,
    refetch,
  };

  return (
    <RestaurantContext.Provider value={contextValue}>
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