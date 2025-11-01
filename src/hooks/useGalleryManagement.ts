"use client";

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GalleryImage } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { logError } from "@/utils/errorLogger";

interface UseGalleryManagementProps {
  restaurantId: string;
}

export function useGalleryManagement({ restaurantId }: UseGalleryManagementProps) {
  const queryClient = useQueryClient();

  const fetchGalleryImages = useCallback(async () => {
    const { data, error } = await supabase
      .from('restaurant_gallery')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true });

    if (error) {
      logError('Error fetching gallery images:', error);
      throw error;
    }
    return data || [];
  }, [restaurantId]);

  const { data: galleryImages = [], isLoading, error, refetch } = useQuery<GalleryImage[], Error>({
    queryKey: ['restaurantGallery', restaurantId],
    queryFn: fetchGalleryImages,
    enabled: !!restaurantId,
  });

  const addImageMutation = useMutation<GalleryImage, Error, { imageUrl: string; caption?: string }>({
    mutationFn: async ({ imageUrl, caption }) => {
      const newOrderIndex = galleryImages.length > 0 ? Math.max(...galleryImages.map(img => img.order_index || 0)) + 1 : 0;
      const { data, error } = await supabase
        .from('restaurant_gallery')
        .insert({ restaurant_id: restaurantId, image_url: imageUrl, caption, order_index: newOrderIndex })
        .select()
        .single();

      if (error) {
        logError('Error adding gallery image:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantGallery', restaurantId] });
      showSuccess('Imagem adicionada à galeria!');
    },
    onError: (err) => {
      showError(`Erro ao adicionar imagem: ${err.message}`);
    },
  });

  const updateImageMutation = useMutation<GalleryImage, Error, { id: string; caption: string }>({
    mutationFn: async ({ id, caption }) => {
      const { data, error } = await supabase
        .from('restaurant_gallery')
        .update({ caption })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logError('Error updating gallery image:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantGallery', restaurantId] });
      showSuccess('Legenda da imagem atualizada!');
    },
    onError: (err) => {
      showError(`Erro ao atualizar legenda: ${err.message}`);
    },
  });

  const deleteImageMutation = useMutation<void, Error, string>({
    mutationFn: async (imageId) => {
      const { error } = await supabase
        .from('restaurant_gallery')
        .delete()
        .eq('id', imageId);

      if (error) {
        logError('Error deleting gallery image:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantGallery', restaurantId] });
      showSuccess('Imagem removida da galeria!');
    },
    onError: (err) => {
      showError(`Erro ao remover imagem: ${err.message}`);
    },
  });

  const reorderImagesMutation = useMutation<void, Error, GalleryImage[], { previousImages: GalleryImage[] | undefined }>({ // Adicionado tipo para o contexto
    mutationFn: async (newOrder) => {
      const updates = newOrder.map((image, index) => ({
        id: image.id,
        order_index: index,
      }));

      const { error } = await supabase
        .from('restaurant_gallery')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        logError('Error reordering gallery images:', error);
        throw error;
      }
    },
    onMutate: async (newOrder) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['restaurantGallery', restaurantId] });

      // Snapshot the previous value
      const previousImages = queryClient.getQueryData<GalleryImage[]>(['restaurantGallery', restaurantId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['restaurantGallery', restaurantId], newOrder);

      return { previousImages };
    },
    onError: (err, newOrder, context) => {
      // Rollback to the previous value if an error occurs
      if (context?.previousImages) {
        queryClient.setQueryData(['restaurantGallery', restaurantId], context.previousImages);
      }
      showError(`Erro ao reordenar imagens: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantGallery', restaurantId] });
    },
  });

  const reorderImages = useCallback(async (newOrder: GalleryImage[]) => {
    await reorderImagesMutation.mutateAsync(newOrder);
  }, [reorderImagesMutation]);

  return {
    galleryImages,
    isLoading,
    error,
    refetch,
    addImage: addImageMutation.mutateAsync,
    updateImage: updateImageMutation.mutateAsync,
    deleteImage: deleteImageMutation.mutateAsync,
    reorderImages,
    isAddingImage: addImageMutation.isPending,
    isUpdatingImage: updateImageMutation.isPending,
    isDeletingImage: deleteImageMutation.isPending,
    isReorderingImages: reorderImagesMutation.isPending,
  };
}