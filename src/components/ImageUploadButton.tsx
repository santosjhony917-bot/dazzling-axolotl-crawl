import React, { useRef, useState, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonProps } from '@/components/ui/button';
import { uploadFile, RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import toast from 'react-hot-toast';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface ImageUploadButtonProps extends ButtonProps {
  onUploadComplete: (url: string) => void;
  imageUrl?: string;
  bucketName: string;
  folderPath: string;
  className?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const ImageUploadButton = memo(({ 
  onUploadComplete, 
  imageUrl, 
  bucketName, 
  folderPath, 
  className, 
  icon, 
  children, 
  ...props 
}: ImageUploadButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Define o caminho do arquivo: [folderPath]/[timestamp].[extensao]
    const fileExt = file.name.split('.').pop();
    const path = `${folderPath}/${Date.now()}.${fileExt}`;
    
    try {
      const publicUrl = await uploadFile(file, bucketName, path);

      if (publicUrl) {
        onUploadComplete(publicUrl);
        toast.success("Imagem enviada com sucesso!");
      } else {
        toast.error("Falha ao fazer upload da imagem.");
      }
    } catch (e) {
      const errorMessage = (e as Error).message || "Erro desconhecido durante o upload.";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      // Reset input value to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const displayIcon = useMemo(() => {
    if (uploading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return icon || <Camera className="h-4 w-4" />;
  }, [uploading, icon]);

  const currentImageUrl = imageUrl || PLACEHOLDER_IMAGE_URL;

  return (
    <div className="relative w-full h-24 flex items-center justify-center rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
      <img 
        src={currentImageUrl} 
        alt="Preview" 
        className="w-full h-full object-cover"
      />
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={uploading}
      />
      
      <Button
        type="button"
        onClick={handleClick}
        className={cn(
          "absolute bottom-2 right-2 h-8 w-8 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90 transition-all",
          className
        )}
        size="icon"
        disabled={uploading}
        {...props}
      >
        {children || displayIcon}
      </Button>
    </div>
  );
});