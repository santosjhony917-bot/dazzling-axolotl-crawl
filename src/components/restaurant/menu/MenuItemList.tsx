"use client";

import React, { useState } from 'react';
import { GripVertical, Edit, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/ItemFormDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  order_index: number;
  category_id: string;
}

interface MenuItemListProps {
  items: MenuItem[];
  onUpdateItem: (id: string, updates: Partial<MenuItemFormValues>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

interface SortableMenuItemProps {
  item: MenuItem;
  onUpdateItem: (id: string, updates: Partial<MenuItemFormValues>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

const SortableMenuItem: React.FC<SortableMenuItemProps> = ({ item, onUpdateItem, onDeleteItem }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);

  const handleToggleActive = async () => {
    setIsUpdatingStatus(true);
    await onUpdateItem(item.id, { is_active: !item.is_active });
    setIsUpdatingStatus(false);
  };

  const handleEditSubmit = async (values: MenuItemFormValues) => {
    await onUpdateItem(item.id, values);
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
      {item.image_url && (
        <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-md mr-4" />
      )}
      <div className="flex-grow">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{item.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">R$ {item.price.toFixed(2)}</p>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleActive}
          disabled={isUpdatingStatus}
          title={item.is_active ? "Desativar item" : "Ativar item"}
        >
          {isUpdatingStatus ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : item.is_active ? (
            <Eye className="h-5 w-5 text-green-500" />
          ) : (
            <EyeOff className="h-5 w-5 text-red-500" />
          )}
        </Button>
        <ItemFormDialog
          initialData={item}
          onSubmit={handleEditSubmit}
          isSubmitting={isEditingItem}
          setIsSubmitting={setIsEditingItem}
        >
          <Button variant="ghost" size="icon" title="Editar item">
            <Edit className="h-5 w-5 text-blue-500" />
          </Button>
        </ItemFormDialog>
        <ConfirmationDialog
          title="Deletar Item"
          description={`Tem certeza que deseja deletar o item "${item.name}"? Esta ação é irreversível.`}
          onConfirm={() => onDeleteItem(item.id)}
          confirmButtonText="Deletar"
          confirmButtonVariant="destructive"
        >
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" title="Deletar item">
            <Trash2 className="h-5 w-5" />
          </Button>
        </ConfirmationDialog>
      </div>
    </div>
  );
};

const MenuItemList: React.FC<MenuItemListProps> = ({ items, onUpdateItem, onDeleteItem }) => {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <SortableMenuItem
          key={item.id}
          item={item}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
        />
      ))}
    </div>
  );
};

export default MenuItemList;