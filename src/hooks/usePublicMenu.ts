import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/restaurant';
import { MenuCategory, MenuItem } from '@/types/menu';

interface PublicMenuData {
  restaurant: Restaurant | null;
  categories: (MenuCategory & { items: MenuItem[] })[];
}

interface UsePublicMenuResult {
  menuData: PublicMenuData | null;
  isLoading: boolean;
  error: string | null;
}

export function usePublicMenu(restaurantId: string | undefined): UsePublicMenuResult {
  const [menuData, setMenuData] = useState<PublicMenuData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    if (!restaurantId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Restaurant Profile
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      if (restaurantError || !restaurant) throw new Error('Restaurante não encontrado.');

      // 2. Fetch Categories
      const { data: categoryData, error: categoryError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (categoryError) throw categoryError;

      const categoryIds = categoryData.map(c => c.id);

      // 3. Fetch Items
      const { data: itemData, error: itemError } = await supabase
        .from('menu_items')
        .select('*')
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (itemError) throw itemError;

      // 4. Group items by category
      const groupedItems = itemData.reduce((acc, item) => {
        const categoryId = item.category_id;
        if (!acc[categoryId]) {
          acc[categoryId] = [];
        }
        acc[categoryId].push(item as MenuItem);
        return acc;
      }, {} as Record<string, MenuItem[]>);

      // 5. Combine categories and items
      const combinedData = categoryData.map(category => ({
        ...(category as MenuCategory),
        items: groupedItems[category.id] || [],
      }));

      setMenuData({
        restaurant: restaurant as Restaurant,
        categories: combinedData,
      });

    } catch (err) {
      console.error('Error fetching public menu:', err);
      setError('Falha ao carregar o cardápio público.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return { menuData, isLoading, error };
}