import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useGalleryManagement } from '@/hooks/useGalleryManagement.tsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, Image, PlusCircle, AlertTriangle, ArrowLeft, Lock } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import GalleryImageCard from '@/components/restaurant/GalleryImageCard';
import { Skeleton } from '@/components/ui/skeleton';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import CoverImageUploader from '@/components/restaurant/CoverImageUploader'; // NOVO IMPORT

export default function GalleryManagement() {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading, isPremium } = useAuthData();
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
  const isLocked = !isPremium;

  const handleUploadComplete = useCallback(async (url: string) => {
    if (!restaurantId) return;
    
    setIsUploading(true);
    try {
      // Adiciona a imagem à tabela da galeria
      await addGalleryImage({ 
        restaurantId: restaurantId,
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
    if (isLocked) {
      showError("Recurso Premium. Faça upgrade para desbloquear.");
      return;
    }
    if (window.confirm("Tem certeza que deseja deletar esta imagem?")) {
      try {
        await deleteGalleryImage(imageId);
        // O hook já invalida a query e mostra o toast de sucesso
      } catch (error) {
        showError("Falha ao remover imagem.");
      }
    }
  }, [deleteGalleryImage, isLocked]);

  const handleUpdateCaption = useCallback(async (imageId: string, newCaption: string) => {
    if (isLocked) {
      showError("Recurso Premium. Faça upgrade para desbloquear.");
      return;
    }
    try {
      await updateGalleryImage({ imageId, updates: { caption: newCaption } });
      showSuccess("Legenda atualizada!");
    } catch (error) {
      showError("Falha ao atualizar legenda.");
    }
  }, [updateGalleryImage, isLocked]);

  if (authLoading || galleryLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f7f8]">
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
    <RestaurantAreaPageLayout title="Galeria de Fotos" icon={Image} backPath="restaurant-area/profile-menu">
      <div className="p-4 space-y-6">
        
        {isLocked && (
          <div className="p-4 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-xl flex items-center gap-3">
            <Lock className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium flex-1">
              A gestão da galeria e da imagem de capa é um recurso exclusivo do plano Premium. Faça upgrade para desbloquear.
            </p>
            <Button 
              onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
              className="bg-highlight hover:bg-highlight/90 shrink-0"
            >
              Upgrade
            </Button>
          </div>
        )}
        
        {/* Uploader de Imagem de Capa */}
        <div className={isLocked ? "opacity-50 pointer-events-none" : ""}>
          <CoverImageUploader />
        </div>

        {/* Adicionar Nova Imagem (Galeria) */}
        <Card className={isLocked ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-primary">
              <PlusCircle className="w-5 h-5" /> Adicionar Nova Foto à Galeria
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
                disabled={isUploading || isLocked}
              >
                {isUploading ? "Enviando..." : "Selecionar e Enviar Foto"}
              </ImageUploadButton>
            </div>
          </CardContent>
        </Card>

        {/* Galeria Atual */}
        <Card className={isLocked ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-primary">
              <Image className="w-5 h-5" /> Fotos Atuais da Galeria ({gallery.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {galleryLoading ? (
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : gallery.length === 0 ? (
              <p className="text-gray-500">Nenhuma foto na galeria ainda. Use o botão acima para adicionar.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
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
    </RestaurantAreaPageLayout>
  );
}