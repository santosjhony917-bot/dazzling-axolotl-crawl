"use client";

import React from 'react';
import { MenuCategory } from '@/types/restaurant';
import CategoryFormDialog, { CategoryFormValues } from './menu/CategoryFormDialog'; // Importando o componente real

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: MenuCategory | null;
  restaurantId: string;
  onSave: (data: CategoryFormValues) => Promise<void>;
  isLoading: boolean;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({ isOpen, onClose, category, restaurantId, onSave, isLoading }) => {
  return (
    <CategoryFormDialog
      isOpen={isOpen}
      onClose={onClose}
      restaurantId={restaurantId}
      initialData={category}
      onSave={onSave}
      isLoading={isLoading}
    />
  );
};

export default CategoryDialog;