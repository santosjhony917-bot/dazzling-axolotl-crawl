import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { useGalleryManagement } from '@/hooks/useGalleryManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Trash2, Image, PlusCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import GalleryImageCard from '@/components/restaurant/GalleryImageCard';
import { Skeleton } from '@/components/ui/skeleton';

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

  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = useCallback(async (url: string) => {
    if (!restaurantId) return;
    
    setIsUploading(true);
    try {
      // Adiciona a imagem à tabela da galeria
      await addGalleryImage({ 
        restaurant_id: restaurantId, 
        image_url: url, 
        caption: null 
      });
      showSuccess("Foto adicionada à galeria!");
    } catch (error) {
      showError("Falha ao salvar a foto no banco de dados.");
    } finally {
      setIsUploading(false);
    }
  }, [restaurantId, addGalleryImage]);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (window.confirm("Tem certeza que deseja deletar esta imagem?")) {
      try {
        await deleteGalleryImage(imageId);
      } catch (error) {
        showError("Falha ao remover imagem.");
      }
    }
  }, [deleteGalleryImage]);

  const handleUpdateCaption = useCallback(async (imageId: string, newCaption: string) => {
    try {
      await updateGalleryImage(imageId, { caption: newCaption });
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
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <Button variant="link" onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))} className="mb-4 pl-0">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Perfil
      </Button>
      
      <h1 className="text-3xl font-bold text-primary">Gerenciar Galeria de Fotos</h1>
      <p className="text-gray-600">Adicione fotos que aparecerão no perfil público do seu restaurante. (Recurso Premium)</p>

      {/* Adicionar Nova Imagem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <PlusCircle className="w-5 h-5" /> Adicionar Nova Foto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <ImageUploadButton
              onUploadComplete={handleUploadComplete}
              bucketName={RESTAURANT_IMAGES_BUCKET}
              folderPath={`${restaurantId}/gallery`}
              className="h-12 w-full flex-1 bg-primary hover:bg-primary/90"
              icon={isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            >
              {isUploading ? "Enviando..." : "Selecionar e Enviar Foto"}
            </ImageUploadButton>
          </div>
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
            <p className="text-gray-500">Nenhuma foto na galeria ainda. Use o botão acima para adicionar.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map((image) => (
                <GalleryImageCard 
                  key={image.id} 
                  image={image} 
                  onDelete={handleDeleteImage}
                  onUpdateCaption={handleUpdateCaption}
                  isDeleting={isMutating}
                  isUpdating={isMutating}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}