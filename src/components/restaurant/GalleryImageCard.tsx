"use client";

import React, { useState } from 'react';
import { Trash2, Loader2, Edit, Save, GripVertical } from 'lucide-react';
import { GalleryImage } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DraggableProvided } from '@hello-pangea/dnd'; // Importando DraggableProvided

interface GalleryImageCardProps {
  image: GalleryImage;
  onUpdateCaption: (imageId: string, caption: string) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  provided: DraggableProvided;
}

const GalleryImageCard: React.FC<GalleryImageCardProps> = ({
  image,
  onUpdateCaption,
  onDelete,
  isUpdating,
  isDeleting,
  provided,
}) => {
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [caption, setCaption] = useState(image.caption || '');

  const handleSaveCaption = async () => {
    await onUpdateCaption(image.id, caption);
    setIsEditingCaption(false);
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className="relative bg-white rounded-lg shadow-md overflow-hidden group"
    >
      <img src={image.image_url} alt={image.caption || 'Imagem da galeria'} className="w-full h-48 object-cover" />
      <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-between p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex justify-between items-center">
          <div {...provided.dragHandleProps} className="cursor-grab text-white hover:text-gray-200">
            <GripVertical className="h-6 w-6" />
          </div>
          <div className="flex space-x-1">
            {isEditingCaption ? (
              <Button variant="ghost" size="icon" onClick={handleSaveCaption} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Save className="h-5 w-5 text-white" />}
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setIsEditingCaption(true)}>
                <Edit className="h-5 w-5 text-white" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onDelete(image.id)} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-5 w-5 animate-spin text-red-500" /> : <Trash2 className="h-5 w-5 text-red-500" />}
            </Button>
          </div>
        </div>
        <div className="mt-auto">
          {isEditingCaption ? (
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-white bg-opacity-80 text-gray-900 text-sm p-1 rounded"
              placeholder="Adicionar legenda"
              onClick={(e) => e.stopPropagation()} // Prevent closing dialog when clicking input
            />
          ) : (
            image.caption && <p className="text-white text-sm">{image.caption}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryImageCard;