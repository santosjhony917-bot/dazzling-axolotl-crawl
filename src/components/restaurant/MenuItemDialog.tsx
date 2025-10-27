import React from 'react';
import { MenuItem } from '@/types/supabase';
import MenuItemFormDialog, { MenuItemFormValues } from './menu/MenuItemFormDialog'; // Importando o componente real

interface MenuItemDialogProps {
  categoryId: string;
  item?: MenuItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const MenuItemDialog: React.FC<MenuItemDialogProps> = ({ categoryId, item, isOpen, onOpenChange }) => {
  // ... (restante do arquivo)