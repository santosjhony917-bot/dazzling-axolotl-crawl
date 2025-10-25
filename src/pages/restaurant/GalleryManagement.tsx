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
      showSuccess("Imagem adicionada à galeria!");
      setNewImageUrl('');
      setNewCaption('');
    } catch (error) {
      showError("Falha ao adicionar imagem.");
    }
  }, [restaurantId, newImageUrl, newCaption, addGalleryImage]);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (window.confirm("Tem certeza que deseja deletar esta imagem?")) {
      try {
        await deleteGalleryImage(imageId);
        showSuccess("Imagem removida com sucesso.");
      } catch (error) {
        showError("Falha ao remover imagem.");
      }
    }
  }, [deleteGalleryImage]);

  const handleUpdateCaption = useCallback(async (imageId: string, newCaption: string) => {
    try {
      await updateGalleryImage(imageId, { caption: newCaption });
      showSuccess("Legenda atualizada.");
    } catch (error) {
      showError("Falha ao atualizar legenda.");
    }
  }, [updateGalleryImage]);

  if (authLoading || galleryLoading) {
    return (
      <div className="flex justify-center items-center h-64">
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Gerenciar Galeria de Fotos</h1>
      <p className="text-gray-600">Adicione, edite ou remova fotos que aparecerão no perfil público do seu restaurante.</p>

      {/* Adicionar Nova Imagem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
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
            <Button type="submit" disabled={isMutating || !newImageUrl}>
              {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Adicionar à Galeria
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Galeria Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Image className="w-5 h-5" /> Fotos Atuais ({gallery.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gallery.length === 0 ? (
            <p className="text-gray-500">Nenhuma foto na galeria ainda.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map((image) => (
                <div key={image.id} className="relative border rounded-lg overflow-hidden bg-gray-50">
                  <img 
                    src={image.image_url || PLACEHOLDER_IMAGE_URL} 
                    alt={image.caption || 'Foto da Galeria'} 
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-3 space-y-2">
                    <Input
                      type="text"
                      placeholder="Adicionar legenda"
                      defaultValue={image.caption || ''}
                      onBlur={(e) => handleUpdateCaption(image.id, e.target.value)}
                      disabled={isMutating}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDeleteImage(image.id)}
                      disabled={isMutating}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}