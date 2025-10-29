import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UsePublicMenuResult, PublicMenuCategory } from '@/types/menu';

const fetchPublicMenu = async (restaurantId: string): Promise<PublicMenuCategory[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select(
      `
        id,
        name,
        menu_items (
          id,
          name,
          description,
          price,
          image_url,
          is_active
        )
      `
    )
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'menu_items', ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Filtrar itens inativos e garantir que o tipo de preço seja number
  const cleanedData: PublicMenuCategory[] = data.map(category => ({
    ...category,
    menu_items: (category.menu_items as any[])
      .filter(item => item.is_active)
      .map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price, // Preço já é number no tipo MenuItem
        image_url: item.image_url,
      })),
  }));

  return cleanedData;
};

export const usePublicMenu = (restaurantId: string): UsePublicMenuResult => {
  const { data, isLoading, error } = useQuery<PublicMenuCategory[], Error>({
    queryKey: ['publicMenu', restaurantId],
    queryFn: () => fetchPublicMenu(restaurantId),
    enabled: !!restaurantId,
  });

  return {
    menu: data || [],
    isLoading,
    error: error || null,
  };
};