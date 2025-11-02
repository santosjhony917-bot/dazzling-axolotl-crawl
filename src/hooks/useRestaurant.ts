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
        // Map restaurant_gallery to gallery_images to match PublicRestaurantData type
        const formattedData: PublicRestaurantData = {
          ...data,
          gallery_images: data.restaurant_gallery || [],
          // Ensure other computed fields are handled if necessary, or set to default/null
          is_favorite: false, // Default value, will be updated by RestaurantProfilePublic
          followers_count: 0, // Default value
          addressSummary: '', // Default value
          logoUrl: null, // Default value
          isOpen: false, // Default value
          statusText: '', // Default value
          nextOpenTime: null, // Default value
        };
        setData(formattedData);
      }
      setIsLoading(false);
    };

    fetchRestaurant();
  }, [id]);

  return { data, isLoading, error };
};