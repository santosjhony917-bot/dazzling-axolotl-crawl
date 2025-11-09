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