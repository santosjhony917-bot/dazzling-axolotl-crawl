import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File, bucket: string, entityId: string, type: 'logo' | 'cover' = 'logo') => {
    setUploading(true);
    
    // Mocking upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, we would upload to Supabase Storage
    // const filePath = `${entityId}/${type}-${Date.now()}.${file.name.split('.').pop()}`;
    // const { data, error } = await supabase.storage.from(bucket).upload(filePath, file);
    
    // Mocking success
    setUploading(false);
    return { url: 'https://via.placeholder.com/150', error: null };
  };

  return {
    uploadImage,
    uploading,
  };
}