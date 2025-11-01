"use client";

import React from 'react';
import { MenuCategory } from '@/types/supabase';
import CategoryListItem from './CategoryListItem';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'; // Importando do @hello-pangea/dnd

interface CategoryListProps {
  categories: MenuCategory[];
  onEditCategory: (category: MenuCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
  onToggleCategoryActive: (categoryId: string, isActive: boolean) => void;
  onReorderCategories: (newOrder: MenuCategory[]) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onEditCategory,
  onDeleteCategory,
  onToggleCategoryActive,
  onReorderCategories,
}) => {
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const reorderedCategories = Array.from(categories);
    const [removed] = reorderedCategories.splice(result.source.index, 1);
    reorderedCategories.splice(result.destination.index, 0, removed);

    onReorderCategories(reorderedCategories);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="categories">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
            {categories.map((category, index) => (
              <Draggable key={category.id} draggableId={category.id} index={index}>
                {(provided) => (
                  <CategoryListItem
                    category={category}
                    onEdit={onEditCategory}
                    onDelete={onDeleteCategory}
                    onToggleActive={onToggleCategoryActive}
                    provided={provided}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default CategoryList;