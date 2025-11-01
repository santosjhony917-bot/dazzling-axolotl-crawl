"use client";

import React from 'react';
import { MenuCategory } from '@/types/supabase';
import CategoryFormDialog, { CategoryFormValues } from './menu/CategoryFormDialog'; // Importando o componente real

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: MenuCategory;
  onSave: (values: CategoryFormValues) => Promise<void>; // onSave agora retorna Promise<void>
  isSaving: boolean;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({ open, onOpenChange, category, onSave, isSaving }) => {
  return (
    <CategoryFormDialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      initialData={category || null}
      onSave={onSave}
      isLoading={isSaving}
      restaurantId={category?.restaurant_id || ''}
    />
  );
};

export default CategoryDialog;