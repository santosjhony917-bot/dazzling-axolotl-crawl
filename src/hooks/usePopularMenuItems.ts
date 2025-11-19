import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PopularMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  restaurantId: string;
  restaurantName: string;
  restaurantCategory: string | null;
}

export const usePopularMenuItems = () => {
  return useQuery<PopularMenuItem[], Error>({
    queryKey: ['popularMenuItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          menu_categories!inner (
            is_popular,
            restaurants!inner (
              id,
              name,
              category
            )
          )
        `)
        .eq('menu_categories.is_popular', true)
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .limit(10); // Limita a 10 itens populares para exibição

      if (error) {
        throw new Error(error.message);
      }

      // Mapeia e achata a estrutura de dados para o formato esperado
      const popularItems: PopularMenuItem[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.image_url,
        restaurantId: item.menu_categories.restaurants.id,
        restaurantName: item.menu_categories.restaurants.name,
        restaurantCategory: item.menu_categories.restaurants.category,
      }));

      return popularItems;
    },
  });
};