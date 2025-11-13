import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Restaurant } from "@/types/supabase"; // CORRIGIDO: Importando Restaurant de supabase.ts

/**
 * Hook to fetch the restaurant details associated with a specific user ID (owner).
 * @param ownerId The UUID of the user who owns the restaurant.
 */
export function useRestaurantByOwner(ownerId: string | undefined) {
  const fetchRestaurant = async (): Promise<Restaurant | null> => {
    if (!ownerId) {
      return null;
    }

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', ownerId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data as Restaurant | null;
  };

  const { data, isLoading, error, refetch } = useQuery<Restaurant | null, Error>({
    queryKey: ['restaurantByOwner', ownerId],
    queryFn: fetchRestaurant,
    enabled: !!ownerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    restaurant: data,
    isLoading,
    error: error ? error.message : null,
    refetch,
  };
}