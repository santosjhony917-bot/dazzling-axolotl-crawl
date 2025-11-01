import React, { useState } from 'react';
import { Trash2, Loader2, Edit, Save, GripVertical } from 'lucide-react';
import { GalleryImage } from '@/types/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GalleryImageCardProps {
  image: GalleryImage;
  onDelete: (imageId: string) => Promise<void>;
  onUpdateCaption: (imageId: string, newCaption: string) => Promise<void>;
  isDeleting: boolean;
  isUpdating: boolean;
  // Adicionado props para DND
  attributes: any;
  listeners: any;
  setNodeRef: (element: HTMLElement | null) => void;
  style: React.CSSProperties;
}

const GalleryImageCard: React.FC<GalleryImageCardProps> = ({ 
  image, 
  onDelete, 
  onUpdateCaption, 
  isDeleting, 
  isUpdating,
  attributes,
  listeners,
  setNodeRef,
  style,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(image.caption || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateCaption(image.id, caption);
      setIsEditing(false);
    } catch (e) {
      // Error handled in parent hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja deletar esta imagem?")) {
      await onDelete(image.id);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative rounded-xl overflow-hidden shadow-soft-md group bg-white"
    >
      <img
        src={image.image_url}
        alt={image.caption || 'Imagem da galeria'}
        className="w-full h-48 object-cover"
      />
      
      {/* Handle de Arrastar */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 left-2 cursor-grab p-1 bg-white/80 rounded-full shadow-md hover:bg-white transition-colors z-10"
      >
        <GripVertical className="h-5 w-5 text-gray-600" />
      </div>
      
      <div className="absolute inset-0 bg-black/30 flex items-end p-3">
        <div className="flex-1">
          {isEditing ? (
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="Adicionar legenda..."
              className="h-8 text-sm bg-white/90 border-none"
              disabled={isSaving || isUpdating}
            />
          ) : (
            <p className="text-white text-sm font-semibold truncate">{image.caption || 'Sem legenda'}</p>
          )}
        </div>
        
        <div className="flex space-x-2 ml-2">
          {isEditing ? (
            <Button 
              size="icon" 
              className="h-8 w-8 bg-green-500 hover:bg-green-600" 
              onClick={handleSave}
              disabled={isSaving || isUpdating}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          ) : (
            <Button 
              size="icon" 
              className="h-8 w-8 bg-blue-500 hover:bg-blue-600" 
              onClick={() => setIsEditing(true)}
              disabled={isUpdating}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button 
            size="icon" 
            className="h-8 w-8 bg-red-600 hover:bg-red-700" 
            onClick={handleDelete}
            disabled={isDeleting || isUpdating}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GalleryImageCard;