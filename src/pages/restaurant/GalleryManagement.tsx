import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Restaurant, GalleryImage } from '@/types/restaurant'; // Importar GalleryImage
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

interface SortableGalleryImageProps {
  image: GalleryImage;
  onRemove: (id: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
}

const SortableGalleryImage: React.FC<SortableGalleryImageProps> = ({ image, onRemove, onCaptionChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group">
      <Card className="flex flex-col overflow-hidden rounded-lg shadow-soft-sm">
        <img src={image.image_url} alt={image.caption || 'Gallery image'} className="w-full h-32 object-cover" />
        <CardContent className="p-3 flex-grow">
          <Label htmlFor={`caption-${image.id}`} className="sr-only">Legenda</Label>
          <Input
            id={`caption-${image.id}`}
            placeholder="Adicionar legenda (opcional)"
            value={image.caption || ''}
            onChange={(e) => onCaptionChange(image.id, e.target.value)}
            className="text-sm"
          />
        </CardContent>
      </Card>
      <Button
        variant="destructive"
        size="icon"
        onClick={() => onRemove(image.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function GalleryManagement() {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading, refetchProfile } = useAuthData();
  const { updateRestaurant } = useRestaurantProfile(restaurant as Restaurant); // Cast para Restaurant
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (restaurant?.gallery_images) {
      setGalleryImages([...restaurant.gallery_images].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    }
  }, [restaurant?.gallery_images]);

  const handleAddImage = () => {
    if (!newImageUrl.trim()) {
      showError('Por favor, insira uma URL de imagem válida.');
      return;
    }
    if (!restaurant) return;

    const newImage: GalleryImage = {
      id: uuidv4(),
      restaurant_id: restaurant.id,
      image_url: newImageUrl,
      caption: null,
      order_index: galleryImages.length,
      created_at: new Date().toISOString(),
    };
    setGalleryImages(prev => [...prev, newImage]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (id: string) => {
    setGalleryImages(prev => prev.filter(img => img.id !== id));
  };

  const handleCaptionChange = (id: string, caption: string) => {
    setGalleryImages(prev =>
      prev.map(img => (img.id === id ? { ...img, caption } : img))
    );
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setGalleryImages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order_index: index }));
      });
    }
  };

  const arrayMove = (array: any[], from: number, to: number) => {
    const newArray = [...array];
    const [movedItem] = newArray.splice(from, 1);
    newArray.splice(to, 0, movedItem);
    return newArray;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!restaurant) {
      showError('Restaurante não carregado.');
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const filePath = `restaurant_gallery/${restaurant.id}/${uuidv4()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('restaurant_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('restaurant_images')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setNewImageUrl(publicUrlData.publicUrl);
        showSuccess('Imagem carregada com sucesso! Adicione-a à galeria.');
      } else {
        throw new Error('Não foi possível obter a URL pública da imagem.');
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      showError('Falha no upload da imagem: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || isSaving) return;

    setIsSaving(true);
    try {
      // Atualiza os order_index antes de salvar
      const updatedImages = galleryImages.map((img, index) => ({ ...img, order_index: index }));

      // Salva as imagens no banco de dados
      // Primeiro, remove as imagens que não estão mais na lista local
      const currentDbImageIds = restaurant.gallery_images?.map(img => img.id) || [];
      const imagesToRemove = currentDbImageIds.filter(id => !updatedImages.some(img => img.id === id));
      if (imagesToRemove.length > 0) {
        await supabase.from('restaurant_gallery').delete().in('id', imagesToRemove);
      }

      // Insere ou atualiza as imagens restantes
      const { error: upsertError } = await supabase.from('restaurant_gallery').upsert(updatedImages, { onConflict: 'id' });
      if (upsertError) throw upsertError;

      await refetchProfile(); // Atualiza os dados do restaurante no contexto
      showSuccess('Galeria atualizada com sucesso!');
    } catch (error) {
      console.error('Failed to update gallery:', error);
      showError('Falha ao atualizar galeria. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !restaurant) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-highlight" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:max-w-2xl">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Gerenciar Galeria de Fotos</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#022D68]">Adicionar Nova Imagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Upload de Imagem</Label>
              <Input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="file:text-highlight file:font-semibold file:border-0 file:bg-transparent hover:file:bg-gray-100"
              />
              {isUploading && <Loader2 className="h-5 w-5 animate-spin text-highlight mt-2" />}
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-grow">
                <Label htmlFor="newImageUrl">Ou URL da Imagem</Label>
                <Input
                  id="newImageUrl"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
              <Button type="button" onClick={handleAddImage} disabled={!newImageUrl.trim()}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#022D68]">Imagens da Galeria ({galleryImages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {galleryImages.length === 0 ? (
              <p className="text-gray-500">Nenhuma imagem na galeria. Adicione uma acima!</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={galleryImages.map(img => img.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {galleryImages.map((image) => (
                      <SortableGalleryImage
                        key={image.id}
                        image={image}
                        onRemove={handleRemoveImage}
                        onCaptionChange={handleCaptionChange}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar Galeria
        </Button>
      </form>
    </div>
  );
}