import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { GalleryImage } from '@/types/supabase';
import { cn } from '@/lib/utils';

interface GalleryImageCardProps {
  image: GalleryImage;
  onDelete: (imageId: string) => void;
  isDeleting: boolean;
}

const GalleryImageCard: React.FC<GalleryImageCardProps> = ({ image, onDelete, isDeleting }) => {
  return (
    <Card className="relative overflow-hidden rounded-xl shadow-md border-none group">
      <div className="aspect-square w-full bg-gray-100">
        <img 
          src={image.image_url} 
          alt={image.caption || 'Foto da Galeria'} 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <p className="text-white text-sm font-semibold truncate">{image.caption || 'Sem legenda'}</p>
      </div>
      
      <Button
        variant="destructive"
        size="icon"
        onClick={() => onDelete(image.id)}
        disabled={isDeleting}
        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-red-600/80 hover:bg-red-700/90 transition-all"
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    </Card>
  );
};

export default GalleryImageCard;