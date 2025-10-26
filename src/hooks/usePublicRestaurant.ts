import { useState, useEffect } from 'react';
import { Restaurant } from '@/types/supabase';
import { supabase } from '@/integrations/supabase/client';

export const usePublicRestaurant = (restaurantId?: string) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setError("ID do restaurante não fornecido.");
      setIsLoading(false);
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
        console.error("Erro ao buscar restaurante público:", error);
        setError(error.message);
        setRestaurant(null);
      } else if (data) {
        setRestaurant(data as Restaurant);
      } else {
        setError("Restaurante não encontrado.");
      }
      setIsLoading(false);
    };

    fetchRestaurant();
  }, [restaurantId]);

  return { restaurant, isLoading, error };
};