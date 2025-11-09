"use client";

import React, { useState } from 'react';
import { GripVertical, Edit, Trash2, PlusCircle, Loader2, Eye, EyeOff, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import ConfirmationDialog from '@/components/ConfirmationDialog';

interface Category {
  id: string;
  name: string;
  is_active: boolean;
  is_popular: boolean;
  order_index: number;
}

interface CategoryListProps {
  categories: Category[];
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  restaurantId: string;
}

interface SortableCategoryItemProps {
  category: Category;
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  restaurantId: string;
}

const SortableCategoryItem: React.FC<SortableCategoryItemProps> = ({
  category,
  onUpdateCategory,
  onDeleteCategory,
  restaurantId,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPopular, setIsUpdatingPopular] = useState(false);

  const handleToggleActive = async () => {
    setIsUpdatingStatus(true);
    await onUpdateCategory(category.id, { is_active: !category.is_active });
    setIsUpdatingStatus(false);
  };

  const handleTogglePopular = async () => {
    setIsUpdatingPopular(true);
    await onUpdateCategory(category.id, { is_popular: !category.is_popular });
    setIsUpdatingPopular(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-3 border border-gray-200 dark:border-gray-700"
    >
      <Button
        variant="ghost"
        size="icon"
        {...listeners}
        {...attributes}
        className="cursor-grab mr-2"
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-5 w-5 text-gray-500" />
      </Button>
      <span className="flex-grow text-lg font-medium text-gray-900 dark:text-white">
        {category.name}
      </span>
      <div className="flex items-center space-x-2">
        <Label htmlFor={`popular-switch-${category.id}`} className="sr-only">Popular</Label>
        <Switch
          id={`popular-switch-${category.id}`}
          checked={category.is_popular}
          onCheckedChange={handleTogglePopular}
          disabled={isUpdatingPopular}
          title={category.is_popular ? "Desmarcar como popular" : "Marcar como popular"}
        />
        <Star className={`h-5 w-5 ${category.is_popular ? 'text-yellow-500' : 'text-gray-400'}`} />

        <Label htmlFor={`active-switch-${category.id}`} className="sr-only">Ativo</Label>
        <Switch
          id={`active-switch-${category.id}`}
          checked={category.is_active}
          onCheckedChange={handleToggleActive}
          disabled={isUpdatingStatus}
          title={category.is_active ? "Desativar categoria" : "Ativar categoria"}
        />
        {category.is_active ? (
          <Eye className="h-5 w-5 text-green-500" />
        ) : (
          <EyeOff className="h-5 w-5 text-red-500" />
        )}

        <Link to={`/restaurant-area/menu/${category.id}`}>
          <Button variant="ghost" size="icon" title="Editar itens da categoria">
            <Edit className="h-5 w-5 text-blue-500" />
          </Button>
        </Link>
        <ConfirmationDialog
          title="Deletar Categoria"
          description={`Tem certeza que deseja deletar a categoria "${category.name}"? Todos os itens associados também serão removidos.`}
          onConfirm={() => onDeleteCategory(category.id)}
          confirmButtonText="Deletar"
          confirmButtonVariant="destructive"
        >
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" title="Deletar categoria">
            <Trash2 className="h-5 w-5" />
          </Button>
        </ConfirmationDialog>
      </div>
    </div>
  );
};

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onUpdateCategory,
  onDeleteCategory,
  restaurantId,
}) => {
  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <SortableCategoryItem
          key={category.id}
          category={category}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
          restaurantId={restaurantId}
        />
      ))}
    </div>
  );
};

export default CategoryList;