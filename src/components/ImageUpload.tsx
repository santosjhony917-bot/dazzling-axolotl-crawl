import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface ImageUploadProps {
  bucket: string;
  currentImageUrl: string | null | undefined;
  onUploadSuccess: (url: string) => void;
  folderPath: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ bucket, currentImageUrl, onUploadSuccess, folderPath }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showError('Selecione um arquivo primeiro.');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!publicUrlData.publicUrl) throw new Error("Falha ao obter URL pública.");

      onUploadSuccess(publicUrlData.publicUrl);
      setFile(null);
      showSuccess('Upload concluído!');

    } catch (error) {
      console.error('Erro no upload:', error);
      showError('Falha no upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentImageUrl) return;

    // Logic to remove the file from storage (optional, but good practice)
    // This requires parsing the path from the URL, which can be complex.
    // For simplicity, we will just clear the URL in the database.
    
    onUploadSuccess(null as unknown as string); // Pass null to clear the URL in the parent component
    showSuccess('Imagem removida.');
  };

  return (
    <div className="space-y-4">
      {currentImageUrl ? (
        <div className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300">
          <img src={currentImageUrl} alt="Current" className="w-full h-full object-cover" />
          <Button 
            variant="destructive" 
            size="icon" 
            className="absolute top-2 right-2 h-8 w-8 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="w-full h-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500">
          <ImageIcon className="w-8 h-8 mb-2" />
          <p className="text-sm">Nenhuma imagem selecionada</p>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-highlight/10 file:text-highlight hover:file:bg-highlight/20"
      />

      <Button 
        onClick={handleUpload} 
        disabled={isUploading || !file}
        className="w-full bg-primary hover:bg-primary/90 rounded-xl"
      >
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
        {isUploading ? 'Enviando...' : 'Fazer Upload'}
      </Button>
    </div>
  );
};

export default ImageUpload;