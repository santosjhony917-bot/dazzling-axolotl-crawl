"use client";

import React from 'react';
import { MenuItem } from '@/types/supabase';
import MenuItemListItem from './MenuItemListItem'; // Corrigido para importação padrão
import { Utensils } from 'lucide-react';

interface MenuItemListProps {
  items: MenuItem[];
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (item: MenuItem) => void;
  isOwner: boolean;
}

const MenuItemList: React.FC<MenuItemListProps> = ({ items, onEditItem, onDeleteItem, isOwner }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <Utensils className="h-12 w-12 mb-4" />
        <p className="text-lg">Nenhum item de menu encontrado nesta categoria.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {items.map((item) => (
        <MenuItemListItem
          key={item.id}
          item={item}
          onEdit={onEditItem}
          onDelete={onDeleteItem}
          isOwner={isOwner}
        />
      ))}
    </div>
  );
};

export default MenuItemList;