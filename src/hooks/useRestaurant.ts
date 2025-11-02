"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';

export const useRestaurant = (id: string | undefined) => {
  const [data, setData] = useState<PublicRestaurantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('restaurants')
        .select(
          `
          *,
          restaurant_gallery(*),
          menu_categories(
            *,
            menu_items(*)
          )
          `
        )
        .eq('id', id)
        .single();

      if (error) {
        setError(error);
        setData(null);
      } else {
        setData(data as PublicRestaurantData);
      }
      setIsLoading(false);
    };

    fetchRestaurant();
  }, [id]);

  return { data, isLoading, error };
};