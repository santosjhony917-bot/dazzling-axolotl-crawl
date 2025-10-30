import React from 'react';
import { MenuItem } from '@/types/supabase';
import ItemFormDialog, { MenuItemFormValues } from './menu/ItemFormDialog'; // Importando o componente real

interface MenuItemDialogProps {
  categoryId: string;
  item?: MenuItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: MenuItemFormValues) => Promise<void>;
  isLoading: boolean;
}

const MenuItemDialog: React.FC<MenuItemDialogProps> = ({ categoryId, item, isOpen, onOpenChange, onSave, isLoading }) => {
  return (
    <ItemFormDialog
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      categoryId={categoryId}
      initialData={item || null}
      onSave={onSave}
      isLoading={isLoading}
    />
  );
};

export default MenuItemDialog;