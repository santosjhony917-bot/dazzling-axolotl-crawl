import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { Image, Plus, Loader2, AlertTriangle, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { showError, showSuccess } from '@/utils/toast';
import { useGalleryManagement } from '@/hooks/useGalleryManagement';
import GalleryImageCard from '@/components/restaurant/GalleryImageCard';
import CoverImageUploader from '@/components/restaurant/CoverImageUploader';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { GalleryImage as SupabaseGalleryImage } from '@/types/supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Componente Auxiliar para DND ---

interface SortableItemWrapperProps {
  image: SupabaseGalleryImage;
  onDelete: (id: string) => Promise<void>;
  onUpdateCaption: (id: string, newCaption: string) => Promise<void>;
  isMutating: boolean;
}

const SortableItemWrapper: React.FC<SortableItemWrapperProps> = ({ image, onDelete, onUpdateCaption, isMutating }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <GalleryImageCard
      image={image}
      onDelete={onDelete}
      onUpdateCaption={onUpdateCaption}
      isDeleting={isMutating}
      isUpdating={isMutating}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      style={style}
    />
  );
};


// --- Componente Principal --- 

export default function GalleryManagement() {
  const { restaurant, isLoading: authLoading, refetchProfile } = useAuthData();
  const { updateRestaurant } = useRestaurantProfile(restaurant?.id);
  const navigate = useNavigate();

  const restaurantId = restaurant?.id || '';
  
  // Gerenciamento da Galeria (Imagens internas)
  const { 
    gallery, 
    isLoading: isGalleryLoading, 
    error: galleryError, 
    addGalleryImage, 
    deleteGalleryImage, 
    updateGalleryImage,
    saveGalleryOrder, // NOVO: Mutação para salvar a ordem
    isMutating,
    refetch: refetchGallery
  } = useGalleryManagement(restaurantId);

  const [localGallery, setLocalGallery] = useState<SupabaseGalleryImage[]>(gallery);
  
  // Sincroniza o estado local com o estado da query
  useEffect(() => {
    setLocalGallery(gallery);
  }, [gallery]);

  const isLoading = authLoading || isGalleryLoading;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Handlers de Imagem de Capa ---
  const handleCoverUploadComplete = useCallback(async (url: string) => {
    const cacheBustedUrl = url.startsWith('data:') ? url : `${url}?t=${Date.now()}`;
    const { error } = await updateRestaurant({ cover_image_url: cacheBustedUrl });
    if (error) {
      showError(error);
    } else {
      showSuccess("Capa atualizada com sucesso!");
      refetchProfile(); // Força a atualização do contexto
    }
  }, [updateRestaurant, refetchProfile]);

  // --- Handlers de Imagem da Galeria ---
  const handleGalleryImageUploadComplete = useCallback(async (url: string) => {
    if (!restaurantId) return;
    
    try {
      // O hook useGalleryManagement agora calcula o order_index
      await addGalleryImage({ restaurantId, image_url: url, caption: '' });
      // O refetch é disparado pelo hook, o useEffect sincronizará o localGallery
    } catch (e) {
      // Erro tratado no hook
    }
  }, [restaurantId, addGalleryImage]);
  
  const handleUpdateCaption = useCallback(async (imageId: string, newCaption: string) => {
    await updateGalleryImage({ imageId, updates: { caption: newCaption } });
  }, [updateGalleryImage]);
  
  const handleDeleteImage = useCallback(async (imageId: string) => {
    await deleteGalleryImage(imageId);
  }, [deleteGalleryImage]);

  // --- DND Handler ---
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setLocalGallery((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);
  
  // --- Salvar Ordem ---
  const handleSaveOrder = useCallback(async () => {
    const updates = localGallery.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));
    
    await saveGalleryOrder(updates);
  }, [localGallery, saveGalleryOrder]);

  if (isLoading) {
    return (
      <RestaurantAreaPageLayout title="Gerenciamento de Imagens" icon={Image} backPath="restaurant-area/profile-menu">
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-soft">
          <Loader2 className="h-8 w-8 animate-spin text-[#df4b1c]" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }
  
  if (galleryError) {
    return (
      <RestaurantAreaPageLayout title="Gerenciamento de Imagens" icon={Image} backPath="restaurant-area/profile-menu">
        <div className="rounded-2xl border border-red-100 bg-white p-6 text-red-500 shadow-soft">
          <AlertTriangle className="h-6 w-6 inline mr-2" /> Erro ao carregar galeria: {galleryError}
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout 
      title="Gerenciamento de Imagens" 
      icon={Image} 
      backPath="restaurant-area/profile-menu"
    >
      <div className="space-y-8 max-w-4xl mx-auto">
        
        {/* 1. Uploader de Imagem de Capa */}
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl text-[#3C2F2F]">Imagem de Capa</CardTitle>
          </CardHeader>
          <CardContent>
            <CoverImageUploader
              restaurantId={restaurantId}
              coverImageUrl={restaurant?.cover_image_url}
              onUploadComplete={handleCoverUploadComplete}
            />
            <p className="text-sm text-slate-500 mt-4">
              Esta imagem aparece no topo do seu perfil público.
            </p>
          </CardContent>
        </Card>
        
        {/* 2. Gerenciamento da Galeria */}
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl text-[#3C2F2F]">Galeria de Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">
              Arraste e solte as imagens para reordenar. A primeira imagem será usada como destaque.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-6">
              <div className="flex items-center gap-3">
                <ImageUploadButton
                  onUploadComplete={handleGalleryImageUploadComplete}
                  bucketName={RESTAURANT_IMAGES_BUCKET}
                  folderPath={`${restaurantId}/gallery`}
                  className="bg-[#df4b1c] text-white hover:bg-[#bd3f17] h-10 w-10 p-0 rounded-2xl shrink-0 relative"
                  icon={<Plus className="h-5 w-5" />}
                  disabled={isMutating}
                />
                <span className="text-sm font-bold text-[#3C2F2F]">
                  {isMutating ? "Processando..." : "Adicionar Imagem"}
                </span>
              </div>
              
              <Button 
                onClick={handleSaveOrder}
                disabled={isMutating || localGallery.length === 0}
                className="bg-[#df4b1c] hover:bg-[#bd3f17] text-white rounded-2xl font-bold h-10 w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Ordem
              </Button>
            </div>

            {/* Lista de Imagens da Galeria com DND */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localGallery.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {localGallery.map((image) => (
                    <SortableItemWrapper 
                      key={image.id} 
                      image={image} 
                      onDelete={handleDeleteImage} 
                      onUpdateCaption={handleUpdateCaption}
                      isMutating={isMutating}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            {localGallery.length === 0 && !isLoading && (
              <p className="text-center text-slate-500 mt-8">Nenhuma imagem na galeria ainda. Adicione a primeira!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </RestaurantAreaPageLayout>
  );
}
