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
          <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
        )}
        <div>
          <h3 className="text-lg font-semibold text-[#022D68]">{item.name}</h3>
          {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
          <div className="flex items-center text-primary font-medium mt-1">
            <DollarSign className="w-4 h-4 mr-1 text-highlight opacity-0" /> {/* Alterado aqui */}
            <span className="font-bold text-highlight">{formatPrice(item.price)}</span>
          </div>
        </div>
      </div>
      {isOwner && (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
            <Edit className="h-4 w-4 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(item)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MenuItemListItem;