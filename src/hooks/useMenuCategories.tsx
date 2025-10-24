import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory } from '@/types';

interface UseMenuCategoriesResult {
  categories: MenuCategory[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMenuCategories(restaurantId: string): UseMenuCategoriesResult {
  const [categories, setCategories] = useState<MenuCategory[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    
    if (!restaurantId) {
        setError("Restaurant ID is required.");
        setLoading(false);
        return;
    }

    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error("Error fetching menu categories:", error);
      setError(error.message);
      setCategories(null);
    } else {
      setCategories(data as MenuCategory[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, [restaurantId]);

  return { categories, loading, error, refetch: fetchCategories };
}