"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { MenuCategory, MenuItem } from '@/types/supabase'; // Importando tipos corretos
import { cn } from '@/lib/utils';
import { Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { DraggableProvided } from '@hello-pangea/dnd'; // Importando DraggableProvided
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface CategoryItemManagerProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
  onToggleActive: (itemId: string, isActive: boolean) => void;
  provided: DraggableProvided;
}

const CategoryItemManager: React.FC<CategoryItemManagerProps> = ({ item, onEdit, onDelete, onToggleActive, provided }) => {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={cn(
        "flex items-center bg-white p-4 rounded-lg shadow-sm border",
        !item.is_active && "opacity-60 bg-gray-50"
      )}
    >
      <div {...provided.dragHandleProps} className="mr-3 cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical className="h-5 w-5" />
      </div>
      <img
        src={item.image_url || PLACEHOLDER_IMAGE_URL}
        alt={item.name}
        className="w-16 h-16 object-cover rounded-md mr-4"
      />
      <div className="flex-grow">
        <h3 className="font-semibold text-lg text-[#022D68]">{item.name}</h3>
        <p className="text-sm text-gray-600">R$ {item.price.toFixed(2)}</p>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleActive(item.id, !item.is_active)}
          title={item.is_active ? "Desativar Item" : "Ativar Item"}
        >
          {item.is_active ? <Eye className="h-5 w-5 text-green-600" /> : <EyeOff className="h-5 w-5 text-red-600" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onEdit(item)} title="Editar Item">
          <Edit className="h-5 w-5 text-blue-600" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} title="Excluir Item">
          <Trash2 className="h-5 w-5 text-red-600" />
        </Button>
      </div>
    </div>
  );
};

export default CategoryItemManager;