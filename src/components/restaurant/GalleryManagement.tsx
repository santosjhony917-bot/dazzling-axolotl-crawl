"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useGalleryManagement } from '@/hooks/useGalleryManagement';

interface GalleryImage {
  id: string;
  image_url: string;
  caption?: string;
  order_index: number;
}

interface GalleryManagementProps {
  restaurantId: string;
  initialGalleryImages: GalleryImage[];
  initialCoverImageUrl?: string;
  onGalleryImagesChange: (images: GalleryImage[]) => void;
  onCoverImageChange?: (newUrl: string) => void;
}

const SortableImage: React.FC<{ image: GalleryImage; onDelete: (id: string, url: string) => void }> = ({ image, onDelete }) => {
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group aspect-video w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      <img src={image.image_url} alt={image.caption || 'Imagem da galeria'} className="object-cover w-full h-full" />
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Button
          variant="destructive"
          size="icon"
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag from triggering delete
            onDelete(image.id, image.image_url);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const GalleryManagement: React.FC<GalleryManagementProps> = ({
  restaurantId,
  initialGalleryImages,
  initialCoverImageUrl,
  onGalleryImagesChange,
  onCoverImageChange,
}) => {
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(initialCoverImageUrl);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{ id: string; url: string } | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const {
    gallery,
    isLoading: isGalleryLoading,
    addGalleryImage,
    deleteGalleryImage,
    saveGalleryOrder,
    isAdding: isAddingGalleryImage,
    isRemoving: isRemovingGalleryImage,
    isMutating: isGalleryMutating,
  } = useGalleryManagement(restaurantId);

  const {
    isUploading: isUploadingCover,
    uploadImage: uploadCoverImage,
    deleteImage: deleteCoverImage,
  } = useImageUpload();

  useEffect(() => {
    setCoverImageUrl(initialCoverImageUrl);
  }, [initialCoverImageUrl]);

  useEffect(() => {
    if (!isGalleryLoading) {
      onGalleryImagesChange(gallery);
    }
  }, [gallery, isGalleryLoading, onGalleryImagesChange]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = gallery.findIndex((item) => item.id === active.id);
      const newIndex = gallery.findIndex((item) => item.id === over?.id);
      const newOrder = arrayMove(gallery, oldIndex, newIndex);
      
      // Atualiza order_index para consistência antes de salvar
      const updatedOrderWithIndices = newOrder.map((item, idx) => ({ ...item, order_index: idx }));
      
      // Notifica o pai imediatamente para atualização da UI
      onGalleryImagesChange(updatedOrderWithIndices); 
      
      // Salva a nova ordem no banco de dados
      setIsSavingOrder(true);
      try {
        await saveGalleryOrder(updatedOrderWithIndices.map(img => ({ id: img.id, order_index: img.order_index! })));
      } catch (error) {
        toast({
          title: 'Erro ao salvar ordem das imagens',
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setIsSavingOrder(false);
      }
    }
  }, [gallery, onGalleryImagesChange, saveGalleryOrder, toast]);

  const handleCoverImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadResult = await uploadCoverImage(file, `${restaurantId}/covers`);

    if (uploadResult) {
      const { publicUrl } = uploadResult;
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ cover_image_url: publicUrl })
        .eq('id', restaurantId);

      if (updateError) {
        toast({
          title: 'Erro ao atualizar capa do restaurante',
          description: updateError.message,
          variant: 'destructive',
        });
        // Tenta remover a imagem do storage se a atualização do DB falhar
        await deleteCoverImage(uploadResult.filePath);
        return;
      }

      setCoverImageUrl(publicUrl);
      onCoverImageChange?.(publicUrl);
      toast({
        title: 'Capa atualizada com sucesso!',
        description: 'A imagem de capa do restaurante foi atualizada.',
      });
    }
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = '';
    }
  }, [restaurantId, onCoverImageChange, toast, uploadCoverImage, deleteCoverImage]);

  const handleGalleryImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const uploadResult = await uploadCoverImage(file, `${restaurantId}/gallery`);
      if (uploadResult) {
        await addGalleryImage({ restaurantId, image_url: uploadResult.publicUrl });
      }
    }

    if (galleryFileInputRef.current) {
      galleryFileInputRef.current.value = '';
    }
  }, [restaurantId, addGalleryImage, uploadCoverImage]);

  const handleDeleteImage = useCallback(async () => {
    if (!imageToDelete) return;

    const { id, url } = imageToDelete;
    setIsSavingOrder(true);

    try {
      const filePath = url.split('restaurant-images/')[1];
      const deletedFromStorage = await deleteCoverImage(filePath);

      if (deletedFromStorage) {
        await deleteGalleryImage(id);
      }
    } catch (error) {
      toast({
        title: 'Erro ao deletar imagem',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingOrder(false);
      setIsDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  }, [imageToDelete, deleteGalleryImage, deleteCoverImage, toast]);

  return (
    <div className="space-y-8 p-4">
      {/* Cover Image Section */}
      <section className="border p-4 rounded-lg shadow-sm bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-4">Capa do Restaurante</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Esta é a imagem principal que representa seu restaurante.
        </p>
        <div className="flex flex-col items-center space-y-4">
          {coverImageUrl ? (
            <div className="relative w-full max-w-md h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <img
                src={coverImageUrl}
                alt="Capa do Restaurante"
                className="object-cover w-full h-full"
              />
              {/* No direct delete for cover, just replace */}
            </div>
          ) : (
            <div className="w-full max-w-md h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
              Nenhuma capa selecionada
            </div>
          )}
          <Input
            id="cover-image-upload"
            type="file"
            accept="image/*"
            ref={coverFileInputRef}
            onChange={handleCoverImageUpload}
            className="hidden"
            disabled={isUploadingCover}
          />
          <Button
            onClick={() => coverFileInputRef.current?.click()}
            disabled={isUploadingCover}
            className="w-full max-w-md"
          >
            {isUploadingCover ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fazendo upload...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {coverImageUrl ? 'Alterar Capa' : 'Fazer Upload da Capa'}
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Gallery Images Section */}
      <section className="border p-4 rounded-lg shadow-sm bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-4">Galeria de Imagens</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Adicione e organize as imagens que aparecerão na galeria do seu restaurante.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={gallery.map(img => img.id)}
              strategy={verticalListSortingStrategy}
            >
              {gallery.map((image) => (
                <SortableImage key={image.id} image={image} onDelete={(id, url) => {
                  setImageToDelete({ id, url });
                  setIsDeleteDialogOpen(true);
                }} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex justify-between items-center">
          <Input
            id="gallery-image-upload"
            type="file"
            accept="image/*"
            multiple
            ref={galleryFileInputRef}
            onChange={handleGalleryImageUpload}
            className="hidden"
            disabled={isAddingGalleryImage || isUploadingCover}
          />
          <Button
            onClick={() => galleryFileInputRef.current?.click()}
            disabled={isAddingGalleryImage || isUploadingCover}
          >
            {isAddingGalleryImage || isUploadingCover ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fazendo upload...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Imagens
              </>
            )}
          </Button>
          <Button
            onClick={() => { /* handleSaveOrder agora é automático no dragEnd */ }}
            disabled={isSavingOrder || gallery.length === 0}
          >
            {isSavingOrder ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando ordem...
              </>
            ) : (
              'Ordem Salva Automaticamente'
            )}
          </Button>
        </div>
      </section>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja excluir esta imagem da galeria? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteImage} disabled={isRemovingGalleryImage || isSavingOrder}>
              {isRemovingGalleryImage || isSavingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryManagement;