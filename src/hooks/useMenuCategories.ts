import { useState, useEffect } from 'react';
import { MenuCategory } from '@/types/menu';
import { supabase } from '@/integrations/supabase/client';

interface UseMenuCategoriesResult {
  categories: MenuCategory[];
  isLoading: boolean;
  error: Error | null;
}

export const useMenuCategories = (restaurantId: string | undefined): UseMenuCategoriesResult => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setIsLoading(false);
      return;
    }

    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error("Error fetching menu categories:", error);
        setError(error as unknown as Error);
        setCategories([]);
      } else if (data) {
        setCategories(data as MenuCategory[]);
      }
      setIsLoading(false);
    };

    fetchCategories();
  }, [restaurantId]);

  return { categories, isLoading, error };
};