"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { uploadFile } from '@/integrations/supabase/storage';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface ImageUploadProps {
  value: string; // Current image URL
  onChange: (url: string) => void; // Callback to update parent with new URL
  bucketName: string;
  folderPath: string;
  label?: string;
  aspectRatio?: string; // e.g., "16/9", "4/3", "1/1"
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  bucketName,
  folderPath,
  label = "Imagem",
  aspectRatio = "16/9",
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione uma imagem para fazer upload.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const { url, error } = await uploadFile(file, bucketName, folderPath, fileName);

    if (error) {
      toast({
        title: "Erro no upload da imagem",
        description: error,
        variant: "destructive",
      });
    } else if (url) {
      onChange(url);
      setFile(null); // Clear selected file after successful upload
      toast({
        title: "Upload realizado com sucesso!",
        description: "A imagem foi enviada para o servidor.",
        variant: "default",
      });
    }
    setLoading(false);
  };

  const handleRemoveImage = () => {
    onChange(''); // Clear the image URL
    setFile(null); // Clear any selected file
  };

  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right">{label}</Label>
      <div className="col-span-3 flex flex-col gap-2">
        {value ? (
          <div className="relative w-full rounded-md overflow-hidden border border-gray-200 dark:border-gray-700" style={{ aspectRatio: aspectRatio }}>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 rounded-full"
              onClick={handleRemoveImage}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
              <UploadCloud className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF (MAX. 5MB)</p>
            </Label>
            <Input
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        )}

        {file && !value && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={loading}
              size="sm"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Upload
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFile(null)}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;