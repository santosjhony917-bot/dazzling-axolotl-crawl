import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Restaurant } from '@/types';
import { toast } from 'sonner';

interface RestaurantContextType {
  restaurant: Restaurant | null;
  loading: boolean;
  updateRestaurant: (data: Partial<Restaurant>) => Promise<void>;
  fetchRestaurant: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRestaurant = async () => {
    if (!user) {
      setRestaurant(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: no rows returned
        throw error;
      }
      setRestaurant(data);
    } catch (error: any) {
      console.error('Error fetching restaurant:', error);
      toast.error('Erro ao buscar dados do restaurante.', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurant();
  }, [user]);

  const updateRestaurant = async (updatedData: Partial<Restaurant>) => {
    if (!restaurant) {
      toast.error("Nenhum restaurante encontrado para atualizar.");
      throw new Error("No restaurant to update.");
    }

    const { data, error } = await supabase
      .from('restaurants')
      .update(updatedData)
      .eq('id', restaurant.id)
      .select()
      .single();

    if (error) {
      throw error;
    }
    if (data) {
      setRestaurant(data);
    }
  };

  return (
    <RestaurantContext.Provider value={{ restaurant, loading, updateRestaurant, fetchRestaurant }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = (): RestaurantContextType => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};