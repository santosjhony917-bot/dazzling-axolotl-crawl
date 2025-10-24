import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadImage = useCallback(async (file: File, bucket: string, entityId: string, type: 'logo' | 'cover' | 'item' = 'logo') => {
    setUploading(true);
    
    if (!file) {
      setUploading(false);
      return { url: null, error: new Error("Nenhum arquivo selecionado.") };
    }

    // Define o caminho do arquivo: [entityId]/[tipo]-[timestamp].[extensao]
    const fileExt = file.name.split('.').pop();
    const filePath = `${entityId}/${type}-${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Não sobrescreve automaticamente
      });

    if (error) {
      setUploading(false);
      return { url: null, error };
    }
    
    // Obtém a URL pública do arquivo
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    setUploading(false);
    
    return { url: publicUrlData.publicUrl, error: null };
  }, []);

  return {
    uploadImage,
    uploading,
  };
}