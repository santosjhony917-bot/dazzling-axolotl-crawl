"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MenuCategory } from '@/types/restaurant';

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: MenuCategory | null;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({ isOpen, onClose, category }) => {
  const title = category ? "Editar Categoria" : "Adicionar Nova Categoria";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {/* TODO: Implement form logic for category creation/editing */}
          <p className="text-sm text-gray-500">Formulário de Categoria (Em desenvolvimento)</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;