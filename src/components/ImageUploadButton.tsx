import React, { useRef, useState, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonProps } from '@/components/ui/button';
import { uploadFile } from '@/integrations/supabase/storage';
import toast from 'react-hot-toast';

interface ImageUploadButtonProps extends ButtonProps {
  onUploadComplete: (url: string) => void;
  imageUrl?: string; // Mantido para compatibilidade, mas não usado para preview interno
  bucketName: string;
  folderPath: string;
  className?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const ImageUploadButton = memo(({ 
  onUploadComplete, 
  imageUrl, // Não usado para preview interno
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
        // toast.success("Imagem enviada com sucesso!"); // Toast movido para o componente pai (ProfileHeaderManagement)
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

  return (
    <>
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
          "h-8 w-8 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90 transition-all",
          className
        )}
        size="icon"
        disabled={uploading}
        {...props}
      >
        {children || displayIcon}
      </Button>
    </>
  );
});