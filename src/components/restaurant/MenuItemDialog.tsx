"use client";

import React from 'react';
import { MenuItem } from '@/types/restaurant';
import MenuItemFormDialog, { MenuItemFormValues } from './menu/MenuItemFormDialog'; // Importando o componente real

interface MenuItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  categoryId: string; // categoryId é obrigatório aqui
  onSave: (data: MenuItemFormValues) => Promise<void>;
  isLoading: boolean;
}

const MenuItemDialog: React.FC<MenuItemDialogProps> = ({ isOpen, onClose, item, categoryId, onSave, isLoading }) => {
  return (
    <MenuItemFormDialog
      isOpen={isOpen}
      onClose={onClose}
      categoryId={categoryId}
      initialData={item}
      onSave={onSave}
      isLoading={isLoading}
    />
  );
};

export default MenuItemDialog;