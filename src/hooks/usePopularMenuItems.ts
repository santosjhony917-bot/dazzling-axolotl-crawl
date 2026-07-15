import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_LABEL, IS_DEMO_MODE } from '@/lib/runtimeMode';
import { isMissingPublicCatalogContract } from '@/integrations/supabase/publicCatalog';

export interface PopularMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  restaurantId: string;
  restaurantName: string;
  restaurantCategory: string | null;
  isDemo: boolean;
}

export const usePopularMenuItems = () => {
  const query = useQuery<PopularMenuItem[], Error>({
    queryKey: ['popularMenuItems', IS_DEMO_MODE ? 'demo' : 'live'],
    queryFn: async () => {
      if (IS_DEMO_MODE) {
        return [
          {
            id: 'demo-popular-item-1',
            name: `${DEMO_LABEL} Prato ilustrativo`,
            description: `${DEMO_LABEL} Item fictício exibido apenas para demonstração.`,
            price: 49.9,
            imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300',
            restaurantId: 'demo-premium-restaurant-id',
            restaurantName: `${DEMO_LABEL} Restaurante Gourmet`,
            restaurantCategory: 'Demonstração',
            isDemo: true,
          },
        ];
      }

      try {
        let response = await supabase.rpc('search_public_catalog', {
          p_queries: [],
          p_limit: 10,
          p_offset: 0,
          p_category: null,
          p_city: null,
          p_state: null,
          p_neighborhood: null,
          p_min_price: null,
          p_max_price: null,
          p_lat: null,
          p_lng: null,
          p_max_distance_km: null,
        });
        if (response.error && isMissingPublicCatalogContract(response.error)) {
          response = await supabase.rpc('search_menu_items', {
            search_query: '',
            p_limit: 10,
            p_offset: 0,
            excluded_category_ids: undefined,
          });
        }
        if (response.error) throw response.error;

        const popularItems: PopularMenuItem[] = (response.data || []).flatMap((item: any) => {
          const price = Number(item.item_price ?? item.item_display_price ?? item.item_price_min);
          if (!item.restaurant_id || !Number.isFinite(price) || price < 0) return [];

          return [{
            id: item.item_id,
            name: item.item_name,
            description: item.item_description,
            price,
            imageUrl: item.item_image_url,
            restaurantId: item.restaurant_id,
            restaurantName: item.restaurant_name,
            restaurantCategory: item.restaurant_category,
            isDemo: false,
          }];
        });

        return popularItems;
      } catch (err) {
        if (err instanceof Error) throw err;
        console.error('Unexpected popular menu items error.', err);
        throw new Error('Não foi possível consultar os pratos populares.');
      }
    },
  });

  return {
    ...query,
    resultState: query.isLoading ? 'loading' as const
      : query.error ? 'error' as const
        : (query.data?.length || 0) === 0 ? 'empty' as const
          : 'ready' as const,
    isDemoMode: IS_DEMO_MODE,
  };
};
