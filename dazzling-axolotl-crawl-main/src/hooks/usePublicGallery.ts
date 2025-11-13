import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicGalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
}

const PUBLIC_GALLERY_QUERY_KEY = (restaurantId: string) => ['publicRestaurantGallery', restaurantId];

const fetchPublicGallery = async (restaurantId: string): Promise<PublicGalleryImage[]> => {
  const { data, error } = await supabase
    .from('restaurant_gallery')
    .select('id, image_url, caption, order_index')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error("Error fetching public gallery:", error);
    throw new Error(error.message);
  }
  return data as PublicGalleryImage[];
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