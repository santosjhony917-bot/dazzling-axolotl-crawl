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
      const mockPopularItems: PopularMenuItem[] = [
        {
          id: 'mock-popular-item-1',
          name: 'Filé Mignon ao Molho Madeira',
          description: 'Grelhado na brasa, servido com arroz biro-biro e batatas rústicas.',
          price: 79.90,
          imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300',
          restaurantId: 'mock-premium-restaurant-id',
          restaurantName: 'Sabor Premium Gourmet',
          restaurantCategory: 'Italiana'
        },
        {
          id: 'mock-popular-item-2',
          name: 'Salmão Grelhado com Alcaparras',
          description: 'Acompanha purê de mandioquinha e legumes grelhados no azeite.',
          price: 68.50,
          imageUrl: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300',
          restaurantId: 'mock-premium-restaurant-id',
          restaurantName: 'Sabor Premium Gourmet',
          restaurantCategory: 'Italiana'
        },
        {
          id: 'mock-popular-item-3',
          name: 'Risoto de Funghi Porcini',
          description: 'Arroz arbóreo cremoso com cogumelos funghi porcini e parmesão.',
          price: 72.00,
          imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=300',
          restaurantId: 'mock-premium-restaurant-id',
          restaurantName: 'Sabor Premium Gourmet',
          restaurantCategory: 'Italiana'
        }
      ];

      try {
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
          console.warn("Supabase query for popular items failed, using mock items.", error);
          return mockPopularItems;
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

        return popularItems.length > 0 ? popularItems : mockPopularItems;
      } catch (err) {
        console.warn("Error calling Supabase for popular items, using mock items.", err);
        return mockPopularItems;
      }
    },
  });
};