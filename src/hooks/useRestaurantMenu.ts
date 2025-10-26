import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategoryWithItems } from '@/types/supabase';

interface UseRestaurantMenuResult {
  menu: MenuCategoryWithItems[];
  menuLoading: boolean;
  menuError: string | null;
  fetchMenu: (restaurantId: string) => Promise<void>;
}

export const useRestaurantMenu = (restaurantId: string): UseRestaurantMenuResult => {
  const [menu, setMenu] = useState<MenuCategoryWithItems[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  const fetchMenu = useCallback(async (id: string) => {
    setMenuLoading(true);
    setMenuError(null);

    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select(`
          *,
          menu_items (
            *
          )
        `)
        .eq('restaurant_id', id)
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .order('order_index', { foreignTable: 'menu_items', ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      // O tipo retornado pelo select com join é MenuCategoryWithItems[]
      setMenu(data as MenuCategoryWithItems[]);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setMenuError('Falha ao carregar o cardápio.');
      setMenu([]);
    } finally {
      setMenuLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (restaurantId) {
        fetchMenu(restaurantId);
    }
  }, [restaurantId, fetchMenu]);

  return { menu, menuLoading, menuError, fetchMenu };
};