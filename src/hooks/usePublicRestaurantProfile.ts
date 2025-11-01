"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantPlan } from '@/types/supabase'; // Importando o tipo correto
import { fetchPublicRestaurantById } from '@/integrations/supabase/restaurants';
import { PublicRestaurantData } from '@/types/restaurant';

export function usePublicRestaurantProfile(restaurantId: string) {
  const { data: restaurant, isLoading, error } = useQuery<PublicRestaurantData | null, Error>({
    queryKey: ['publicRestaurant', restaurantId],
    queryFn: () => fetchPublicRestaurantById(restaurantId),
    enabled: !!restaurantId,
  });

  return { restaurant, isLoading, error };
}