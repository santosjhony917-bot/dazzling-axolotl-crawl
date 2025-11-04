import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MenuCategory } from "@/types/supabase";

export function useMenuCategories() {
  const fetchMenuCategories = async () => {
    const { data, error } = await supabase
      .from("menu_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return data as MenuCategory[];
  };

  const { data, isLoading, error } = useQuery<MenuCategory[], Error>({
    queryKey: ["menuCategories"],
    queryFn: fetchMenuCategories,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    categories: data || [],
    isLoading,
    error: error ? error.message : null,
  };
}