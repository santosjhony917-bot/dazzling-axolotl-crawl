import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SearchItemResult } from '@/lib/types';

interface UseSearchItemsProps {
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
}: UseSearchItemsProps) {
  const [items, setItems] = useState<SearchItemResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true); // Inicializa como true para permitir a primeira carga

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setHasMore(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('search_menu_items', {
        search_query: searchQuery,
        p_limit: limit,
        p_offset: offset,
        excluded_category_ids: excludedCategoryIds,
      });

      if (error) throw error;

      setItems(data || []);
      // AQUI ESTÁ A MUDANÇA: hasMore é true se o número de resultados for igual ao limite
      setHasMore((data?.length || 0) === limit);
    } catch (err: any) {
      console.error("Error fetching search items:", err);
      setError(err);
      setHasMore(false); // Em caso de erro, assume que não há mais
    } finally {
      setLoading(false);
    }
  }, [searchQuery, enabled, limit, offset, excludedCategoryIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { items, loading, error, refetch: fetchData, hasMore };
}