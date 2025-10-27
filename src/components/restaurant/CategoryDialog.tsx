import React from 'react';
import { MenuCategory } from '@/types/supabase';
import CategoryFormDialog, { CategoryFormValues } from './menu/CategoryFormDialog'; // Importando o componente real

interface CategoryDialogProps {
  restaurantId: string;
  category?: MenuCategory;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({ restaurantId, category, isOpen, onOpenChange }) => {
  // ... (restante do arquivo)