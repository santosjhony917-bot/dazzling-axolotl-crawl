import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UsePublicMenuResult, PublicMenuCategory, MenuCategory, PublicMenuItem } from '@/types/menu';
import { MenuItem } from '@/types/supabase'; // Importando MenuItem completo para tipagem interna

// Define o tipo da resposta bruta do Supabase para a query aninhada
type RawMenuCategoryResponse = MenuCategory & {
  menu_items: Array<Partial<MenuItem>>;
};

const fetchPublicMenu = async (restaurantId: string): Promise<PublicMenuCategory[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select(
      `
        *,
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

  // Cast data to the raw response type
  const rawData = data as RawMenuCategoryResponse[];

  // Filtrar itens inativos e garantir que o tipo de preço seja number
  const cleanedData: PublicMenuCategory[] = rawData.map(category => ({
    ...category,
    menu_items: category.menu_items
      .filter(item => item.is_active)
      .map(item => ({
        id: item.id!,
        name: item.name!,
        description: item.description || null,
        price: item.price!,
        image_url: item.image_url || null,
      }) as PublicMenuItem), // Cast interno para PublicMenuItem
  })) as PublicMenuCategory[];

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