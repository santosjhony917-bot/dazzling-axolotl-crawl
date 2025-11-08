import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MenuCategory } from "@/types/supabase";

export function useMenuCategories(restaurantId?: string) {
  const fetchMenuCategories = async () => {
    let query = supabase
      .from("menu_categories")
      .select("*, menu_items(*, menu_item_favorites(user_id))")
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }
    return data as MenuCategory[];
  };

  const { data, isLoading, error } = useQuery<MenuCategory[], Error>({
    queryKey: ["menuCategories", restaurantId || "all"],
    queryFn: fetchMenuCategories,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    data: data || [],
    isLoading,
    error: error ? error.message : null,
  };
}