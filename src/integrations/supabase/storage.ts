import { supabase } from './client';

// Nomes dos buckets de armazenamento do Supabase
export const RESTAURANT_IMAGES_BUCKET = 'restaurant_images';
export const USER_AVATARS_BUCKET = 'user_avatars';

/**
 * Faz o upload de um arquivo para um bucket específico no Supabase Storage.
 * @param file O arquivo a ser enviado.
 * @param bucketName O nome do bucket (ex: 'restaurant_images').
 * @param folderPath O caminho da pasta dentro do bucket (ex: ID do restaurante).
 * @param fileName O nome do arquivo a ser salvo (opcional, usa o nome original se não fornecido).
 * @returns A URL pública do arquivo ou um erro.
 */
export const uploadFile = async (
  file: File, 
  bucketName: string, 
  folderPath: string, 
  fileName?: string
): Promise<{ url: string | null; error: string | null }> => {
  
  const finalFileName = fileName || file.name;
  const filePath = `${folderPath}/${finalFileName}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Supabase Storage Upload Error:', error);
    return { url: null, error: error.message };
  }

  // Obter a URL pública
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    return { url: null, error: "Falha ao obter a URL pública após o upload." };
  }

  return { url: publicUrlData.publicUrl, error: null };
};