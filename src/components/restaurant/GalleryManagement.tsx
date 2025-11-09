"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Plus, Loader2, AlertTriangle, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableGalleryItem from '@/components/restaurant/gallery/SortableGalleryItem';
import ConfirmationDialog from '@/components/ConfirmationDialog';

interface GalleryManagementProps {
  restaurantId: string;
}

const GalleryManagement: React.FC<GalleryManagementProps> = ({ restaurantId }) => {
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuthData(); // Use user directly from useAuthData

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchGalleryItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('restaurant_gallery')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching gallery items:', error);
      setError('Failed to load gallery images.');
      toast.error('Erro ao carregar imagens da galeria.');
    } else {
      setGalleryItems(data || []);
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchGalleryItems();
  }, [fetchGalleryItems]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.id}/${restaurantId}/gallery/${fileName}`;

    setUploading(true);
    const { error: uploadError } = await supabase.storage
      .from('restaurant_images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      toast.error('Erro ao fazer upload da imagem.');
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('restaurant_images')
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      toast.error('Erro ao obter URL pública da imagem.');
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('restaurant_gallery')
      .insert({
        restaurant_id: restaurantId,
        image_url: publicUrlData.publicUrl,
        order_index: galleryItems.length,
      });

    if (insertError) {
      console.error('Error inserting gallery item:', insertError);
      toast.error('Erro ao adicionar imagem à galeria.');
    } else {
      toast.success('Imagem adicionada à galeria com sucesso!');
      fetchGalleryItems();
    }
    setUploading(false);
  };

  const handleUpdateCaption = async (id: string, caption: string) => {
    const { error } = await supabase
      .from('restaurant_gallery')
      .update({ caption })
      .eq('id', id);

    if (error) {
      console.error('Error updating caption:', error);
      toast.error('Erro ao atualizar legenda.');
    } else {
      setGalleryItems(
        galleryItems.map((item) => (item.id === id ? { ...item, caption } : item))
      );
      toast.success('Legenda atualizada com sucesso!');
    }
  };

  const handleDeleteItem = async (id: string, imageUrl: string) => {
    // Extract file path from public URL
    const urlParts = imageUrl.split('/');
    const filePath = urlParts.slice(urlParts.indexOf('restaurant_images') + 1).join('/');

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('restaurant_images')
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting image from storage:', storageError);
      toast.error('Erro ao deletar imagem do armazenamento.');
      return;
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('restaurant_gallery')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Error deleting gallery item from DB:', dbError);
      toast.error('Erro ao deletar imagem da galeria.');
    } else {
      setGalleryItems(galleryItems.filter((item) => item.id !== id));
      toast.success('Imagem deletada com sucesso!');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = galleryItems.findIndex((item) => item.id === active.id);
      const newIndex = galleryItems.findIndex((item) => item.id === over?.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newGalleryItems = Array.from(galleryItems);
      const [movedItem] = newGalleryItems.splice(oldIndex, 1);
      newGalleryItems.splice(newIndex, 0, movedItem);

      setGalleryItems(newGalleryItems);

      // Update order_index in DB for affected items
      const updates = newGalleryItems.map((item, index) => ({
        id: item.id,
        order_index: index,
      }));

      const { error } = await supabase.from('restaurant_gallery').upsert(updates);

      if (error) {
        console.error('Error updating gallery item order:', error);
        toast.error('Erro ao atualizar a ordem das imagens.');
        // Revert to original order if update fails
        fetchGalleryItems();
      } else {
        toast.success('Ordem das imagens atualizada!');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Label htmlFor="file-upload" className="cursor-pointer">
          <Button asChild>
            <span>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adicionar Imagem
            </span>
          </Button>
        </Label>
        <Input
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {galleryItems.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Nenhuma imagem na galeria ainda.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={galleryItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {galleryItems.map((item) => (
                <SortableGalleryItem
                  key={item.id}
                  item={item}
                  onUpdateCaption={handleUpdateCaption}
                  onDeleteItem={handleDeleteItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default GalleryManagement;