import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { logError } from '@/utils/errorLogger';
import { v4 as uuidv4 } from 'uuid';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';

interface UseImageUploadOptions {
  bucketName?: string;
  onUploadSuccess?: (publicUrl: string, filePath: string) => void;
  onUploadError?: (error: Error) => void;
}

export function useImageUpload(options?: UseImageUploadOptions) {
  const { bucketName = RESTAURANT_IMAGES_BUCKET, onUploadSuccess, onUploadError } = options || {};
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File, pathPrefix: string): Promise<{ publicUrl: string; filePath: string } | null> => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    if (!file) {
      const err = new Error('Nenhum arquivo selecionado para upload.');
      setError(err.message);
      logError(err, { context: 'useImageUpload: no file' });
      onUploadError?.(err);
      setIsUploading(false);
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${pathPrefix}/${fileName}`;

    try {
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          // onUploadProgress: (event) => { // Supabase client doesn't directly expose progress for upload method
          //   setUploadProgress(Math.round((event.loaded / event.total) * 100));
          // },
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Não foi possível obter a URL pública da imagem.');
      }

      showSuccess('Upload realizado com sucesso!');
      onUploadSuccess?.(publicUrlData.publicUrl, filePath);
      return { publicUrl: publicUrlData.publicUrl, filePath };

    } catch (e: any) {
      const errorMessage = e.message || 'Erro desconhecido ao fazer upload da imagem.';
      setError(errorMessage);
      showError(`Falha no upload: ${errorMessage}`);
      logError(e, { context: 'useImageUpload: uploadImage' });
      onUploadError?.(e);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0); // Reset progress
    }
  }, [bucketName, onUploadSuccess, onUploadError]);

  const deleteImage = useCallback(async (filePath: string): Promise<boolean> => {
    setError(null);
    try {
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }
      showSuccess('Imagem removida do armazenamento.');
      return true;
    } catch (e: any) {
      const errorMessage = e.message || 'Erro desconhecido ao remover imagem.';
      setError(errorMessage);
      showError(`Falha ao remover imagem: ${errorMessage}`);
      logError(e, { context: 'useImageUpload: deleteImage' });
      return false;
    }
  }, [bucketName]);

  return {
    isUploading,
    uploadProgress,
    error,
    uploadImage,
    deleteImage,
  };
}