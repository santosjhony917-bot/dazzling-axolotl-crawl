import React from 'react';
import { MenuItem, MenuCategory } from '@/types/supabase';
import ItemFormDialog, { MenuItemFormValues } from './menu/ItemFormDialog';

interface MenuItemDialogProps {
  category: MenuCategory;
  item?: MenuItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: MenuItemFormValues) => Promise<void>;
  isLoading: boolean;
}

const MenuItemDialog: React.FC<MenuItemDialogProps> = ({ category, item, isOpen, onOpenChange, onSave, isLoading }) => {
  return (
    <ItemFormDialog
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      category={category}
      itemToEdit={item || null}
      onSave={onSave}
      isLoading={isLoading}
    />
  );
};

export default MenuItemDialog;