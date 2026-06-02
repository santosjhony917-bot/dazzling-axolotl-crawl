import { supabase } from './client';

const SUPABASE_PROJECT_ID = 'gaawiewmlhorzbaixoqo'; 
const IMAGE_PROCESSOR_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/download-and-upload-image`;

interface ImageProcessPayload {
  imageUrl: string;
  bucketName: string;
  folderPath: string;
  fileName: string;
}

interface ImageProcessResponse {
  publicUrl: string;
}

/**
 * Downloads an image from an external URL, uploads it to Supabase Storage, and returns the new public URL.
 */
export async function processExternalImage(payload: ImageProcessPayload): Promise<ImageProcessResponse> {
  
  const response = await fetch(IMAGE_PROCESSOR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to process external image via Edge Function.");
  }

  return data as ImageProcessResponse;
}