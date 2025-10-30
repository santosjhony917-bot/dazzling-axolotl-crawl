import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Trash2, Image, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface ImageUploadProps {
  bucketName: string;
  currentImageUrl?: string;
  onUploadSuccess: (url: string) => void;
  onRemove: () => void;
  folderPath: string; // Ex: 'restaurant_id/menu_items'
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  bucketName,
  currentImageUrl,
  onUploadSuccess,
  onRemove,
  folderPath,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImageUrl);

  React.useEffect(() => {
    setPreviewUrl(currentImageUrl);
  }, [currentImageUrl]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (publicUrlData.publicUrl) {
        onUploadSuccess(publicUrlData.publicUrl);
        setPreviewUrl(publicUrlData.publicUrl);
        toast.success('Imagem enviada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Falha ao enviar imagem.');
    } finally {
      setIsUploading(false);
      // Reset input value to allow re-uploading the same file
      event.target.value = ''; 
    }
  };

  const handleRemove = () => {
    // Note: We typically don't delete the file from storage immediately 
    // to avoid accidental data loss, but we clear the URL in the form.
    setPreviewUrl(undefined);
    onRemove();
    toast('URL da imagem removida do formulário.', { icon: '🗑️' });
  };

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200">
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <Image className="h-6 w-6 text-gray-400" />
          )}
          <p className="text-sm text-gray-500 mt-2">
            {isUploading ? 'Enviando...' : 'Clique para selecionar uma imagem'}
          </p>
          <Input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </div>
      )}
      
      {!previewUrl && (
        <Button 
          type="button" 
          variant="outline" 
          className="w-full"
          onClick={() => document.getElementById('file-upload-input')?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {isUploading ? 'Enviando...' : 'Selecionar Imagem'}
        </Button>
      )}
    </div>
  );
};

export default ImageUpload;