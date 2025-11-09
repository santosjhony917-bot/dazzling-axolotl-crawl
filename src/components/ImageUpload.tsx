"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadFile } from '@/integrations/supabase/storage';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';

interface ImageUploadProps {
  bucketName: string;
  folderPath: string;
  onUploadComplete: (url: string) => void;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  bucketName,
  folderPath,
  onUploadComplete,
  className,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${folderPath}/${fileName}`;
    
    try {
      const publicUrl = await uploadFile(bucketName, filePath, file);
      onUploadComplete(publicUrl);
      toast.success('Upload concluído!');
      setFile(null); // Clear file after upload
    } catch (e: any) {
      console.error('Upload error:', e);
      toast.error(`Erro no upload: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-lg ${className}`}>
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={isUploading}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        Selecionar Imagem
      </Button>
      {file && <p className="text-sm text-gray-500 truncate max-w-xs">{file.name}</p>}
      <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Fazer Upload
          </>
        )}
      </Button>
    </div>
  );
};