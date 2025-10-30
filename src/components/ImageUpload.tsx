import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface ImageUploadProps {
  bucket: string;
  currentImageUrl: string | null | undefined;
  onUploadSuccess: (url: string) => Promise<void>;
  folderPath: string; // Ex: 'restaurants/uuid/profile'
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  bucket,
  currentImageUrl,
  onUploadSuccess,
  folderPath,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

      // 1. Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Obter a URL pública
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Falha ao obter URL pública.');
      }

      // 3. Chamar o callback de sucesso (que atualiza o banco de dados)
      await onUploadSuccess(publicUrlData.publicUrl);
      
      setFile(null);
      showSuccess('Imagem enviada com sucesso!');

    } catch (error) {
      console.error('Erro durante o upload:', error);
      showError('Falha no upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentImageUrl) return;

    // 1. Atualizar o banco de dados para remover a URL
    await onUploadSuccess(null as any); // Passa null para limpar o campo no DB

    // 2. Tenta remover o arquivo do storage (opcional, mas boa prática)
    // Nota: Remover do storage requer o caminho exato do arquivo, que é complexo de extrair da URL pública.
    // Por simplicidade, focamos em limpar o link no DB.

    showSuccess('Imagem removida com sucesso!');
  };

  return (
    <div className="space-y-4">
      {currentImageUrl ? (
        <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
          <img src={currentImageUrl} alt="Imagem Atual" className="object-cover w-full h-full" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleRemove}
            className="absolute top-2 right-2 rounded-full h-8 w-8"
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500">
          <ImageIcon className="h-8 w-8 mb-2" />
          <p>Nenhuma imagem selecionada.</p>
        </div>
      )}

      <div className="flex gap-2">
        <Input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="flex-1 rounded-xl"
          disabled={isUploading}
        />
        <Button 
          onClick={handleUpload} 
          disabled={isUploading || !file} 
          className="bg-primary hover:bg-primary/90 rounded-xl"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
      </div>
      {file && <p className="text-sm text-gray-600">Arquivo pronto para upload: {file.name}</p>}
    </div>
  );
};

export default ImageUpload;