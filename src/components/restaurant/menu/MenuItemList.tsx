"use client";

import React from 'react';
import { MenuItem } from '@/types/supabase';
import MenuItemListItem from './MenuItemListItem';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface MenuItemListProps {
  items: MenuItem[];
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: string) => void;
  onToggleItemActive: (itemId: string, isActive: boolean) => void;
  onReorderItems: (newOrder: MenuItem[]) => void;
}

const MenuItemList: React.FC<MenuItemListProps> = ({
  items,
  onEditItem,
  onDeleteItem,
  onToggleItemActive,
  onReorderItems,
}) => {
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    onReorderItems(reorderedItems);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="items">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(providedDraggable) => (
                  <MenuItemListItem
                    item={item}
                    onEdit={onEditItem}
                    onDelete={onDeleteItem}
                    onToggleActive={onToggleItemActive}
                    provided={providedDraggable}
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

export default MenuItemList;