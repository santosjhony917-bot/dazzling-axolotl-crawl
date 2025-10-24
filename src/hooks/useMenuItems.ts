import { useState, useEffect } from 'react';
import { MenuItem } from '@/types/menu';
import { supabase } from '@/integrations/supabase/client';

interface UseMenuItemsResult {
  items: MenuItem[];
  isLoading: boolean;
  error: Error | null;
}

export const useMenuItems = (categoryIds: string[]): UseMenuItemsResult => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (categoryIds.length === 0) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const fetchItems = async () => {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error("Error fetching menu items:", error);
        setError(error as unknown as Error);
        setItems([]);
      } else if (data) {
        setItems(data as MenuItem[]);
      }
      setIsLoading(false);
    };

    fetchItems();
  }, [categoryIds]);

  return { items, isLoading, error };
};