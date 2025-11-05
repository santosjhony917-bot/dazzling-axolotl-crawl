import React from 'react';
import { MenuCategory } from '@/types/supabase';
import CategoryFormDialog, { CategoryFormValues } from './menu/CategoryFormDialog'; // Importando o componente real

interface CategoryDialogProps {
  restaurantId: string;
  category?: MenuCategory;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CategoryFormValues) => Promise<void>;
  isLoading: boolean;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({ restaurantId, category, isOpen, onOpenChange, onSave, isLoading }) => {
  return (
    <CategoryFormDialog
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      restaurantId={restaurantId}
      initialData={category || null}
      onSave={onSave}
      isLoading={isLoading}
    />
  );
};

export default CategoryDialog;