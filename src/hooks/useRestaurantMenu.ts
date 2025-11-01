"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategoryWithItems } from '@/types/supabase'; // Importando o tipo correto
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showError } from '@/utils/toast';

export function useRestaurantMenu(restaurantId: string) {
  const queryClient = useQueryClient();

  const fetchMenu = useCallback(async () => {
    const { data, error } = await supabase
      .from('menu_categories')
      .select(`
        *,
        menu_items (
          *
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true })
      .order('order_index', { foreignTable: 'menu_items', ascending: true });

    if (error) {
      showError('Erro ao carregar o menu do restaurante.');
      throw error;
    }

    return data as MenuCategoryWithItems[];
  }, [restaurantId]);

  const { data: menuCategories = [], isLoading, error, refetch } = useQuery<MenuCategoryWithItems[], Error>({
    queryKey: ['restaurantMenu', restaurantId],
    queryFn: fetchMenu,
    enabled: !!restaurantId,
  });

  return { menuCategories, isLoading, error, refetch };
}