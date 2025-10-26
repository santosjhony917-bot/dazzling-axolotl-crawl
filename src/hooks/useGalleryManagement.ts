import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GalleryImage } from '@/types/supabase';

const GALLERY_QUERY_KEY = (restaurantId: string) => ['restaurantGallery', restaurantId];

interface AddImagePayload {
  restaurant_id: string;
  image_url: string;
  caption: string | null;
}

interface UpdateImagePayload {
  caption?: string | null;
  order_index?: number;
}

const fetchGallery = async (restaurantId: string): Promise<GalleryImage[]> => {
  const { data, error } = await supabase
    .from('restaurant_gallery')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as GalleryImage[];
};

export function useGalleryManagement(restaurantId: string | null) {
  const queryClient = useQueryClient();

  const { data: gallery = [], isLoading, error, refetch } = useQuery<GalleryImage[], Error>({
    queryKey: GALLERY_QUERY_KEY(restaurantId || 'temp'),
    queryFn: () => fetchGallery(restaurantId!),
    enabled: !!restaurantId,
  });

  // Mutation for adding image
  const addMutation = useMutation<void, Error, AddImagePayload>({
    mutationFn: async (payload) => {
      const { error } = await supabase
        .from('restaurant_gallery')
        .insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GALLERY_QUERY_KEY(restaurantId!) });
    },
  });

  // Mutation for deleting image
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (imageId) => {
      const { error } = await supabase
        .from('restaurant_gallery')
        .delete()
        .eq('id', imageId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GALLERY_QUERY_KEY(restaurantId!) });
    },
  });

  // Mutation for updating image (e.g., caption)
  const updateMutation = useMutation<void, Error, { imageId: string, updates: UpdateImagePayload }>({
    mutationFn: async ({ imageId, updates }) => {
      const { error } = await supabase
        .from('restaurant_gallery')
        .update(updates)
        .eq('id', imageId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GALLERY_QUERY_KEY(restaurantId!) });
    },
  });

  return {
    gallery,
    isLoading,
    error: error ? error.message : '',
    refetch,
    
    // Renamed functions to match user's desired usage
    addGalleryImage: addMutation.mutateAsync,
    deleteGalleryImage: deleteMutation.mutateAsync,
    updateGalleryImage: (imageId: string, updates: UpdateImagePayload) => updateMutation.mutateAsync({ imageId, updates }),
    
    // Combined mutation status
    isMutating: addMutation.isPending || deleteMutation.isPending || updateMutation.isPending,
  };
}