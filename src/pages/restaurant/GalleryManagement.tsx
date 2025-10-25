import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { useGalleryManagement } from '@/hooks/useGalleryManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Trash2, Image, PlusCircle, AlertTriangle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import GalleryImageManager from '@/components/restaurant/GalleryImageManager'; // NOVO IMPORT

export default function GalleryManagement() {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading } = useAuthContext();
  const restaurantId = restaurant?.id || null;

  const { 
    gallery, 
    isLoading: galleryLoading, 
    addGalleryImage, 
    deleteGalleryImage, 
    updateGalleryImage,
    isMutating 
  } = useGalleryManagement(restaurantId);

  const [newImageUrl, setNewImageUrl] = useState('');
  const [newCaption, setNewCaption] = useState('');

  const handleAddImage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !newImageUrl) {
      showError("URL da imagem e ID do restaurante são obrigatórios.");
      return;
    }

    try {
      await addGalleryImage({ 
        restaurant_id: restaurantId, 
        image_url: newImageUrl, 
        caption: newCaption || null 
      });
      // showSuccess("Imagem adicionada à galeria!"); // Sucesso já tratado no hook
      setNewImageUrl('');
      setNewCaption('');
    } catch (error) {
      // Erro já tratado no hook
    }
  }, [restaurantId, newImageUrl, newCaption, addGalleryImage]);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    try {
      await deleteGalleryImage(imageId);
      // showSuccess("Imagem removida com sucesso."); // Sucesso já tratado no hook
    } catch (error) {
      // Erro já tratado no hook
    }
  }, [deleteGalleryImage]);
  
  const handleUpdateCaption = useCallback(async (imageId: string, newCaption: string) => {
    try {
      await updateGalleryImage(imageId, { caption: newCaption });
      // showSuccess("Legenda atualizada."); // Sucesso já tratado no hook
    } catch (error) {
      // Erro já tratado no hook
    }
  }, [updateGalleryImage]);

  if (authLoading || galleryLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Você precisa ser um usuário de restaurante para gerenciar a galeria.</p>
        <Button onClick={() => navigate(createPageUrl('index'))}>
          Voltar para o Início
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <RestaurantAreaHeader title="Galeria de Fotos" icon={Image} backPath="restaurant-area/profile-menu" />
      
      <main className="p-4 space-y-6">
        
        {/* Adicionar Nova Imagem */}
        <Card className="shadow-lg border-none rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-primary">
              <PlusCircle className="w-5 h-5" /> Adicionar Nova Foto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddImage} className="space-y-4">
              <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem</label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://exemplo.com/foto.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  required
                  disabled={isMutating}
                />
              </div>
              <div>
                <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-1">Legenda (Opcional)</label>
                <Input
                  id="caption"
                  type="text"
                  placeholder="Uma breve descrição da foto"
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  disabled={isMutating}
                />
              </div>
              <Button type="submit" disabled={isMutating || !newImageUrl} className="w-full bg-highlight hover:bg-highlight/90">
                {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Adicionar à Galeria
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Galeria Atual */}
        <Card className="shadow-lg border-none rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-primary">
              <Image className="w-5 h-5" /> Fotos Atuais ({gallery.length})
            </CardTitle>
            <CardDescription>Clique na legenda para editar e pressione Enter ou clique fora para salvar.</CardDescription>
          </CardHeader>
          <CardContent>
            {gallery.length === 0 ? (
              <p className="text-gray-500">Nenhuma foto na galeria ainda.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {gallery.map((image) => (
                  <GalleryImageManager
                    key={image.id}
                    image={image}
                    onDelete={handleDeleteImage}
                    onUpdateCaption={handleUpdateCaption}
                    isMutating={isMutating}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}