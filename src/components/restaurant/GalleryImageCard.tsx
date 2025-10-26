import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, Edit, Save } from 'lucide-react';
import { GalleryImage } from '@/types/supabase';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface GalleryImageCardProps {
  image: GalleryImage;
  onDelete: (imageId: string) => void;
  onUpdateCaption: (imageId: string, caption: string) => void;
  isDeleting: boolean;
  isUpdating: boolean;
}

const GalleryImageCard: React.FC<GalleryImageCardProps> = ({ image, onDelete, onUpdateCaption, isDeleting, isUpdating }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(image.caption || '');
  const isSaving = isUpdating && isEditing;

  const handleSave = () => {
    if (caption !== image.caption) {
      onUpdateCaption(image.id, caption);
    }
    setIsEditing(false);
  };

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
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Adicionar legenda"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              disabled={isSaving}
              className="h-9"
            />
            <Button 
              size="icon" 
              onClick={handleSave} 
              disabled={isSaving}
              className="h-9 w-9 bg-highlight hover:bg-highlight/90"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate flex-1">
              {image.caption || 'Sem legenda'}
            </p>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 text-primary hover:bg-gray-100"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <Button
          variant="destructive"
          size="sm"
          className="w-full bg-red-600 hover:bg-red-700"
          onClick={() => onDelete(image.id)}
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
          Remover
        </Button>
      </div>
    </Card>
  );
};

export default GalleryImageCard;