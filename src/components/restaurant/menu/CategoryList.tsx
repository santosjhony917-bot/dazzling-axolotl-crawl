import React from 'react';
import { MenuCategory } from '@/types/menu';
import { CategoryListItem } from './CategoryListItem';
import { useCategoryMutations } from '@/hooks/useCategoryManagement';
import { useCategoryReorder } from '@/hooks/useCategoryReorder'; // Importando o hook de reordenação

interface CategoryListProps {
  categories: MenuCategory[];
  restaurantId: string;
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, restaurantId, onEdit, onDelete }) => {
  const swapCategoryOrderMutation = useCategoryReorder(restaurantId); // Corrigido para atribuir o resultado diretamente

  const handleSwap = (category_id_a: string, category_id_b: string) => {
    swapCategoryOrderMutation.mutate({ category_id_a, category_id_b });
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const categoryA = categories[index];
      const categoryB = categories[index - 1];
      handleSwap(categoryA.id, categoryB.id);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < categories.length - 1) {
      const categoryA = categories[index];
      const categoryB = categories[index + 1];
      handleSwap(categoryA.id, categoryB.id);
    }
  };

  if (categories.length === 0) {
    return <p className="text-center text-gray-500 mt-8">Nenhuma categoria encontrada. Crie sua primeira categoria!</p>;
  }

  return (
    <div className="space-y-4">
      {categories.map((category, index) => (
        <CategoryListItem
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
          isFirst={index === 0}
          isLast={index === categories.length - 1}
          isSwapping={swapCategoryOrderMutation.isPending}
        />
      ))}
    </div>
  );
};

export default CategoryList;