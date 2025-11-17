"use client";

import React from 'react';
import { MenuCategory } from '@/types/supabase';
import CategoryListItem from './CategoryListItem';
import { useCategoryMutations } from '@/hooks/useCategoryManagement'; // Usando useCategoryMutations para obter o estado de mutação
import { Loader2 } from 'lucide-react';

interface CategoryListProps {
  categories: MenuCategory[];
  restaurantId: string;
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string) => void;
  disableNavigation?: boolean;
  onView?: (category: MenuCategory) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  restaurantId,
  onEdit,
  onDelete,
  disableNavigation,
  onView,
}) => {
  // Usamos useCategoryMutations apenas para obter o estado de mutação global
  const { deleteCategoryMutation, createCategoryMutation, updateCategoryMutation } = useCategoryMutations(restaurantId);
  
  // O estado de mutação agora reflete qualquer operação CRUD em andamento
  const isMutating = deleteCategoryMutation.isPending || createCategoryMutation.isPending || updateCategoryMutation.isPending;

  if (categories.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50 text-gray-600">
        Nenhuma categoria de menu encontrada. Clique em "Adicionar" para começar.
      </div>
    );
  }

  // Funções de mover vazias (mantidas para satisfazer a interface do CategoryListItem)
  const handleMoveUp = () => {};
  const handleMoveDown = () => {};

  return (
    <div className="space-y-3">
      {categories.map((category, index) => (
        <CategoryListItem
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          isFirst={index === 0}
          isLast={index === categories.length - 1}
          isMutating={isMutating}
          disableNavigation={disableNavigation}
          onView={onView}
        />
      ))}
      {isMutating && (
        <div className="flex items-center justify-center p-4 text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Atualizando...
        </div>
      )}
    </div>
  );
};

export default CategoryList;