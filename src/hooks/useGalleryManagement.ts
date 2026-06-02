import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { logError } from "@/utils/errorLogger";
import { GalleryImage } from '@/types/supabase'; // Importando o tipo correto

// Removida a declaração local de GalleryImage

const GALLERY_QUERY_KEY = (restaurantId: string) => ['restaurantGallery', restaurantId];

const saveMockGallery = (restaurantId: string, gallery: GalleryImage[]) => {
  try {
    const saved = localStorage.getItem('mockSession');
    if (saved) {
      const session = JSON.parse(saved);
      if (session.restaurant && session.restaurant.id === restaurantId) {
        session.restaurant.gallery_images = gallery;
        localStorage.setItem('mockSession', JSON.stringify(session));
        window.dispatchEvent(new Event('mockSessionUpdated'));
      }
    }
  } catch (e) {
    console.error('Erro ao salvar galeria mockada:', e);
  }
};

const fetchGallery = async (restaurantId: string): Promise<GalleryImage[]> => {
  if (restaurantId && restaurantId.startsWith('mock-')) {
    try {
      const saved = localStorage.getItem('mockSession');
      if (saved) {
        const session = JSON.parse(saved);
        if (session.restaurant && session.restaurant.id === restaurantId) {
          if (session.restaurant.gallery_images) {
            return session.restaurant.gallery_images;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao ler mockSession em fetchGallery:', e);
    }
    
    return [
      { id: 'g1', restaurant_id: restaurantId, image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', caption: 'Pratos especiais', order_index: 0, created_at: new Date().toISOString() },
      { id: 'g2', restaurant_id: restaurantId, image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600', caption: 'Nosso ambiente', order_index: 1, created_at: new Date().toISOString() },
      { id: 'g3', restaurant_id: restaurantId, image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600', caption: 'Pizzas artesanais', order_index: 2, created_at: new Date().toISOString() }
    ] as unknown as GalleryImage[];
  }

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
      const currentGallery = queryClient.getQueryData(queryKey) as GalleryImage[] || [];
      
      if (payload.restaurantId.startsWith('mock-')) {
        const maxOrder = currentGallery.reduce((max, item) => Math.max(max, item.order_index || 0), 0);
        const newOrderIndex = maxOrder + 1;
        const newImage = {
          id: `g-mock-${Date.now()}`,
          restaurant_id: payload.restaurantId,
          image_url: payload.image_url,
          caption: payload.caption || null,
          order_index: newOrderIndex,
          created_at: new Date().toISOString()
        } as unknown as GalleryImage;
        const updatedGallery = [...currentGallery, newImage];
        saveMockGallery(payload.restaurantId, updatedGallery);
        
        // Atualiza a query cache diretamente para atualização instantânea
        queryClient.setQueryData(queryKey, updatedGallery);
        return;
      }

      const maxOrder = currentGallery.reduce((max, item) => Math.max(max, item.order_index || 0), 0);
      const newOrderIndex = maxOrder + 1;
      
      const { error } = await supabase
        .from('restaurant_gallery')
        .insert({
          restaurant_id: payload.restaurantId,
          image_url: payload.image_url,
          caption: payload.caption || null,
          order_index: newOrderIndex,
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
  
  // Mutação para atualizar legenda e ordem
  const updateImageMutation = useMutation({
    mutationFn: async (payload: { imageId: string, updates: Partial<GalleryImage> }) => {
      if (payload.imageId.startsWith('g-mock-') || payload.imageId.startsWith('g1') || payload.imageId.startsWith('g2') || payload.imageId.startsWith('g3')) {
        const currentGallery = queryClient.getQueryData(queryKey) as GalleryImage[] || [];
        const updatedGallery = currentGallery.map(img => 
          img.id === payload.imageId ? { ...img, ...payload.updates } : img
        );
        if (restaurantId) {
          saveMockGallery(restaurantId, updatedGallery);
          queryClient.setQueryData(queryKey, updatedGallery);
        }
        return;
      }

      const { error } = await supabase
        .from('restaurant_gallery')
        .update(payload.updates)
        .eq('id', payload.imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
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
      if (imageId.startsWith('g-mock-') || imageId.startsWith('g1') || imageId.startsWith('g2') || imageId.startsWith('g3')) {
        const currentGallery = queryClient.getQueryData(queryKey) as GalleryImage[] || [];
        const updatedGallery = currentGallery.filter(img => img.id !== imageId);
        if (restaurantId) {
          saveMockGallery(restaurantId, updatedGallery);
          queryClient.setQueryData(queryKey, updatedGallery);
        }
        return;
      }

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
  
  // Mutação para salvar a ordem completa
  const saveOrderMutation = useMutation({
    mutationFn: async (updates: { id: string, order_index: number }[]) => {
      if (restaurantId && restaurantId.startsWith('mock-')) {
        const currentGallery = queryClient.getQueryData(queryKey) as GalleryImage[] || [];
        const updatedGallery = currentGallery.map(img => {
          const update = updates.find(u => u.id === img.id);
          return update ? { ...img, order_index: update.order_index } : img;
        }).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        saveMockGallery(restaurantId, updatedGallery);
        queryClient.setQueryData(queryKey, updatedGallery);
        return;
      }

      const { error } = await supabase
        .from('restaurant_gallery')
        .upsert(updates, { onConflict: 'id' });
        
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Ordem da galeria salva!");
      invalidateGallery();
    },
    onError: (e) => {
      logError(e, { context: 'saveOrderMutation' });
      showError(`Falha ao salvar a ordem: ${(e as Error).message}`);
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
    saveGalleryOrder: saveOrderMutation.mutateAsync,
    isAdding: addImageMutation.isPending,
    isRemoving: removeImageMutation.isPending,
    isMutating: addImageMutation.isPending || removeImageMutation.isPending || updateImageMutation.isPending || saveOrderMutation.isPending,
  };
}