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
      // Busca categorias ativas (is_active = true) e itens aninhados.
      // Nota: O filtro de itens aninhados deve ser aplicado na definição da RLS ou em uma View/RPC para ser 100% eficaz.
      // Aqui, confiamos que a RLS pública permite apenas itens ativos, ou filtramos no cliente.
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
        .eq('is_active', true) // Apenas categorias ativas
        .order('order_index', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      const rawData = data as MenuCategoryWithItems[];

      // Filtragem de itens inativos no cliente (fallback, pois o filtro aninhado é complexo via API REST)
      const finalMenu = rawData
        .map(category => {
          const activeItems = (category.items as MenuItem[])
            .filter(item => item.is_active !== false)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            
          return {
            ...category,
            items: activeItems,
          };
        })
        // Remove categorias que ficaram sem itens ativos após a filtragem
        .filter(category => category.items.length > 0);

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