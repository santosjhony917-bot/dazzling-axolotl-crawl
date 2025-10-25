import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/restaurant';
import { MenuCategory, MenuItem } from '@/types/menu';

interface PublicProfileData {
  restaurant: Restaurant | null;
  categories: (MenuCategory & { items: MenuItem[] })[];
}

interface UsePublicProfileResult {
  data: PublicProfileData | null;
  isLoading: boolean;
  error: string | null;
}

export function usePublicRestaurantProfile(restaurantId: string | undefined): UsePublicProfileResult {
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!restaurantId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Restaurant Profile - Using maybeSingle() to return null if not found
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle(); // <-- CORREÇÃO APLICADA

      if (restaurantError) {
        console.error('[PublicProfile] Supabase Error fetching restaurant:', restaurantError);
        throw new Error(restaurantError.message);
      }

      if (!restaurant) {
        setError('Restaurante não encontrado.');
        setData(null);
        return;
      }

      // 2. Fetch Categories (only active ones for public view)
      const { data: categoryData, error: categoryError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (categoryError) {
        console.error('[PublicProfile] Supabase Error fetching categories:', categoryError);
        throw new Error(categoryError.message);
      }

      const categoryIds = categoryData.map(c => c.id);

      // 3. Fetch Items (only active ones for public view)
      const { data: itemData, error: itemError } = await supabase
        .from('menu_items')
        .select('*')
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (itemError) {
        console.error('[PublicProfile] Supabase Error fetching items:', itemError);
        throw new Error(itemError.message);
      }

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

      setData({
        restaurant: restaurant as Restaurant,
        categories: combinedData,
      });

    } catch (err) {
      const errorMessage = (err as Error).message || 'Falha ao carregar o perfil público.';
      console.error('[PublicProfile] Final Catch Error:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error };
}