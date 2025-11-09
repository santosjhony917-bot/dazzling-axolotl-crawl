"use client";

import React, { useRef } from 'react';
import { Button } from './ui/button';
import { CameraIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadButtonProps {
  onUploadComplete: (url: string) => void;
  imageUrl?: string;
  bucketName: string;
  folderPath: string;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onUploadComplete,
  imageUrl,
  bucketName,
  folderPath,
  className,
  icon = <CameraIcon className="h-5 w-5" />,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const filePath = `${folderPath}/${Date.now()}-${file.name}`;

      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          throw error;
        }

        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        if (publicUrlData.publicUrl) {
          onUploadComplete(publicUrlData.publicUrl);
          toast.success('Imagem enviada com sucesso!');
        } else {
          throw new Error('Não foi possível obter a URL pública da imagem.');
        }
      } catch (error: any) {
        console.error('Erro ao enviar imagem:', error.message);
        toast.error(`Erro ao enviar imagem: ${error.message}`);
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={disabled}
      />
      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "absolute bottom-0 right-0 w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md",
          "hover:bg-orange-600 transition-colors",
          className
        )}
        aria-label="Upload new photo"
        disabled={disabled}
      >
        {icon}
      </Button>
    </>
  );
};