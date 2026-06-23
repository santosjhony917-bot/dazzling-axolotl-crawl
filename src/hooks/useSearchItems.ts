import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
export interface SearchItemResult {
  item_id: string;
  item_name: string;
  item_description: string | null;
  item_price: number;
  item_price_type?: string | null;
  item_display_price?: number | null;
  item_price_min?: number | null;
  item_price_max?: number | null;
  item_commercial_type?: string | null;
  item_is_configurable?: boolean | null;
  item_image_url: string | null;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_category: string | null;
  item_category_id: string;
  item_category_name: string;
  restaurant_neighborhood: string | null;
  restaurant_opening_hours: any;
}

interface UseSearchItemsProps {
  searchQuery: string;
  rawSearchQuery?: string;
  enabled: boolean;
  limit: number;
  offset: number;
  excludedCategoryIds?: string[];
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLocalFallbackQueries(rawQuery: string, dbQuery: string) {
  const normalizedRaw = normalizeSearchText(rawQuery);
  const normalizedDb = normalizeSearchText(dbQuery);
  const stopWords = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'sem', 'para', 'por', 'uma', 'um', 'o', 'a', 'os', 'as']);
  const genericWords = new Set([
    'pizza',
    'pizzaria',
    'lanche',
    'comida',
    'cardapio',
    'restaurante',
    'pequena',
    'pequeno',
    'media',
    'medio',
    'grande',
    'familia',
    'familiares',
    'g',
    'm',
    'p',
  ]);

  const rawTokens = normalizedRaw.split(' ').filter(Boolean);
  const meaningfulTokens = rawTokens.filter(token => !stopWords.has(token));
  const flavorTokens = meaningfulTokens.filter(token => !genericWords.has(token));
  const variants = [
    normalizedDb,
    meaningfulTokens.join(' '),
  ];

  if (rawTokens.some(token => token === 'pizza' || token === 'pizzaria') && flavorTokens.length) {
    variants.push(`pizza ${flavorTokens.join(' ')}`);
  }

  variants.push(flavorTokens.join(' '));

  return [...new Set(variants.map(value => value.trim()).filter(value => value.length >= 3))];
}

function prioritizeFallbackQueries(rawQuery: string, queries: string[]) {
  const normalizedRaw = normalizeSearchText(rawQuery);
  const categoryHints = ['pizza', 'hamburguer', 'burger', 'sushi', 'acai', 'açaí', 'sorvete', 'marmita', 'esfiha']
    .map(normalizeSearchText)
    .filter(hint => normalizedRaw.split(' ').includes(hint));

  if (!categoryHints.length) return queries;

  return [...queries].sort((a, b) => {
    const aScore = categoryHints.some(hint => normalizeSearchText(a).split(' ').includes(hint)) ? 0 : 1;
    const bScore = categoryHints.some(hint => normalizeSearchText(b).split(' ').includes(hint)) ? 0 : 1;
    return aScore - bScore;
  });
}

async function getAiFallbackQueries(rawQuery: string, dbQuery: string, existingResultCount: number) {
  const localFallbacks = buildLocalFallbackQueries(rawQuery, dbQuery);

  try {
    const { data, error } = await supabase.functions.invoke('rewrite-search-query-ai', {
      body: {
        rawQuery,
        dbQuery,
        existingResultCount,
        localFallbacks,
      },
    });

    if (error) throw error;

    const aiQueries = Array.isArray(data?.expandedQueries)
      ? data.expandedQueries
          .map((value: unknown) => normalizeSearchText(String(value || '')))
          .filter((value: string) => value.length >= 3)
      : [];

    return prioritizeFallbackQueries(rawQuery, [...new Set([...aiQueries, ...localFallbacks])]);
  } catch (error) {
    console.info('[Search IA] Fallback local usado; IA indisponível ou não implantada.', error);
    return prioritizeFallbackQueries(rawQuery, localFallbacks);
  }
}

export function useSearchItems({
  searchQuery,
  rawSearchQuery,
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
      const { data: deletedRests } = await supabase
        .from('restaurants')
        .select('id')
        .eq('is_deleted', true);
      const deletedIds = new Set(deletedRests?.map(r => r.id) || []);

      const fetchRpc = async (query: string) => {
        return supabase.rpc('search_menu_items', {
          search_query: query,
          p_limit: limit,
          p_offset: offset,
          excluded_category_ids: excludedCategoryIds,
        });
      };

      const { data, error } = await fetchRpc(searchQuery);

      if (error) throw error;

      const originalData = data || [];
      let mergedData = [...originalData];
      const canUseAiFallback =
        offset === 0 &&
        limit > 0 &&
        originalData.length < Math.min(3, limit) &&
        (rawSearchQuery || searchQuery || '').trim().length >= 4;

      if (canUseAiFallback) {
        const seen = new Set(mergedData.map((item: any) => item.item_id));
        const fallbackQueries = await getAiFallbackQueries(rawSearchQuery || searchQuery, searchQuery, originalData.length);

        for (const fallbackQuery of fallbackQueries) {
          if (!fallbackQuery || normalizeSearchText(fallbackQuery) === normalizeSearchText(searchQuery)) continue;
          const { data: fallbackData, error: fallbackError } = await fetchRpc(fallbackQuery);
          if (fallbackError) continue;

          for (const item of fallbackData || []) {
            if (seen.has(item.item_id)) continue;
            seen.add(item.item_id);
            mergedData.push(item);
            if (mergedData.length >= limit) break;
          }

          if (mergedData.length >= limit) break;
        }
      }

      const filtered = mergedData.filter((item: any) => !deletedIds.has(item.restaurant_id)).slice(0, limit);
      setItems(filtered);
      // AQUI ESTÁ A MUDANÇA: hasMore é true se o número de resultados for igual ao limite
      setHasMore(originalData.length === limit);
    } catch (err: any) {
      console.error("Error fetching search items:", err);
      setError(err);
      setHasMore(false); // Em caso de erro, assume que não há mais
    } finally {
      setLoading(false);
    }
  }, [searchQuery, rawSearchQuery, enabled, limit, offset, excludedCategoryIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { items, loading, error, refetch: fetchData, hasMore };
}
