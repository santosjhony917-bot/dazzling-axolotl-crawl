"use client";

import React from 'react';
import { MenuCategory } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { DraggableProvided } from '@hello-pangea/dnd'; // Importando DraggableProvided
import { cn } from '@/lib/utils';

interface CategoryListItemProps {
  category: MenuCategory;
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string) => void;
  onToggleActive: (categoryId: string, isActive: boolean) => void;
  provided: DraggableProvided;
}

const CategoryListItem: React.FC<CategoryListItemProps> = ({ category, onEdit, onDelete, onToggleActive, provided }) => {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={cn(
        "flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border",
        !category.is_active && "opacity-60 bg-gray-50"
      )}
    >
      <div className="flex items-center flex-grow">
        <div {...provided.dragHandleProps} className="mr-3 cursor-grab text-gray-400 hover:text-gray-600">
          <GripVertical className="h-5 w-5" />
        </div>
        <span className="font-medium text-lg text-[#022D68]">{category.name}</span>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleActive(category.id, !category.is_active)}
          title={category.is_active ? "Desativar Categoria" : "Ativar Categoria"}
        >
          {category.is_active ? <Eye className="h-5 w-5 text-green-600" /> : <EyeOff className="h-5 w-5 text-red-600" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onEdit(category)} title="Editar Categoria">
          <Edit className="h-5 w-5 text-blue-600" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(category.id)} title="Excluir Categoria">
          <Trash2 className="h-5 w-5 text-red-600" />
        </Button>
      </div>
    </div>
  );
};

export default CategoryListItem;