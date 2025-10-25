import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, Edit, Check } from 'lucide-react';
import { GalleryImage } from '@/types/supabase';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';

interface GalleryImageManagerProps {
  image: GalleryImage;
  onDelete: (imageId: string) => Promise<void>;
  onUpdateCaption: (imageId: string, caption: string) => Promise<void>;
  isMutating: boolean;
}

const GalleryImageManager: React.FC<GalleryImageManagerProps> = ({ image, onDelete, onUpdateCaption, isMutating }) => {
  const [caption, setCaption] = useState(image.caption || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (window.confirm("Tem certeza que deseja deletar esta imagem?")) {
      setIsDeleting(true);
      try {
        await onDelete(image.id);
      } catch (e) {
        // Erro já tratado no hook, mas garantimos o estado
        setIsDeleting(false);
      }
    }
  }, [image.id, onDelete]);

  const handleSaveCaption = useCallback(async () => {
    if (caption === image.caption) {
      setIsEditing(false);
      return;
    }
    
    try {
      await onUpdateCaption(image.id, caption);
      setIsEditing(false);
    } catch (e) {
      // Erro já tratado no hook
    }
  }, [image.id, caption, image.caption, onUpdateCaption]);

  return (
    <Card className="relative overflow-hidden rounded-xl shadow-md border-none group">
      <div className="aspect-square w-full bg-gray-100">
        <img 
          src={image.image_url} 
          alt={image.caption || 'Foto da Galeria'} 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Adicionar legenda"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={() => {
                // Se não estiver salvando, volta para o modo de visualização
                if (!isMutating) setIsEditing(false);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur(); // Força o onBlur para salvar
                }
            }}
            disabled={isMutating}
            className="h-9 text-sm"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSaveCaption}
            disabled={isMutating || !isEditing || caption === image.caption}
            className="h-9 w-9 text-green-600 hover:bg-green-50"
          >
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
        </div>
        
        <Button
          variant="destructive"
          size="sm"
          className="w-full bg-red-600 hover:bg-red-700"
          onClick={handleDelete}
          disabled={isDeleting || isMutating}
        >
          {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
          Remover
        </Button>
      </div>
    </Card>
  );
};

export default GalleryImageManager;