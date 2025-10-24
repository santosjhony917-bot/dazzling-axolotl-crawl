import React from 'react';
import { MenuItem } from '@/types/menu';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onEdit, onDelete }) => {
  return (
    <Card className="flex items-center justify-between p-3 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0 flex items-center gap-4 w-full">
        {item.image_url && (
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</h4>
          {item.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
          )}
          <p className="text-base font-bold text-highlight mt-1">R$ {item.price.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8 text-blue-500 hover:bg-blue-50">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItemCard;