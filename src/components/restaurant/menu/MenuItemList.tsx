import React from 'react';
import { MenuItem } from '@/types/supabase';
import MenuItemListItem from './MenuItemListItem';
import { Utensils } from 'lucide-react';

interface MenuItemListProps {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
}

export const MenuItemList: React.FC<MenuItemListProps> = ({ items, onEdit, onDelete }) => {
  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-8 p-6 bg-white rounded-xl shadow-soft-md">
        <Utensils className="w-8 h-8 mx-auto mb-3 text-gray-400" />
        <p>Nenhum item de menu encontrado nesta categoria.</p>
      </div>
    );
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