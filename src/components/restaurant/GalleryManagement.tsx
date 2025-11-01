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
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(initialGalleryImages);
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(initialCoverImageUrl);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{ id: string; url: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setGalleryImages(initialGalleryImages);
  }, [initialGalleryImages]);

  useEffect(() => {
    setCoverImageUrl(initialCoverImageUrl);
  }, [initialCoverImageUrl]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setGalleryImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        // Update order_index property for consistency before saving
        const updatedOrderWithIndices = newOrder.map((item, idx) => ({ ...item, order_index: idx }));
        onGalleryImagesChange(updatedOrderWithIndices); // Notify parent immediately for UI update
        return updatedOrderWithIndices;
      });
    }
  }, [onGalleryImagesChange]);

  const handleCoverImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${restaurantId}/covers/${fileName}`;

    const { data, error } = await supabase.storage
      .from('restaurant-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      toast({
        title: 'Erro ao fazer upload da capa',
        description: error.message,
        variant: 'destructive',
      });
      setIsUploadingCover(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      toast({
        title: 'Erro ao obter URL da capa',
        description: 'Não foi possível obter a URL pública da imagem.',
        variant: 'destructive',
      });
      setIsUploadingCover(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ cover_image_url: publicUrlData.publicUrl })
      .eq('id', restaurantId);

    if (updateError) {
      toast({
        title: 'Erro ao atualizar capa do restaurante',
        description: updateError.message,
        variant: 'destructive',
      });
      await supabase.storage.from('restaurant-images').remove([filePath]);
      setIsUploadingCover(false);
      return;
    }

    setCoverImageUrl(publicUrlData.publicUrl);
    onCoverImageChange?.(publicUrlData.publicUrl);
    toast({
      title: 'Capa atualizada com sucesso!',
      description: 'A imagem de capa do restaurante foi atualizada.',
    });
    setIsUploadingCover(false);
  }, [restaurantId, onCoverImageChange, toast]);

  const handleGalleryImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploadingGallery(true);
    const uploadedUrls: Omit<GalleryImage, 'id'>[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${restaurantId}/gallery/${fileName}`;

      const { data, error } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        toast({
          title: 'Erro ao fazer upload da imagem da galeria',
          description: error.message,
          variant: 'destructive',
        });
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        uploadedUrls.push({
          image_url: publicUrlData.publicUrl,
          order_index: galleryImages.length + uploadedUrls.length,
        });
      } else {
        toast({
          title: 'Erro ao obter URL da imagem da galeria',
          description: 'Não foi possível obter a URL pública da imagem.',
          variant: 'destructive',
        });
      }
    }

    if (uploadedUrls.length > 0) {
      const { data: insertedImages, error: insertError } = await supabase
        .from('restaurant_gallery')
        .insert(uploadedUrls.map(img => ({
          restaurant_id: restaurantId,
          image_url: img.image_url,
          order_index: img.order_index,
        })))
        .select();

      if (insertError) {
        toast({
          title: 'Erro ao salvar imagens da galeria',
          description: insertError.message,
          variant: 'destructive',
        });
        await supabase.storage.from('restaurant-images').remove(uploadedUrls.map(u => u.image_url.split('/').pop()!));
      } else {
        const newGallery = [...galleryImages, ...insertedImages];
        setGalleryImages(newGallery);
        onGalleryImagesChange(newGallery);
        toast({
          title: 'Imagens da galeria adicionadas!',
          description: `${uploadedUrls.length} imagem(ns) adicionada(s) à galeria.`,
        });
      }
    }

    setIsUploadingGallery(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [restaurantId, galleryImages, onGalleryImagesChange, toast]);

  const handleDeleteImage = useCallback(async () => {
    if (!imageToDelete) return;

    const { id, url } = imageToDelete;
    setIsSavingOrder(true);

    const filePath = url.split('restaurant-images/')[1];
    const { error: storageError } = await supabase.storage
      .from('restaurant-images')
      .remove([filePath]);

    if (storageError) {
      toast({
        title: 'Erro ao deletar imagem do armazenamento',
        description: storageError.message,
        variant: 'destructive',
      });
      setIsSavingOrder(false);
      return;
    }

    const { error: dbError } = await supabase
      .from('restaurant_gallery')
      .delete()
      .eq('id', id);

    if (dbError) {
      toast({
        title: 'Erro ao deletar imagem do banco de dados',
        description: dbError.message,
        variant: 'destructive',
      });
      setIsSavingOrder(false);
      return;
    }

    const updatedImages = galleryImages.filter(img => img.id !== id);
    setGalleryImages(updatedImages);
    onGalleryImagesChange(updatedImages);
    toast({
      title: 'Imagem deletada com sucesso!',
      description: 'A imagem foi removida da galeria.',
    });

    setIsSavingOrder(false);
    setIsDeleteDialogOpen(false);
    setImageToDelete(null);
  }, [imageToDelete, galleryImages, onGalleryImagesChange, toast]);

  const handleSaveOrder = useCallback(async () => {
    setIsSavingOrder(true);
    const updates = galleryImages.map((img, index) => ({
      id: img.id,
      order_index: index,
    }));

    const { error } = await supabase
      .from('restaurant_gallery')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      toast({
        title: 'Erro ao salvar ordem das imagens',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Ordem das imagens salva!',
        description: 'A nova ordem da galeria foi salva com sucesso.',
      });
    }
    setIsSavingOrder(false);
  }, [galleryImages, toast]);

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
              items={galleryImages.map(img => img.id)}
              strategy={verticalListSortingStrategy}
            >
              {galleryImages.map((image) => (
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
            ref={fileInputRef}
            onChange={handleGalleryImageUpload}
            className="hidden"
            disabled={isUploadingGallery}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingGallery}
          >
            {isUploadingGallery ? (
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
            onClick={handleSaveOrder}
            disabled={isSavingOrder || galleryImages.length === 0}
          >
            {isSavingOrder ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando ordem...
              </>
            ) : (
              'Salvar Ordem'
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
            <Button variant="destructive" onClick={handleDeleteImage} disabled={isSavingOrder}>
              {isSavingOrder ? (
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