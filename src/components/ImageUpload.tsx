"use client";

import { useCallback, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface ImageUploadProps {
  bucket: string;
  currentImageUrl: string | null;
  onUploadSuccess: (url: string) => Promise<void>;
  onRemove: () => Promise<void>; // Added onRemove prop
  folderPath: string; // e.g., 'restaurant_images' or 'menu_item_images'
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  bucket,
  currentImageUrl,
  onUploadSuccess,
  onRemove,
  folderPath,
  className,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. Upload the new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);

      const newUrl = publicUrlData.publicUrl;

      // 3. Handle old image removal if necessary (optional, handled by caller if needed, but we focus on success callback here)
      
      await onUploadSuccess(newUrl);
      toast.success('Imagem enviada com sucesso!');

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar imagem.');
    } finally {
      setIsUploading(false);
    }
  }, [bucket, folderPath, onUploadSuccess]);

  const handleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUploading(true); // Use uploading state temporarily for removal feedback
    try {
        // Note: The actual storage deletion logic is often complex (checking if other items use the same URL)
        // For simplicity, we rely on the caller (onRemove) to handle form state update (setting URL to null).
        // If storage deletion is required, it should be implemented here or in the onRemove callback provided by the parent.
        
        // If currentImageUrl exists, we attempt to delete the file from storage first.
        if (currentImageUrl) {
            // Extract path from URL (this is highly dependent on Supabase URL structure)
            // Example URL: https://[project_id].supabase.co/storage/v1/object/public/[bucket]/[path]
            const pathSegments = currentImageUrl.split('/');
            const path = pathSegments.slice(pathSegments.indexOf(bucket) + 1).join('/');

            if (path) {
                const { error: deleteError } = await supabase.storage
                    .from(bucket)
                    .remove([path]);

                if (deleteError) {
                    // Log error but proceed, as the main goal is clearing the form state
                    console.error('Error deleting old image from storage:', deleteError);
                    // We might still want to proceed with onRemove to clear the UI state
                }
            }
        }

        await onRemove();
        toast.success('Imagem removida com sucesso!');
    } catch (error) {
        console.error('Error removing image:', error);
        toast.error('Erro ao remover imagem.');
    } finally {
        setIsUploading(false);
    }
  }, [currentImageUrl, bucket, onRemove]);


  if (currentImageUrl) {
    return (
      <div className={cn("relative w-full h-48 rounded-lg overflow-hidden group", className)}>
        <img 
          src={currentImageUrl} 
          alt="Uploaded image" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="destructive" 
            size="icon" 
            onClick={handleRemove}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <label 
      htmlFor="image-upload" 
      className={cn(
        "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors",
        className
      )}
    >
      <input 
        id="image-upload" 
        type="file" 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload} 
        disabled={isUploading}
      />
      {isUploading ? (
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="mt-2 text-sm text-gray-500">Enviando...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-semibold">Clique para enviar</span> ou arraste e solte
          </p>
          <p className="text-xs text-gray-500">PNG, JPG ou JPEG (Max 5MB)</p>
        </div>
      )}
    </label>
  );
};

export default ImageUpload;