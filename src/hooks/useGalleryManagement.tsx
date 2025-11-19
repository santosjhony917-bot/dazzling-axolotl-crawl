import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { logError } from "@/utils/errorLogger";
import { GalleryImage } from '@/types/supabase'; // Importando o tipo correto

// Removida a declaração local de GalleryImage

const GALLERY_QUERY_KEY = (restaurantId: string) => ['restaurantGallery', restaurantId];

const fetchGallery = async (restaurantId: string): Promise<GalleryImage[]> => {
  const { data, error } = await supabase
    .from('restaurant_gallery')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (error) {
    logError(error, { context: 'fetchGallery' });
    throw new Error(error.message);
  }
  return data as GalleryImage[];
};

export function useGalleryManagement(restaurantId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = restaurantId ? GALLERY_QUERY_KEY(restaurantId) : ['restaurantGallery', 'null'];

  const { data: gallery, isLoading, error, refetch } = useQuery<GalleryImage[], Error>({
    queryKey: queryKey,
    queryFn: () => fetchGallery(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 60000,
  });

  const invalidateGallery = () => {
    if (restaurantId) {
      queryClient.invalidateQueries({ queryKey: GALLERY_QUERY_KEY(restaurantId) });
    }
  };

  // Mutação para adicionar uma nova imagem
  const addImageMutation = useMutation({
    mutationFn: async (payload: { restaurantId: string, image_url: string, caption?: string }) => {
      const { error } = await supabase
        .from('restaurant_gallery')
        .insert({
          restaurant_id: payload.restaurantId, // Usando o ID do payload
          image_url: payload.image_url,
          caption: payload.caption || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Foto adicionada à galeria!");
      invalidateGallery();
    },
    onError: (e) => {
      logError(e, { context: 'addImageMutation' });
      showError(`Falha ao adicionar foto: ${(e as Error).message}`);
    },
  });
  
  // Mutação para atualizar legenda (adicionada para uso em GalleryImageCard)
  const updateImageMutation = useMutation({
    mutationFn: async (payload: { imageId: string, updates: Partial<GalleryImage> }) => {
      const { error } = await supabase
        .from('restaurant_gallery')
        .update(payload.updates)
        .eq('id', payload.imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalida a query para refletir a mudança
      invalidateGallery();
    },
    onError: (e) => {
      logError(e, { context: 'updateImageMutation' });
      showError(`Falha ao atualizar imagem: ${(e as Error).message}`);
    },
  });


  // Mutação para remover uma imagem
  const removeImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from('restaurant_gallery')
        .delete()
        .eq('id', imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Foto removida da galeria.");
      invalidateGallery();
    },
    onError: (e) => {
      logError(e, { context: 'removeImageMutation' });
      showError(`Falha ao remover foto: ${(e as Error).message}`);
    },
  });

  return {
    gallery: gallery || [],
    isLoading,
    error: error ? error.message : null,
    refetch,
    addGalleryImage: addImageMutation.mutateAsync,
    deleteGalleryImage: removeImageMutation.mutateAsync,
    updateGalleryImage: updateImageMutation.mutateAsync,
    isAdding: addImageMutation.isPending,
    isRemoving: removeImageMutation.isPending,
    isMutating: addImageMutation.isPending || removeImageMutation.isPending || updateImageMutation.isPending,
  };
}