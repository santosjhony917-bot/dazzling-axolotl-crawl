import { useQuery } from "@tanstack/react-query";
import { fetchPublicCatalogGallery } from '@/integrations/supabase/publicCatalog';

export interface PublicGalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
}

const PUBLIC_GALLERY_QUERY_KEY = (restaurantId: string) => ['publicRestaurantGallery', restaurantId];

const fetchPublicGallery = async (restaurantId: string): Promise<PublicGalleryImage[]> => {
  const rows = await fetchPublicCatalogGallery(restaurantId);
  return rows.map(({ id, image_url, caption, order_index }) => ({
    id,
    image_url,
    caption: caption ?? null,
    order_index: order_index ?? 0,
  }));
};

export function usePublicGallery(restaurantId: string | null) {
  const { data, isLoading, error } = useQuery<PublicGalleryImage[], Error>({
    queryKey: PUBLIC_GALLERY_QUERY_KEY(restaurantId || 'null'),
    queryFn: () => fetchPublicGallery(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 60000,
  });

  return {
    gallery: data || [],
    isLoading,
    error: error ? error.message : null,
  };
}
