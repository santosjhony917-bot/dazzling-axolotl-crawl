"use client";

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ConfirmationDialog from '@/components/ConfirmationDialog';

interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
}

interface SortableGalleryItemProps {
  item: GalleryItem;
  onUpdateCaption: (id: string, caption: string) => Promise<void>;
  onDeleteItem: (id: string, imageUrl: string) => Promise<void>;
}

const SortableGalleryItem: React.FC<SortableGalleryItemProps> = ({
  item,
  onUpdateCaption,
  onDeleteItem,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [caption, setCaption] = useState(item.caption || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCaption = async () => {
    setIsSaving(true);
    await onUpdateCaption(item.id, caption);
    setIsSaving(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden group"
    >
      <img src={item.image_url} alt={item.caption || 'Imagem da galeria'} className="w-full h-48 object-cover" />
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Legenda da imagem"
            className="flex-grow mr-2"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSaveCaption}
            disabled={isSaving || caption === (item.caption || '')}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            {...listeners}
            {...attributes}
            className="cursor-grab"
            title="Arrastar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <ConfirmationDialog
            title="Deletar Imagem"
            description="Tem certeza que deseja deletar esta imagem da galeria? Esta ação é irreversível."
            onConfirm={() => onDeleteItem(item.id, item.image_url)}
            confirmButtonText="Deletar"
            confirmButtonVariant="destructive"
          >
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </ConfirmationDialog>
        </div>
      </div>
    </div>
  );
};

export default SortableGalleryItem;