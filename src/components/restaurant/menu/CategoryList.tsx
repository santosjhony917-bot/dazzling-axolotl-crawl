import React from 'react';
import { MenuCategory } from '@/types';
import { CategoryListItem } from './CategoryListItem';
import { useCategoryReorder } from '@/hooks/useCategoryReorder';
import { toast } from 'sonner';

interface CategoryListProps {
  categories: MenuCategory[];
  restaurantId: string;
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string) => void;
}

export function CategoryList({ categories, restaurantId, onEdit, onDelete }: CategoryListProps) {
  const { mutate: swapOrder, isPending: isSwapping } = useCategoryReorder(restaurantId);

  // Sort categories by order_index before rendering
  const sortedCategories = [...categories].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  // Corrigido: A função handleSwap agora aceita a categoria atual e a direção
  const handleSwap = (currentCategory: MenuCategory, direction: 'UP' | 'DOWN') => {
    const currentIndex = sortedCategories.findIndex(c => c.id === currentCategory.id);
    
    if (currentIndex === -1) return;

    let targetIndex: number;
    if (direction === 'UP') {
      targetIndex = currentIndex - 1;
    } else {
      targetIndex = currentIndex + 1;
    }

    if (targetIndex < 0 || targetIndex >= sortedCategories.length) {
      return; 
    }

    const targetCategory = sortedCategories[targetIndex];

    if (!targetCategory) {
      toast.error("Categoria alvo não encontrada.");
      return;
    }

    // Call the mutation to swap the order indices in the database
    swapOrder({
      category_id_a: currentCategory.id,
      category_id_b: targetCategory.id,
    });
  };

  if (sortedCategories.length === 0) {
    return <p className="text-center text-gray-500 p-4">Nenhuma categoria cadastrada.</p>;
  }

  return (
    <div className="border rounded-lg divide-y">
      {sortedCategories.map((category, index) => (
        <CategoryListItem
          key={category.id}
          category={category}
          restaurantId={restaurantId}
          isFirst={index === 0}
          isLast={index === sortedCategories.length - 1}
          onEdit={onEdit}
          onDelete={onDelete}
          // Corrigido: Passando a função handleSwap que corresponde à nova tipagem
          onSwap={handleSwap} 
        />
      ))}
      {isSwapping && (
        <div className="p-3 text-center text-sm text-blue-500">
          Reordenando...
        </div>
      )}
    </div>
  );
}