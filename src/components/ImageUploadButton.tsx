"use client";

import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/integrations/supabase/storage';
import { showError } from '@/utils/toast';

interface ImageUploadButtonProps {
  imageUrl?: string;
  onUploadComplete: (url: string) => void;
  bucketName: string;
  folderPath: string;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean; // Adicionado para resolver o erro #16
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onUploadComplete,
  bucketName,
  folderPath,
  className,
  icon = <Camera className="h-4 w-4" />,
  disabled = false, // Adicionado para resolver o erro #16
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const fileName = `${Date.now()}-${file.name}`;
      
      const { url: publicUrl, error: uploadError } = await uploadFile(
        file,
        bucketName,
        folderPath,
        fileName
      );

      if (uploadError) {
        showError(`Erro ao enviar imagem: ${uploadError}`);
      } else if (publicUrl) {
        onUploadComplete(publicUrl);
      } else {
        showError("Erro desconhecido ao obter a URL da imagem.");
      }
    } catch (e) {
      showError("Falha no processo de upload.");
      console.error(e);
    } finally {
      setIsUploading(false);
      // Limpar o input para permitir o upload do mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={isUploading || disabled} // Usar a prop disabled também
      />
      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "p-2 rounded-full",
          className
        )}
        disabled={isUploading || disabled} // Usar a prop disabled também
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          icon
        )}
      </Button>
    </>
  );
};