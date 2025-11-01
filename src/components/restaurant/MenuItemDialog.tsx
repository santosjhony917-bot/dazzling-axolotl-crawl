import React from 'react';
import { MenuItem, MenuCategory } from '@/types/supabase';
import ItemFormDialog, { MenuItemFormValues } from './menu/ItemFormDialog';

interface MenuItemDialogProps {
  category: MenuCategory;
  item?: MenuItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: MenuItemFormValues) => Promise<void>;
  // REMOVIDO: isLoading: boolean; // Esta prop não é necessária aqui, ItemFormDialog gerencia seu próprio estado de salvamento
}

const MenuItemDialog: React.FC<MenuItemDialogProps> = ({ category, item, isOpen, onOpenChange, onSave }) => { // Removido isLoading dos props
  return (
    <ItemFormDialog
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      category={category}
      itemToEdit={item || null}
      onSave={onSave}
      // REMOVIDO: isLoading={isLoading} // Não é mais passado para ItemFormDialog
    />
  );
};

export default MenuItemDialog;