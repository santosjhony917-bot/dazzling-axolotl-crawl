import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/restaurant';
import { useAuth } from '@/context/AuthContext';

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

      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
          throw error;
        }

        setRestaurant(data || null);
      } catch (err: any) {
        console.error('Error fetching restaurant:', err);
        setError(err.message || 'Falha ao carregar dados do restaurante.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurant();
  }, [user, refetchIndex]);

  return { restaurant, isLoading, error, refetch };
};