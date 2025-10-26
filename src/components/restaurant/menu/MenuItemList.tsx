import React from 'react';
import { MenuItem } from '@/types';
import { MenuItemListItem } from './MenuItemListItem';

interface MenuItemListProps {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
}

export const MenuItemList: React.FC<MenuItemListProps> = ({ items, onEdit, onDelete }) => {
  if (items.length === 0) {
    return <p className="text-center text-gray-500 mt-8">Nenhum item de menu encontrado nesta categoria.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <MenuItemListItem
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};