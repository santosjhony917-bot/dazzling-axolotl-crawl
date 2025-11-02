"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData, SupabaseRestaurantData } from '@/types';

export const useRestaurant = (restaurantId: string | undefined) => {
  const [data, setData] = useState<PublicRestaurantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setIsLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('restaurants')
          .select(
            `
            *,
            restaurant_gallery (
              id, image_url, caption, order_index
            ),
            menu_categories (
              id, name, order_index, is_active, is_popular,
              menu_items (
                id, name, description, price, image_url, order_index, is_active
              )
            )
            `
          )
          .eq('id', restaurantId)
          .single();

        if (supabaseError) {
          throw supabaseError;
        }

        if (supabaseData) {
          // Cast to SupabaseRestaurantData to ensure correct typing before mapping
          const rawData = supabaseData as SupabaseRestaurantData;

          const formattedData: PublicRestaurantData = {
            ...rawData,
            gallery_images: rawData.restaurant_gallery || [],
            is_favorite: false, // Default value, will be updated by RestaurantProfilePublic
            followers_count: 0, // Default value
            addressSummary: '', // Default value
            logoUrl: null, // Default value
            isOpen: false, // Default value
            statusText: '', // Default value
            nextOpenTime: null, // Default value
          };
          setData(formattedData);
        } else {
          setError(new Error("Restaurant not found."));
        }
      } catch (err) {
        console.error("Error fetching restaurant:", err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId]);

  return { data, isLoading, error };
};