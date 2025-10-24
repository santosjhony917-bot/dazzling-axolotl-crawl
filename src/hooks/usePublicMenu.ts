import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, MenuItem } from '@/types';

interface PublicMenuData {
  categories: (MenuCategory & { items: MenuItem[] })[];
}

const fetchPublicMenu = async (restaurantId: string): Promise<PublicMenuData> => {
  // 1. Buscar categorias ativas
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true) // Filtra apenas categorias ativas
    .order('order_index', { ascending: true });

  if (categoriesError) throw categoriesError;

  const categoryIds = categoriesData.map(c => c.id);

  if (categoryIds.length === 0) {
    return { categories: [] };
  }

  // 2. Buscar itens ativos pertencentes a essas categorias
  const { data: itemsData, error: itemsError } = await supabase
    .from('menu_items')
    .select('*')
    .in('category_id', categoryIds)
    .eq('is_active', true) // Filtra apenas itens ativos
    .order('order_index', { ascending: true });

  if (itemsError) throw itemsError;

  // 3. Agrupar itens por categoria
  const categoriesWithItems = categoriesData.map(category => ({
    ...category,
    items: itemsData.filter(item => item.category_id === category.id),
  }));

  return { categories: categoriesWithItems };
};

export const usePublicMenu = (restaurantId: string) => {
  return useQuery<PublicMenuData, Error>({
    queryKey: ['publicMenu', restaurantId],
    queryFn: () => fetchPublicMenu(restaurantId),
    enabled: !!restaurantId,
  });
};