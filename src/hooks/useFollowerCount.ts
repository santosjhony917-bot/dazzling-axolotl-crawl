import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FOLLOWER_COUNT_QUERY_KEY = (restaurantId: string) => ['followerCount', restaurantId];

const fetchFollowerCount = async (restaurantId: string): Promise<number> => {
  const { data, error } = await supabase.rpc('count_restaurant_followers', {
    p_restaurant_id: restaurantId,
  });

  if (error) {
    console.error("Error fetching follower count:", error);
    throw new Error(error.message);
  }
  
  // The RPC returns a single integer
  return data as number;
};

export function useFollowerCount(restaurantId: string | null) {
  const { data, isLoading, error, refetch } = useQuery<number, Error>({
    queryKey: FOLLOWER_COUNT_QUERY_KEY(restaurantId || 'null'),
    queryFn: () => fetchFollowerCount(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    followerCount: data ?? 0,
    isLoading,
    error: error ? error.message : null,
    refetch,
  };
}