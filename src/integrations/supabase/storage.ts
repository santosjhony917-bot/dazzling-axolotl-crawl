import { supabase } from './client';

export const PROFILES_BUCKET = 'profiles';
export const RESTAURANT_IMAGES_BUCKET = 'restaurant-images';
export const USER_AVATAR_BUCKET = 'profiles';

export const uploadFile = async (bucketName: string, filePath: string, file: File) => {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(data.path);
  return publicUrl;
};

export const deleteFile = async (bucketName: string, filePath: string) => {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);
  if (error) {
    console.warn(`Erro ao excluir arquivo ${filePath} do bucket ${bucketName}:`, error);
  }
};

export const deleteFileFromUrl = async (url: string) => {
  if (!url || !url.includes('supabase.co/storage/v1/object/public/')) return;
  try {
    const marker = '/public/';
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return;
    
    const remaining = url.substring(markerIndex + marker.length);
    const firstSlashIndex = remaining.indexOf('/');
    if (firstSlashIndex === -1) return;
    
    const bucketName = remaining.substring(0, firstSlashIndex);
    const filePath = decodeURIComponent(remaining.substring(firstSlashIndex + 1));
    
    await deleteFile(bucketName, filePath);
  } catch (err) {
    console.error('Falha ao processar exclusão de arquivo via URL:', err);
  }
};