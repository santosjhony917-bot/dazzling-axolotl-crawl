import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number;
  is_active: boolean;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  menu_items: MenuItem[];
}

export const useRestaurantMenu = (restaurantId: string | undefined) => {
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    if (!restaurantId) {
      setMenu([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select(`
          id,
          restaurant_id,
          name,
          order_index,
          is_active,
          menu_items (
            id,
            name,
            description,
            price,
            image_url,
            order_index,
            is_active
          )
        `)
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true) // Apenas categorias ativas
        .order('order_index', { ascending: true })
        .order('order_index', { foreignTable: 'menu_items', ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      // Tipagem explícita para o retorno do Supabase antes do mapeamento
      type SupabaseCategory = Omit<MenuCategory, 'menu_items'> & { menu_items: Partial<MenuItem>[] };

      // Filter out inactive items from active categories
      const activeMenu: MenuCategory[] = (data as SupabaseCategory[]).map(category => ({
        ...category,
        menu_items: category.menu_items.filter(item => item.is_active) as MenuItem[],
      })).filter(category => category.menu_items.length > 0); // Only show categories with active items

      setMenu(activeMenu);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao carregar o cardápio.";
      setError(errorMessage);
      showError(errorMessage);
      setMenu([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return { menu, loading, error, refetchMenu: fetchMenu };
};