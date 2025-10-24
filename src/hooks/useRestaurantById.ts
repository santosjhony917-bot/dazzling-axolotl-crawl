import { useState, useEffect } from 'react';
import { Restaurant } from '@/types/restaurant';
import { supabase } from '@/integrations/supabase/client';

interface UseRestaurantByIdResult {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: Error | null;
}

export const useRestaurantById = (restaurantId: string | undefined): UseRestaurantByIdResult => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setIsLoading(false);
      setError(new Error("Restaurant ID not provided."));
      return;
    }

    const fetchRestaurant = async () => {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      if (error) {
        console.error("Error fetching restaurant:", error);
        setError(error as unknown as Error);
        setRestaurant(null);
      } else if (data) {
        setRestaurant(data as Restaurant);
      } else {
        setError(new Error("Restaurant not found."));
        setRestaurant(null);
      }
      setIsLoading(false);
    };

    fetchRestaurant();
  }, [restaurantId]);

  return { restaurant, isLoading, error };
};