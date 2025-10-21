import { supabase } from './client';

/**
 * Uploads a file to a specified Supabase Storage bucket.
 * @param file The file object to upload.
 * @param bucketName The name of the storage bucket.
 * @param path The path where o file should be stored inside the bucket (e.g., 'avatars/user_id/image.jpg').
 * @returns The public URL of the uploaded file or null on failure.
 */
export async function uploadFile(file: File, bucketName: string, path: string): Promise<string | null> {
  if (!file) return null;

  try {
    console.log(`[Storage] Iniciando upload para bucket: ${bucketName}, path: ${path}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('[Storage] Supabase Storage Upload Error:', error);
      throw new Error(`Falha ao fazer upload da imagem: ${error.message}`);
    }
    
    console.log('[Storage] Upload bem-sucedido. Obtendo URL pública...');

    // Construct the public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);
      
    console.log('[Storage] URL pública obtida:', publicUrlData.publicUrl);

    return publicUrlData.publicUrl;

  } catch (e) {
    console.error('[Storage] Erro capturado em uploadFile:', e);
    // Re-lança o erro para ser capturado pelo hook/componente chamador
    throw e; 
  }
}

// Define o nome do bucket para imagens de restaurantes
export const RESTAURANT_IMAGES_BUCKET = 'restaurant_images';