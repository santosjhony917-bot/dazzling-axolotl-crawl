import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/auth';
import { Restaurant } from '@/types/restaurant';

interface UseRestaurantResult {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useRestaurant = (): UseRestaurantResult => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const refetch = () => setRefetchIndex(prev => prev + 1);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      setRestaurant(null);
      setIsLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching restaurant:', error);
        setError(new Error(error.message));
        setRestaurant(null);
      } else if (data) {
        setRestaurant(data as Restaurant);
      } else {
        setRestaurant(null);
      }
      setIsLoading(false);
    };

    fetchRestaurant();
  }, [user, isAuthLoading, refetchIndex]);

  return { restaurant, isLoading, error, refetch };
};