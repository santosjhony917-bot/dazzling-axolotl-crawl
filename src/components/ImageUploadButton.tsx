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

      // Bypass local em sessões mockadas ou offline
      if (folderPath.startsWith('mock-')) {
        try {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              onUploadComplete(e.target.result as string);
              toast.success('Imagem enviada com sucesso (Local Mock)!');
            }
          };
          reader.readAsDataURL(file);
          return;
        } catch (error: any) {
          console.error('Erro ao ler imagem localmente:', error.message);
          toast.error(`Erro ao ler imagem localmente: ${error.message}`);
          return;
        }
      }

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
          "w-10 h-10 rounded-full bg-highlight text-white flex items-center justify-center shadow-none transition-colors",
          "hover:bg-[#df4b1c]/90",
          (!className || (!className.includes('absolute') && !className.includes('relative') && !className.includes('static'))) && "absolute bottom-0 right-0",
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