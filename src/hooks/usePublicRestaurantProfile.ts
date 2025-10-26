import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantPlan } from '@/types/supabase';

interface UsePublicProfileResult {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: Error | null;
  isPremium: boolean;
  isFree: boolean;
}

export const usePublicRestaurantProfile = (restaurantId: string): UsePublicProfileResult => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId || restaurantId.length === 0) {
      setIsLoading(false);
      setError(new Error("ID do restaurante não fornecido ou inválido."));
      console.log("DEBUG PUBLIC PROFILE: ID inválido ou não fornecido.");
      return;
    }
    
    console.log("DEBUG PUBLIC PROFILE: Tentando buscar ID:", restaurantId);

    const fetchRestaurant = async () => {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      if (error) {
        console.error("DEBUG PUBLIC PROFILE: Erro Supabase:", error);
        setError(new Error(error.message));
        setRestaurant(null);
      } else {
        console.log("DEBUG PUBLIC PROFILE: Sucesso, dados:", data);
        setRestaurant(data as Restaurant);
      }
      setIsLoading(false);
    };

    fetchRestaurant();
  }, [restaurantId]);

  // CORREÇÃO APLICADA AQUI: Incluir 'premium_gift'
  const isPremium = restaurant?.plan === 'premium' || restaurant?.plan === 'premium_gift';
  const isFree = restaurant?.plan === 'free';

  return {
    restaurant,
    isLoading,
    error,
    isPremium,
    isFree,
  };
};