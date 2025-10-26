"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MenuItem } from '@/types/restaurant';

interface MenuItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  categoryId: string | null;
}

const MenuItemDialog: React.FC<MenuItemDialogProps> = ({ isOpen, onClose, item, categoryId }) => {
  const title = item ? "Editar Item de Menu" : "Adicionar Novo Item";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {/* TODO: Implement form logic for menu item creation/editing */}
          <p className="text-sm text-gray-500">Formulário de Item de Menu (Em desenvolvimento)</p>
          {categoryId && <p className="text-xs text-gray-400">Categoria ID: {categoryId}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemDialog;