import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage'; // CORRIGIDO: Usando RESTAURANT_IMAGES_BUCKET
import { useRestaurantUpdate } from '@/hooks/useRestaurantUpdate';
import { useAuthData } from '@/context/AuthContext';
import { Image, Upload, Loader2, AlertTriangle } from 'lucide-react';
import { PLACEHOLDER_COVER_URL } from '@/constants/assets';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';

const CoverImageUploader: React.FC = () => {
  const { restaurant, isLoading: authLoading, refetchProfile } = useAuthData();
  const restaurantId = restaurant?.id;
  const currentCoverUrl = restaurant?.cover_image_url;

  const { mutate: updateRestaurant, isPending: isUpdatingDb } = useRestaurantUpdate();
  const [isUploading, setIsUploading] = React.useState(false);

  const handleUploadComplete = useCallback(async (url: string) => {
    if (!restaurantId) return;
    
    setIsUploading(true);
    
    // Adiciona um timestamp para cache busting
    const cacheBustedUrl = `${url}?t=${Date.now()}`;
    
    const updatePromise = new Promise<void>((resolve, reject) => {
      updateRestaurant(
        { restaurantId, data: { cover_image_url: cacheBustedUrl } },
        {
          onSuccess: () => {
            showSuccess("Imagem de capa atualizada com sucesso!");
            refetchProfile();
            resolve();
          },
          onError: (error) => {
            showError(`Falha ao salvar URL no DB: ${(error as Error).message}`);
            reject(error);
          },
        }
      );
    });

    try {
      await updatePromise;
    } catch (e) {
      // O erro é tratado no onError
    } finally {
      setIsUploading(false);
    }
  }, [restaurantId, updateRestaurant, refetchProfile]);

  if (authLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (!restaurantId) {
    return (
      <Card className="p-4 bg-red-50 border-red-300">
        <AlertTriangle className="w-5 h-5 text-red-500 inline mr-2" />
        <span className="text-red-700">Erro: ID do restaurante não encontrado.</span>
      </Card>
    );
  }

  const displayUrl = currentCoverUrl || PLACEHOLDER_COVER_URL;
  const isMutating = isUploading || isUpdatingDb;

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-primary">
          <Image className="w-5 h-5" /> Imagem de Capa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-200 shadow-soft-md">
          <img
            src={displayUrl}
            alt="Capa do Restaurante"
            className="w-full h-full object-cover"
          />
          
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <ImageUploadButton
              onUploadComplete={handleUploadComplete}
              bucketName={RESTAURANT_IMAGES_BUCKET} // CORRIGIDO AQUI
              // O folderPath é [restaurantId]/cover, e o ImageUploadButton adiciona o timestamp.ext
              folderPath={`${restaurantId}/cover`} 
              className="h-10 w-40 bg-highlight hover:bg-highlight/90 text-white font-bold"
              icon={isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              disabled={isMutating}
            >
              {isMutating ? "Enviando..." : "Trocar Imagem de Capa"}
            </ImageUploadButton>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Esta imagem aparece no topo do seu perfil público. Recomendamos 800x300px.
        </p>
      </CardContent>
    </Card>
  );
};

export default CoverImageUploader;