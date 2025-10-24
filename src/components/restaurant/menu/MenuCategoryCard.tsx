import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MenuCategory } from '@/types';
import { ChevronRight, Utensils, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuCategoryCardProps {
  category: MenuCategory & { items: any[] };
  restaurantId: string;
  onEdit: () => void;
}

const MenuCategoryCard: React.FC<MenuCategoryCardProps> = ({ category, onEdit }) => {
  return (
    <Card 
      className={cn(
        "shadow-md border-none rounded-xl cursor-pointer transition-all hover:shadow-lg",
        !category.is_active && "opacity-60 bg-gray-50"
      )}
      onClick={onEdit}
    >
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-highlight/10 rounded-full">
            <Utensils className="w-5 h-5 text-highlight" />
          </div>
          <CardTitle className="text-lg font-bold text-[#022D68] truncate">
            {category.name}
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          {category.is_active ? (
            <Eye className="w-4 h-4 text-green-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-red-500" />
          )}
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm text-gray-500">
        <p>{category.items.length} {category.items.length === 1 ? 'item' : 'itens'} no menu.</p>
      </CardContent>
    </Card>
  );
};

export default MenuCategoryCard;