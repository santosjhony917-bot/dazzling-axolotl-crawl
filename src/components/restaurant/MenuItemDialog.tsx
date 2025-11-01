"use client";

import React from 'react';
import { MenuItem, MenuCategory } from '@/types/supabase'; // Importando tipos corretos
import ItemFormDialog, { MenuItemFormValues } from './menu/ItemFormDialog';

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: MenuItem;
  onSave: (values: MenuItemFormValues) => void;
  isSaving: boolean;
  categories: MenuCategory[];
}

const MenuItemDialog: React.FC<MenuItemDialogProps> = ({ open, onOpenChange, item, onSave, isSaving, categories }) => {
  return (
    <ItemFormDialog
      open={open}
      onOpenChange={onOpenChange}
      initialData={item}
      onSave={onSave}
      isSaving={isSaving}
      categories={categories}
    />
  );
};

export default MenuItemDialog;