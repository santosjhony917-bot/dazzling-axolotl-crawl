import { supabase } from './client';

export const RESTAURANT_IMAGES_BUCKET = 'restaurant_images';
export const USER_AVATARS_BUCKET = 'user_avatars';

export async function uploadFile(
  file: File,
  bucketName: string,
  folderPath: string,
  fileName: string
): Promise<{ url: string | null; error: string | null }> {
  const filePath = `${folderPath}/${fileName}`;
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return { url: null, error: error.message };
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return { url: publicUrlData.publicUrl, error: null };
}