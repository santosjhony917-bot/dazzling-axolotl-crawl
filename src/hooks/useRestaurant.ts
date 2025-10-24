import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/restaurant';
import { useAuth } from '@/context/AuthContext'; // Importação corrigida

interface UseRestaurantResult {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useRestaurant = (): UseRestaurantResult => {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const refetch = () => setRefetchIndex(prev => prev + 1);

  useEffect(() => {
    if (!user) {
      setRestaurant(null);
      setIsLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      setIsLoading(true);
      setError(null);
      
      // Busca o restaurante associado ao user_id
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        console.error('Error fetching restaurant:', error);
        setError(error.message);
        setRestaurant(null);
      } else if (data) {
        setRestaurant(data as Restaurant);
      } else {
        setRestaurant(null);
      }
      
      setIsLoading(false);
    };

    fetchRestaurant();
  }, [user, refetchIndex]);

  return { restaurant, isLoading, error, refetch };
};