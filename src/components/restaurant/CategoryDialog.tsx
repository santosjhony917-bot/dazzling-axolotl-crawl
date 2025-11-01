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
      open={open}
      onOpenChange={onOpenChange}
      initialData={category ? { name: category.name, is_active: category.is_active || false } : undefined}
      onSave={onSave}
      isSaving={isSaving}
    />
  );
};

export default CategoryDialog;