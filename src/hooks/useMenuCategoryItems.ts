import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuItem } from '@/types';

const fetchMenuItems = async (categoryId: string) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

export function useMenuCategoryItems(categoryId: string) {
  const queryKey = ['menuItems', categoryId];

  const itemsQuery = useQuery({
    queryKey,
    queryFn: () => fetchMenuItems(categoryId),
    enabled: !!categoryId,
  });

  return itemsQuery;
}