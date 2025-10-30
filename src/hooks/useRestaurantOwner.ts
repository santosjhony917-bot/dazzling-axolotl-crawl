import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface RestaurantOwnerState {
  restaurantId: string | null;
  isLoading: boolean;
  error: Error | null;
}

export const useRestaurantOwner = (): RestaurantOwnerState => {
  const { user } = useAuth();
  const [state, setState] = useState<RestaurantOwnerState>({
    restaurantId: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setState({ restaurantId: null, isLoading: false, error: null });
      return;
    }

    const fetchRestaurant = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (no restaurant)
        console.error('Error fetching restaurant:', error);
        setState({ restaurantId: null, isLoading: false, error: error as unknown as Error });
      } else {
        setState({ 
          restaurantId: data?.id || null, 
          isLoading: false, 
          error: null 
        });
      }
    };

    fetchRestaurant();
  }, [user]);

  return state;
};