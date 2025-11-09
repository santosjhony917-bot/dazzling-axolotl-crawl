"use client";

import React, { useState, useEffect } from 'react';
import { Image, Plus, Trash2, Loader2, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
}

const GalleryManagement: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<GalleryImage | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchGalleryImages();
  }, [restaurantId]);

  const fetchGalleryImages = async () => {
    if (!restaurantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('restaurant_gallery')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching gallery images:', error.message);
      toast.error('Erro ao carregar imagens da galeria.');
    } else {
      setGalleryImages(data as GalleryImage[]);
    }
    setLoading(false);
  };

  const handleAddImage = () => {
    setCurrentImage(null);
    setImageUrl('');
    setCaption('');
    setIsImageDialogOpen(true);
  };

  const handleEditImage = (image: GalleryImage) => {
    setCurrentImage(image);
    setImageUrl(image.image_url);
    setCaption(image.caption || '');
    setIsImageDialogOpen(true);
  };

  const handleSaveImage = async () => {
    if (!restaurantId || !imageUrl.trim()) {
      toast.error('A URL da imagem não pode ser vazia.');
      return;
    }

    setIsSaving(true);
    if (currentImage) {
      // Update image
      const { error } = await supabase
        .from('restaurant_gallery')
        .update({ image_url: imageUrl, caption: caption || null })
        .eq('id', currentImage.id);

      if (error) {
        console.error('Error updating image:', error.message);
        toast.error('Erro ao atualizar imagem.');
      } else {
        toast.success('Imagem atualizada com sucesso!');
        setIsImageDialogOpen(false);
        fetchGalleryImages();
      }
    } else {
      // Add new image
      const { data: existingImages } = await supabase
        .from('restaurant_gallery')
        .select('order_index')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: false })
        .limit(1);

      const newOrderIndex = existingImages && existingImages.length > 0
        ? existingImages[0].order_index + 1
        : 0;

      const { error } = await supabase
        .from('restaurant_gallery')
        .insert({
          restaurant_id: restaurantId,
          image_url: imageUrl,
          caption: caption || null,
          order_index: newOrderIndex,
        });

      if (error) {
        console.error('Error adding image:', error.message);
        toast.error('Erro ao adicionar imagem.');
      } else {
        toast.success('Imagem adicionada com sucesso!');
        setIsImageDialogOpen(false);
        fetchGalleryImages();
      }
    }
    setIsSaving(false);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem da galeria?')) return;

    const { error } = await supabase
      .from('restaurant_gallery')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('Error deleting image:', error.message);
      toast.error('Erro ao excluir imagem.');
    } else {
      toast.success('Imagem excluída com sucesso!');
      fetchGalleryImages();
    }
  };

  const moveImage = async (imageId: string, direction: 'up' | 'down') => {
    const imageIndex = galleryImages.findIndex(img => img.id === imageId);
    if (imageIndex === -1) return;

    const newGalleryImages = [...galleryImages];
    const imageToMove = newGalleryImages[imageIndex];

    let targetIndex = direction === 'up' ? imageIndex - 1 : imageIndex + 1;

    if (targetIndex < 0 || targetIndex >= newGalleryImages.length) return;

    const imageToSwap = newGalleryImages[targetIndex];

    // Perform the swap in the database
    const { error: error1 } = await supabase
      .from('restaurant_gallery')
      .update({ order_index: imageToSwap.order_index })
      .eq('id', imageToMove.id);

    const { error: error2 } = await supabase
      .from('restaurant_gallery')
      .update({ order_index: imageToMove.order_index })
      .eq('id', imageToSwap.id);

    if (error1 || error2) {
      console.error('Error swapping image order:', error1?.message || error2?.message);
      toast.error('Erro ao reordenar imagens.');
    } else {
      toast.success('Imagens reordenadas com sucesso!');
      fetchGalleryImages(); // Re-fetch to ensure consistent state
    }
  };

  if (loading) {
    return (
      <RestaurantAreaPageLayout title="Carregando Galeria" icon={Loader2}>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout
      title="Gerenciar Galeria"
      icon={Image}
    >
      <div className="p-4 space-y-6">
        <div className="flex justify-end">
          <Button onClick={handleAddImage}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Imagem
          </Button>
        </div>

        {galleryImages.length === 0 ? (
          <p className="text-center text-gray-500">Nenhuma imagem na galeria. Adicione uma!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryImages.map((image, index) => (
              <Card key={image.id} className="relative group">
                <img src={image.image_url} alt={image.caption || 'Imagem da galeria'} className="w-full h-48 object-cover rounded-t-md" />
                <CardContent className="p-3">
                  <p className="text-sm text-gray-700 truncate">{image.caption || 'Sem legenda'}</p>
                  <div className="flex justify-end space-x-2 mt-2">
                    <Button variant="ghost" size="icon" onClick={() => moveImage(image.id, 'up')} disabled={index === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => moveImage(image.id, 'down')} disabled={index === galleryImages.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditImage(image)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteImage(image.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentImage ? 'Editar Imagem' : 'Adicionar Nova Imagem'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="imageUrl">URL da Imagem</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
            <div>
              <Label htmlFor="caption">Legenda (Opcional)</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Uma breve descrição da imagem"
              />
            </div>
            {imageUrl && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Pré-visualização:</p>
                <img src={imageUrl} alt="Pré-visualização" className="w-full h-48 object-cover rounded-md" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImageDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveImage} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RestaurantAreaPageLayout>
  );
};

export default GalleryManagement;