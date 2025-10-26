import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategoryWithItems, MenuItem } from '@/types/supabase';

interface UseRestaurantMenuResult {
  menu: MenuCategoryWithItems[];
  menuLoading: boolean;
  menuError: string | null;
  fetchMenu: (restaurantId: string) => Promise<void>;
}

export const useRestaurantMenu = (restaurantId: string | null): UseRestaurantMenuResult => {
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
          id,
          restaurant_id,
          name,
          order_index,
          is_active,
          created_at,
          items:menu_items (
            *
          )
        `)
        .eq('restaurant_id', id)
        // Filtra categorias ativas (ou nulas, tratando null como ativo)
        .or('is_active.eq.true,is_active.is.null') 
        .order('order_index', { ascending: true })
        .order('order_index', { foreignTable: 'items', ascending: true }); // Usando o alias 'items'

      if (error) {
        throw new Error(error.message);
      }

      // 1. Cast para o tipo correto (agora que usamos o alias 'items')
      const rawData = data as MenuCategoryWithItems[];

      // 2. Filtragem de itens inativos no cliente
      const filteredData = rawData.map(category => {
        // Garantindo que category.items seja tratado como MenuItem[]
        const activeItems = (category.items as MenuItem[]).filter(item => item.is_active !== false);
        return {
          ...category,
          items: activeItems,
        };
      });
      
      // 3. Filtragem de categorias sem itens ativos (se a categoria estiver ativa)
      const finalMenu = filteredData.filter(category => {
        const isCategoryActive = category.is_active !== false;
        return isCategoryActive && category.items.length > 0;
      });

      setMenu(finalMenu);
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