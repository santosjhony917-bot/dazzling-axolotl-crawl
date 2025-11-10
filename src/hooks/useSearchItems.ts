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
  item_category_id: string;
  item_category_name: string;
}

interface UseSearchItemsParams {
  searchQuery: string;
  enabled: boolean;
  limit: number;
  offset: number;
  excludedCategoryIds?: string[];
}

export function useSearchItems({
  searchQuery,
  enabled,
  limit,
  offset,
  excludedCategoryIds,
}: UseSearchItemsParams) {
  const fetchSearchItems = useCallback(async () => {
    // Se searchQuery for uma string vazia, passamos null para a RPC para obter itens padrão
    const queryParam = searchQuery === '' ? null : searchQuery;

    const { data, error } = await supabase.rpc('search_menu_items', {
      search_query: queryParam,
      p_limit: limit,
      p_offset: offset,
      excluded_category_ids: excludedCategoryIds,
    });

    if (error) {
      throw new Error(error.message);
    }
    
    return data as SearchItemResult[];
  }, [searchQuery, limit, offset, excludedCategoryIds]);

  const { data, isLoading, error, refetch } = useQuery<SearchItemResult[], Error>({
    queryKey: ['searchItems', searchQuery, limit, offset, excludedCategoryIds],
    queryFn: fetchSearchItems,
    enabled: enabled,
    staleTime: 60000,
  });

  // Determine if there might be more items based on the fetched data length
  const hasMore = (data?.length || 0) === limit;

  return {
    items: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
    hasMore,
  };
}