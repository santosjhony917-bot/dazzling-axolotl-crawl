import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, Camera, Plus, Loader2, AlertTriangle } from 'lucide-react';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { useAuthContext } from '@/context/AuthContext';
import { useGalleryManagement } from '@/hooks/useGalleryManagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import GalleryImageCard from '@/components/restaurant/GalleryImageCard';
import { createPageUrl } from '@/utils/url';
import { showError } from '@/utils/toast';

export default function GalleryManagement() {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading } = useAuthContext();
  const restaurantId = restaurant?.id || null;
  
  const { gallery, isLoading, error, addImage, removeImage, isAdding, isRemoving } = useGalleryManagement(restaurantId);
  const [isUploading, setIsUploading] = useState(false);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] p-4 max-w-md mx-auto">
        <RestaurantAreaHeader title="Galeria de Fotos" icon={Camera} backPath="restaurant-area/profile-menu" />
        <Skeleton className="h-40 w-full mt-4" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }
  
  if (!restaurantId) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-[#022D68]">Acesso Negado</h2>
        <p className="text-gray-600 mt-2">Você precisa ser proprietário de um restaurante para gerenciar a galeria.</p>
        <Button onClick={() => navigate(createPageUrl('restaurant-login'))} className="mt-4 bg-[#E47948] hover:bg-[#E47948]/90">
          Fazer Login
        </Button>
      </div>
    );
  }

  const handleUploadComplete = async (url: string) => {
    setIsUploading(true);
    try {
      // Por enquanto, sem legenda
      await addImage({ image_url: url });
    } catch (e) {
      // Erro tratado no hook
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDeleteImage = async (imageId: string) => {
    try {
      await removeImage(imageId);
    } catch (e) {
      // Erro tratado no hook
    }
  };

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      <RestaurantAreaHeader title="Galeria de Fotos" icon={Camera} backPath="restaurant-area/profile-menu" />

      <main className="flex-1 w-full max-w-md p-4 space-y-6">
        
        <Card className="shadow-lg border-none rounded-xl p-4">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-bold text-primary">Adicionar Nova Foto</CardTitle>
            <CardDescription>As fotos da galeria aparecerão no seu perfil Premium.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ImageUploadButton
              onUploadComplete={handleUploadComplete}
              bucketName={RESTAURANT_IMAGES_BUCKET}
              folderPath={`${restaurantId}/gallery`}
              className="w-full h-12 text-base font-bold bg-highlight hover:bg-highlight/90"
              icon={isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              disabled={isUploading || isAdding}
            >
              {isUploading || isAdding ? 'Enviando...' : 'Selecionar e Enviar Foto'}
            </ImageUploadButton>
            <p className="text-xs text-gray-500 mt-2 text-center">Recomendado: Imagens de alta qualidade (1:1 ou 4:3)</p>
          </CardContent>
        </Card>
        
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg border-none rounded-xl p-4">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-bold text-primary">Fotos Atuais ({gallery.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {gallery.length === 0 ? (
              <Alert className="border-dashed text-center">
                <Camera className="h-4 w-4" />
                <AlertTitle>Galeria Vazia</AlertTitle>
                <AlertDescription>
                  Adicione fotos para mostrar o ambiente e os pratos do seu restaurante.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {gallery.map(image => (
                  <GalleryImageCard 
                    key={image.id} 
                    image={image} 
                    onDelete={handleDeleteImage} 
                    isDeleting={isRemoving}
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