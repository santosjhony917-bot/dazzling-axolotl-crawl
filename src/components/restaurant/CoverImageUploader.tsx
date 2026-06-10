import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_COVER_URL } from '@/constants/assets';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { Button } from '@/components/ui/button';

interface CoverImageUploaderProps {
  restaurantId: string;
  coverImageUrl: string | null | undefined;
  onUploadComplete: (url: string) => Promise<void>;
}

const CoverImageUploader: React.FC<CoverImageUploaderProps> = ({
  restaurantId,
  coverImageUrl,
  onUploadComplete,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = useCallback(async (url: string) => {
    setIsUploading(true);
    await onUploadComplete(url);
    setIsUploading(false);
  }, [onUploadComplete]);

  const displayUrl = coverImageUrl || PLACEHOLDER_COVER_URL;

  return (
    <Card className="w-full aspect-[3/1] overflow-hidden relative rounded-2xl shadow-none">
      {/* Imagem de Capa */}
      <img
        src={displayUrl}
        alt="Capa do Restaurante"
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {/* Overlay de Upload */}
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImageUploadButton
              onUploadComplete={handleUploadComplete}
              bucketName={RESTAURANT_IMAGES_BUCKET}
              folderPath={`${restaurantId}/cover`}
              className="bg-white text-primary hover:bg-gray-100 h-10 w-10 p-0 rounded-full shadow-none relative"
              icon={<Camera className="h-5 w-5" />}
            />
            <span className="text-white font-semibold text-sm">Alterar Capa</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CoverImageUploader;