import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Label } from '@/components/ui/label';

interface ImageUploadProps {
  label: string;
  currentUrl: string | null | undefined;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
  folder: string; // Ex: 'restaurants/uuid/logo'
  aspectRatio: number; // Ex: 1/1 or 16/9
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  currentUrl,
  onUploadComplete,
  onRemove,
  folder,
  aspectRatio,
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      const filePath = `${folder}/${fileName}`;

      // 1. Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from(RESTAURANT_IMAGES_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Permite sobrescrever se o caminho for o mesmo
        });

      if (uploadError) throw uploadError;

      // 2. Obter a URL pública
      const { data: publicUrlData } = supabase.storage
        .from(RESTAURANT_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Falha ao obter URL pública.');
      }

      // 3. Chamar o callback de sucesso (que atualiza o banco de dados)
      onUploadComplete(publicUrlData.publicUrl);
      
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showSuccess('Imagem enviada com sucesso!');

    } catch (error) {
      console.error('Erro durante o upload:', error);
      showError('Falha no upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">{label}</Label>
      
      <AspectRatio ratio={aspectRatio} className="bg-gray-100 rounded-xl overflow-hidden relative border border-gray-200">
        {currentUrl ? (
          <>
            <img src={currentUrl} alt="Imagem Atual" className="object-cover w-full h-full" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onRemove}
              className="absolute top-2 right-2 rounded-full h-8 w-8 z-10"
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
            <ImageIcon className="h-8 w-8 mb-2" />
            <p>Nenhuma imagem definida.</p>
          </div>
        )}
      </AspectRatio>

      <div className="flex gap-2">
        <Input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="flex-1 rounded-xl"
          disabled={isUploading}
          ref={fileInputRef}
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