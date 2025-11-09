"use client";

import React from 'react';
import { DollarSign, Edit, Trash2 } from 'lucide-react';
import { MenuItem } from '@/types/supabase';
import { formatPrice } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MenuItemListItemProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  isOwner: boolean;
}

const MenuItemListItem: React.FC<MenuItemListItemProps> = ({ item, onEdit, onDelete, isOwner }) => {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 border-b last:border-b-0",
      !item.is_active && "opacity-50"
    )}>
      <div className="flex items-center space-x-4">
        {item.image_url && (
          <img src={item.image_url} alt={item.name} className="w-28 h-28 object-cover rounded-md flex-shrink-0" />
        )}
        <div className="flex-grow">
          <h3 className="text-xl font-semibold text-text-primary">{item.name}</h3>
          {item.description && <p className="text-sm text-text-secondary mt-1 line-clamp-2">{item.description}</p>}
          <div className="flex items-center text-primary font-medium mt-2">
            <span className="font-bold text-highlight text-xl">{formatPrice(item.price)}</span>
          </div>
        </div>
      </div>
      {isOwner && (
        <div className="flex flex-col space-y-2 ml-4">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="hover:bg-gray-100">
            <Edit className="h-5 w-5 text-gray-600" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="hover:bg-red-50">
            <Trash2 className="h-5 w-5 text-red-600" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MenuItemListItem;