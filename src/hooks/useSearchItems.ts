import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export interface SearchItemResult {
  item_id: string;
  item_name: string;
  item_description: string | null;
  item_price: number;
  item_image_url: string | null;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_category: string | null;
}

interface UseSearchItemsParams {
  searchQuery: string;
  enabled: boolean;
  limit?: number;
}

export function useSearchItems({
  searchQuery,
  enabled,
  limit = 50,
}: UseSearchItemsParams) {
  const fetchSearchItems = useCallback(async () => {
    // Se searchQuery for uma string vazia, passamos null para a RPC para obter itens padrão
    const queryParam = searchQuery === '' ? null : searchQuery;

    const { data, error } = await supabase.rpc('search_menu_items', {
      search_query: queryParam,
      p_limit: limit,
    });

    if (error) {
      throw new Error(error.message);
    }
    
    return data as SearchItemResult[];
  }, [searchQuery, limit]);

  const { data, isLoading, error, refetch } = useQuery<SearchItemResult[], Error>({
    queryKey: ['searchItems', searchQuery, limit],
    queryFn: fetchSearchItems,
    enabled: enabled, // Permite que a query seja executada mesmo com searchQuery vazia
    staleTime: 60000,
  });

  return {
    items: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  };
}