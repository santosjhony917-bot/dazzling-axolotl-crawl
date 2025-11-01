"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuthData } from '@/context/AuthContext';
import { useGalleryManagement } from '@/hooks/useGalleryManagement';
import GalleryImageCard from '@/components/restaurant/GalleryImageCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GalleryImage as SupabaseGalleryImage } from '@/types/supabase';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'; // Importando do @hello-pangea/dnd

const GalleryManagement: React.FC = () => {
  const { toast } = useToast();
  const { restaurant, isProfileLoading, refetchProfile } = useAuthData();

  const {
    galleryImages,
    isLoading,
    error,
    refetch,
    addImage,
    updateImage,
    deleteImage,
    reorderImages,
    isAddingImage,
    isUpdatingImage,
    isDeletingImage,
    isReorderingImages,
  } = useGalleryManagement({ restaurantId: restaurant?.id || '' });

  const [isAddImageDialogOpen, setIsAddImageDialogOpen] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');

  const handleAddImage = async () => {
    if (!newImageUrl) {
      toast({
        title: "Erro",
        description: "A URL da imagem não pode estar vazia.",
        variant: "destructive",
      });
      return;
    }
    try {
      await addImage({ imageUrl: newImageUrl, caption: newImageCaption });
      setNewImageUrl('');
      setNewImageCaption('');
      setIsAddImageDialogOpen(false);
    } catch (err) {
      // Error handled by useGalleryManagement
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const reorderedImages = Array.from(galleryImages);
    const [removed] = reorderedImages.splice(result.source.index, 1);
    reorderedImages.splice(result.destination.index, 0, removed);

    reorderImages(reorderedImages);
  };

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    toast({
      title: "Erro",
      description: "Não foi possível carregar a galeria de imagens.",
      variant: "destructive",
    });
    return (
      <div className="text-center text-red-500 py-8">
        <p>Erro ao carregar a galeria. Por favor, tente novamente.</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-[#022D68] mb-4">Gerenciamento de Galeria</h1>
        <p className="text-gray-600">Você precisa ter um restaurante registrado para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Gerenciamento de Galeria</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Imagens da Galeria</CardTitle>
          <Button onClick={() => setIsAddImageDialogOpen(true)} className="bg-[#E47948] hover:bg-[#C2653B]">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Imagem
          </Button>
        </CardHeader>
        <CardDescription className="px-6">
          Adicione e organize as imagens do seu restaurante. Arraste e solte para reordenar.
        </CardDescription>
        <CardContent className="pt-4">
          {galleryImages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhuma imagem na galeria ainda.</p>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="gallery">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  >
                    {galleryImages.map((image, index) => (
                      <Draggable key={image.id} draggableId={image.id} index={index}>
                        {(provided) => (
                          <GalleryImageCard
                            image={image}
                            onUpdateCaption={(id, caption) => updateImage({ id, caption })} // Corrigido o uso de updateImage
                            onDelete={deleteImage}
                            isUpdating={isUpdatingImage}
                            isDeleting={isDeletingImage}
                            provided={provided}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddImageDialogOpen} onOpenChange={setIsAddImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Imagem</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="imageUrl" className="text-right">
                URL da Imagem
              </Label>
              <Input
                id="imageUrl"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="col-span-3"
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="imageCaption" className="text-right">
                Legenda (opcional)
              </Label>
              <Input
                id="imageCaption"
                value={newImageCaption}
                onChange={(e) => setNewImageCaption(e.target.value)}
                className="col-span-3"
                placeholder="Uma breve descrição da imagem"
              />
            </div>
            {newImageUrl && (
              <div className="col-span-4 flex justify-center">
                <img src={newImageUrl} alt="Preview" className="max-h-48 object-contain rounded-md" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddImageDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddImage} disabled={isAddingImage}>
              {isAddingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryManagement;